import { afterEach, beforeEach, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

const files = readdirSync("migrations")
  .filter((name) => name.endsWith(".sql"))
  .sort();
let db: DatabaseSync;
let start: number;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const file of files) db.exec(readFileSync(`migrations/${file}`, "utf8"));
  db.exec(
    "INSERT INTO businesses(id,slug,content) VALUES('mary','mary','{}'),('other','other','{}'); INSERT INTO dining_tables VALUES('1','mary','Mesa 1',4,0,'disponible'),('1','other','Mesa 1',4,0,'disponible');",
  );
  start = Date.now() + 3600000;
});
afterEach(() => db.close());
function reserve(
  id: string,
  from = start,
  to = start + 3600000,
  people = 4,
  status = "pendiente",
  business = "mary",
) {
  db.prepare(
    "INSERT INTO reservations(id,business_id,table_id,name,phone,start_at,end_at,people,status,created_at) VALUES(?,?,'1','Prueba','placeholder',?,?,?,?,?)",
  ).run(id, business, from, to, people, status, Date.now());
}
it("mantiene LF en todas las migraciones y elimina CASE dentro de triggers", () => {
  for (const file of files) {
    const sql = readFileSync(`migrations/${file}`, "utf8");
    expect(sql).not.toContain("\r");
    expect(sql).not.toMatch(/SELECT\s+CASE\s+WHEN/i);
  }
  expect(readFileSync(".gitattributes", "utf8")).toContain("*.sql text eol=lf");
});
it("construye los cinco triggers finales y account_id desde cero", () => {
  expect(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name",
      )
      .all()
      .map((row) => row.name),
  ).toEqual([
    "customer_email_guard",
    "reservation_insert_guard",
    "reservation_update_guard",
    "table_update_guard",
    "user_email_guard",
  ]);
  expect(
    db
      .prepare("PRAGMA table_info(reservations)")
      .all()
      .map((row) => row.name),
  ).toContain("account_id");
  expect(db.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe(
    "ok",
  );
});
it("mantiene límites de capacidad en INSERT y UPDATE y mesa fuera de servicio", () => {
  expect(() => reserve("too-many", start, start + 10000, 5)).toThrow(
    "table_capacity",
  );
  reserve("valid");
  expect(() =>
    db.exec("UPDATE reservations SET people=5 WHERE id='valid'"),
  ).toThrow("table_capacity");
  db.exec(
    "UPDATE reservations SET status='cancelada' WHERE id='valid'; UPDATE dining_tables SET status='fuera de servicio' WHERE business_id='mary';",
  );
  expect(() => reserve("closed")).toThrow("table_capacity");
});
it("rechaza solapamiento al insertar/actualizar, permite contiguas y excluye la propia reserva", () => {
  reserve("first");
  expect(() => reserve("overlap", start + 1, start + 3600001)).toThrow(
    "reservation_overlap",
  );
  reserve("next", start + 3600000, start + 7200000);
  expect(() =>
    db
      .prepare("UPDATE reservations SET start_at=? WHERE id='next'")
      .run(start + 1),
  ).toThrow("reservation_overlap");
  expect(() =>
    db.exec("UPDATE reservations SET status='confirmada' WHERE id='first'"),
  ).not.toThrow();
  reserve("cancelled", start, start + 3600000, 4, "cancelada");
  reserve("other-business", start, start + 3600000, 4, "pendiente", "other");
});
it("protege capacidad/estado de mesas con reservas activas futuras", () => {
  reserve("future");
  expect(() =>
    db.exec("UPDATE dining_tables SET capacity=3 WHERE business_id='mary'"),
  ).toThrow("table_has_reservations");
  expect(() =>
    db.exec(
      "UPDATE dining_tables SET status='fuera de servicio' WHERE business_id='mary'",
    ),
  ).toThrow("table_has_reservations");
  expect(() =>
    db.exec(
      "UPDATE dining_tables SET name='Nuevo nombre' WHERE business_id='mary'",
    ),
  ).not.toThrow();
  expect(() =>
    db.exec("UPDATE dining_tables SET capacity=2 WHERE business_id='other'"),
  ).not.toThrow();
});
it("la segunda migración permite cambiar mesas cuando la reserva terminó", () => {
  reserve("expired", Date.now() - 7200000, Date.now() - 3600000);
  expect(() =>
    db.exec(
      "UPDATE dining_tables SET capacity=2,status='fuera de servicio' WHERE business_id='mary'",
    ),
  ).not.toThrow();
});
it("impide correos duplicados entre clientes y equipo en ambas direcciones", () => {
  db.exec(
    "INSERT INTO users VALUES('staff','mary','staff@example.invalid','test-hash','personal'); INSERT INTO customers VALUES('client','mary','client@example.invalid','test-hash',0);",
  );
  expect(() =>
    db.exec(
      "INSERT INTO customers VALUES('duplicate-client','other','staff@example.invalid','test-hash',0)",
    ),
  ).toThrow("account_email_unavailable");
  expect(() =>
    db.exec(
      "INSERT INTO users VALUES('duplicate-staff','other','client@example.invalid','test-hash','personal')",
    ),
  ).toThrow("account_email_unavailable");
});
