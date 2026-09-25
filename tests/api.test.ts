import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { digest, passwordHash, verifyPassword } from "../worker/security";
import type { Content } from "../shared/schema";
let mf: Miniflare;
let db: Awaited<ReturnType<Miniflare["getD1Database"]>>;
let cookie = "";
let csrf = "";
let content: Content;
const origin = "http://localhost:5173";
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  auth = false,
  extra: Record<string, string> = {},
) {
  return mf.dispatchFetch(`http://localhost/api${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(auth ? { Cookie: cookie, "X-CSRF-Token": csrf } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
beforeAll(async () => {
  await mkdir("work", { recursive: true });
  await build({
    entryPoints: ["worker/index.ts"],
    outfile: "work/test-worker.mjs",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: "work/test-worker.mjs",
      compatibilityDate: "2026-09-01",
      d1Databases: ["DB"],
      r2Buckets: ["MEDIA"],
      bindings: {
        ENVIRONMENT: "development",
        PUBLIC_ORIGIN: origin,
        BUSINESS_ID: "mary",
      },
    }),
  );
  db = await mf.getD1Database("DB");
  for (const file of [
    "0001_initial.sql",
    "0002_expired_tables.sql",
    "0003_customer_accounts.sql",
  ]) {
    const migration = await readFile(`migrations/${file}`, "utf8");
    for (const sql of migration.match(
      /CREATE TRIGGER[\s\S]*?\nEND;|(?:PRAGMA|CREATE TABLE|CREATE INDEX|DROP TRIGGER|ALTER TABLE)[\s\S]*?;/g,
    ) || [])
      await db.prepare(sql).run();
  }
  const seed = await import("../scripts/seed-data.mjs");
  content = seed.content as Content;
  await db
    .prepare("INSERT INTO businesses(id,slug,content) VALUES(?,?,?)")
    .bind("mary", "mary", JSON.stringify(content))
    .run();
  await db
    .prepare(
      "INSERT INTO dining_tables VALUES('1','mary','Mesa 1',4,0,'disponible')",
    )
    .run();
  await db
    .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
    .bind(
      "owner",
      "mary",
      "owner@example.invalid",
      await passwordHash("Test-only-strong-password!"),
      "propietario",
    )
    .run();
  await db
    .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
    .bind(
      "staff",
      "mary",
      "staff@example.invalid",
      await passwordHash("Test-only-strong-password!"),
      "personal",
    )
    .run();
}, 60000);
afterAll(async () => {
  await mf?.dispose();
});
describe("API con Worker, D1 y R2 locales reales", () => {
  it("sirve carta y no expone contraseñas", async () => {
    const r = await request("/content?table=1");
    expect(r.status).toBe(200);
    const b = (await r.json()) as { content: Content; table: { id: string } };
    expect(b.content.name).toBe("Cocinería Mary");
    expect(b.table.id).toBe("1");
    expect(JSON.stringify(b)).not.toContain("password_hash");
  });
  it("requiere autenticación y rechaza origen externo", async () => {
    expect((await request("/admin/content")).status).toBe(401);
    expect(
      (
        await request("/feedback", "POST", { rating: 5, comment: "" }, false, {
          Origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
  });
  it("crea sesión HttpOnly y exige CSRF", async () => {
    const r = await request("/auth/login", "POST", {
      email: "owner@example.invalid",
      password: "Test-only-strong-password!",
    });
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie")).toContain("HttpOnly");
    expect(r.headers.get("set-cookie")).toContain("SameSite=Strict");
    cookie = r.headers.get("set-cookie")!.split(";")[0];
    csrf = ((await r.json()) as { csrf: string }).csrf;
    expect(
      (
        await request("/admin/content", "PUT", { version: 1, content }, true, {
          "X-CSRF-Token": "wrong",
        })
      ).status,
    ).toBe(403);
  });
  it("persiste edición validada y detecta edición obsoleta", async () => {
    const changed = { ...content, tagline: "Cambio de prueba" };
    expect(
      (
        await request(
          "/admin/content",
          "PUT",
          { version: 1, content: changed },
          true,
        )
      ).status,
    ).toBe(200);
    expect(
      (await request("/admin/content", "PUT", { version: 1, content }, true))
        .status,
    ).toBe(409);
    const b = (await (await request("/content")).json()) as {
      content: Content;
    };
    expect(b.content.tagline).toBe("Cambio de prueba");
  });
  it("rechaza sobrecapacidad y previene dobles reservas simultáneas", async () => {
    const day = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const body = {
      name: "Prueba",
      phone: "000000000",
      date: day,
      time: "13:00",
      people: 5,
    };
    expect((await request("/reservations", "POST", body, true)).status).toBe(
      409,
    );
    const results = await Promise.all([
      request("/reservations", "POST", { ...body, people: 4 }, true),
      request("/reservations", "POST", { ...body, people: 4 }, true),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
  it("no permite reducir capacidad de mesa reservada", async () => {
    const r = await request(
      "/admin/tables/1",
      "PUT",
      { id: "1", name: "Mesa 1", capacity: 2, people: 0, status: "disponible" },
      true,
    );
    expect(r.status).toBe(409);
  });
  it("guarda feedback privado, valida y limita spam", async () => {
    expect(
      (await request("/feedback", "POST", { rating: 6, comment: "" })).status,
    ).toBe(400);
    expect(
      (
        await request("/feedback", "POST", {
          rating: 5,
          comment: "Buena experiencia",
        })
      ).status,
    ).toBe(201);
    expect(
      (await request("/feedback", "POST", { rating: 4, comment: "" })).status,
    ).toBe(201);
    expect(
      (await request("/feedback", "POST", { rating: 5, comment: "" })).status,
    ).toBe(429);
    const r = await request("/admin/feedback", "GET", undefined, true);
    expect((await r.json()) as unknown[]).toHaveLength(2);
  });
  it("deduplica recargas por sesión y genera reporte sin envío", async () => {
    const event = { type: "page_view", target: "home", session: randomUUID() };
    await request("/events", "POST", event);
    await request("/events", "POST", event);
    const r = await request(
      "/admin/reports?period=day",
      "GET",
      undefined,
      true,
    );
    const body = (await r.json()) as {
      rows: { count: number }[];
      sent: boolean;
    };
    expect(body.rows[0].count).toBe(1);
    expect(body.sent).toBe(false);
  });
  it("no acepta eventos de negocios inexistentes", async () => {
    expect(
      (
        await request("/events", "POST", {
          type: "partner_view",
          target: "unknown",
          session: randomUUID(),
        })
      ).status,
    ).toBe(400);
  });
  it("rechaza falso archivo y almacena PNG válido en R2 con nombre aleatorio", async () => {
    const bad = new FormData();
    bad.set(
      "file",
      new File(["<html>not a real image</html>"], "fake.png", {
        type: "image/png",
      }),
    );
    const send = async (body: FormData) => {
      const request = new Request("http://localhost/api/admin/media", {
        method: "POST",
        headers: { Origin: origin, Cookie: cookie, "X-CSRF-Token": csrf },
        body,
      });
      return mf.dispatchFetch(request.url, {
        method: "POST",
        headers: Object.fromEntries(request.headers),
        body: new Uint8Array(await request.arrayBuffer()),
      });
    };
    expect((await send(bad)).status).toBe(400);
    const good = new FormData();
    good.set(
      "file",
      new File(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6KxQAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        "pixel.png",
        { type: "image/png" },
      ),
    );
    const response = await send(good);
    expect(response.status).toBe(201);
    const { url } = (await response.json()) as { url: string };
    expect(url).toMatch(/^\/api\/media\/mary\/[a-f0-9-]+\.png$/);
    const image = await mf.dispatchFetch(`http://localhost${url}`);
    expect(image.status).toBe(200);
    expect(image.headers.get("Content-Type")).toBe("image/png");
    expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(40);
  });
  it("personal no puede cambiar contenido ni leer reportes", async () => {
    const r = await request("/auth/login", "POST", {
      email: "staff@example.invalid",
      password: "Test-only-strong-password!",
    });
    const staffCookie = r.headers.get("set-cookie")!.split(";")[0];
    expect(
      (
        await request("/admin/content", "GET", undefined, false, {
          Cookie: staffCookie,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/admin/reports", "GET", undefined, false, {
          Cookie: staffCookie,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/admin/tables", "GET", undefined, false, {
          Cookie: staffCookie,
        })
      ).status,
    ).toBe(200);
  });
  it("guarda tipografías y rechaza contraste insuficiente sin modificar contenido", async () => {
    const existing = (await (
      await request("/admin/content", "GET", undefined, true)
    ).json()) as { version: number; content: Content };
    const changed = {
      ...existing.content,
      font: "mono",
      bodyFont: "readable",
      headingColor: "#203e50",
    };
    expect(
      (
        await request(
          "/admin/content",
          "PUT",
          { version: existing.version, content: changed },
          true,
        )
      ).status,
    ).toBe(200);
    const published = (await (await request("/content")).json()) as {
      content: Content;
    };
    expect(published.content.font).toBe("mono");
    expect(published.content.headingColor).toBe("#203e50");
    expect(
      (
        await request(
          "/admin/content",
          "PUT",
          {
            version: existing.version + 1,
            content: { ...changed, textColor: changed.background },
          },
          true,
        )
      ).status,
    ).toBe(400);
  });
  it("bloquea transiciones de reservas y audita solo cambios efectivos", async () => {
    const start = Date.now() + 86400000;
    await db
      .prepare(
        "INSERT INTO reservations(id,business_id,table_id,name,phone,start_at,end_at,people,status,created_at) VALUES('transition','mary','1','Prueba','000000000',?,?,2,'pendiente',?)",
      )
      .bind(start, start + 5400000, Date.now())
      .run();
    expect(
      (
        await request(
          "/admin/reservations/transition",
          "PATCH",
          { status: "finalizada" },
          true,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          "/admin/reservations/transition",
          "PATCH",
          { status: "confirmada" },
          true,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/admin/reservations/transition",
          "PATCH",
          { status: "finalizada" },
          true,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          "/admin/reservations/transition",
          "PATCH",
          { status: "cancelada" },
          true,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/admin/reservations/transition",
          "PATCH",
          { status: "confirmada" },
          true,
        )
      ).status,
    ).toBe(409);
    const audit = await db
      .prepare(
        "SELECT count(*) AS count FROM audit_log WHERE target='transition'",
      )
      .first<{ count: number }>();
    expect(audit?.count).toBe(2);
  });
  it("reservas exigen sesión y CSRF; clientes quedan aislados del panel y de otras cuentas", async () => {
    const payload = {
      name: "Cliente prueba",
      phone: "000000000",
      date: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      time: "16:00",
      people: 2,
    };
    expect((await request("/reservations", "POST", payload)).status).toBe(401);
    expect(
      (
        await request("/auth/register", "POST", {
          email: "attack@example.invalid",
          password: "Safe-test-password!",
          role: "superadmin",
        })
      ).status,
    ).toBe(400);
    const signup = await request("/auth/register", "POST", {
      email: "customer@example.invalid",
      password: "Safe-test-password!",
      website: "",
    });
    expect(signup.status).toBe(201);
    const customer = (await signup.json()) as {
      id: string;
      role: string;
      csrf: string;
    };
    expect(customer.role).toBe("cliente");
    const customerCookie = signup.headers.get("set-cookie")!.split(";")[0];
    const headers = { Cookie: customerCookie, "X-CSRF-Token": customer.csrf };
    expect(
      (await request("/admin/content", "GET", undefined, false, headers))
        .status,
    ).toBe(403);
    expect(
      (await request("/admin/tables", "GET", undefined, false, headers)).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/admin/users",
          "POST",
          {
            email: "bad@example.invalid",
            password: "Safe-test-password!",
            role: "superadmin",
          },
          false,
          headers,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/reservations", "POST", payload, false, {
          Cookie: customerCookie,
        })
      ).status,
    ).toBe(403);
    const booking = await request(
      "/reservations",
      "POST",
      { ...payload, account_id: "owner" },
      false,
      headers,
    );
    expect(booking.status).toBe(201);
    const mine = (await (
      await request("/account/reservations", "GET", undefined, false, headers)
    ).json()) as { id: string }[];
    expect(mine).toHaveLength(1);
    const otherSignup = await request("/auth/register", "POST", {
      email: "other-customer@example.invalid",
      password: "Safe-test-password!",
    });
    expect(otherSignup.status).toBe(201);
    const otherCookie = otherSignup.headers.get("set-cookie")!.split(";")[0];
    expect(
      await (
        await request("/account/reservations", "GET", undefined, false, {
          Cookie: otherCookie,
        })
      ).json(),
    ).toEqual([]);
    expect(
      (
        await request("/auth/login", "POST", {
          email: "CUSTOMER@example.invalid",
          password: "Safe-test-password!",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request("/auth/register", "POST", {
          email: "owner@example.invalid",
          password: "Safe-test-password!",
        })
      ).status,
    ).toBe(409);
    expect(
      (await request("/auth/logout", "POST", {}, false, headers)).status,
    ).toBe(200);
    expect(
      (await request("/account/reservations", "GET", undefined, false, headers))
        .status,
    ).toBe(401);
  });
  it("separa visitantes del mismo Wi-Fi y conserva el límite individual", async () => {
    const a = (await request("/content")).headers
      .get("set-cookie")!
      .split(";")[0];
    const b = (await request("/content")).headers
      .get("set-cookie")!
      .split(";")[0];
    const send = (cookie: string) =>
      request(
        "/feedback",
        "POST",
        { rating: 5, comment: "Beta Wi-Fi" },
        false,
        { Cookie: cookie, "CF-Connecting-IP": "198.51.100.40" },
      );
    for (let i = 0; i < 3; i++) expect((await send(a)).status).toBe(201);
    expect((await send(a)).status).toBe(429);
    expect((await send(b)).status).toBe(201);
  });
  it("restablece solo como superadmin reautenticado, revoca sesiones y audita sin secretos", async () => {
    const oldPassword = "Reset-test-old-password!";
    const newPassword = "Reset-test-new-password!";
    await db
      .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
      .bind(
        "reset-admin",
        "mary",
        "reset-admin@example.invalid",
        await passwordHash(oldPassword),
        "superadmin",
      )
      .run();
    await db
      .prepare("INSERT INTO customers VALUES(?,?,?,?,?)")
      .bind(
        "reset-client",
        "mary",
        "reset-client@example.invalid",
        await passwordHash(oldPassword),
        Date.now(),
      )
      .run();
    await db
      .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
      .bind(
        await digest("reset-admin-token"),
        "reset-admin",
        "reset-csrf",
        Date.now() + 60000,
      )
      .run();
    await db
      .prepare("INSERT INTO customer_sessions VALUES(?,?,?,?)")
      .bind(
        await digest("reset-client-token"),
        "reset-client",
        "client-csrf",
        Date.now() + 60000,
      )
      .run();
    const headers = {
      Cookie: "mary_session=reset-admin-token",
      "X-CSRF-Token": "reset-csrf",
    };
    const payload = {
      email: "reset-client@example.invalid",
      currentPassword: oldPassword,
      newPassword,
    };
    expect(
      (await request("/admin/users/reset-password", "POST", payload, true))
        .status,
    ).toBe(403);
    expect(
      (
        await request("/admin/users/reset-password", "POST", payload, false, {
          Cookie: headers.Cookie,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/admin/users/reset-password",
          "POST",
          { ...payload, email: "absent@example.invalid" },
          false,
          headers,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "/admin/users/reset-password",
          "POST",
          { ...payload, currentPassword: "incorrect" },
          false,
          headers,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/admin/users/reset-password",
          "POST",
          payload,
          false,
          headers,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request("/auth/me", "GET", undefined, false, {
          Cookie: "mary_session=reset-client-token",
        })
      ).status,
    ).toBe(401);
    const row = await db
      .prepare("SELECT password_hash FROM customers WHERE id='reset-client'")
      .first<{ password_hash: string }>();
    expect(await verifyPassword(newPassword, row!.password_hash)).toBe(true);
    expect(await verifyPassword(oldPassword, row!.password_hash)).toBe(false);
    const log = await db
      .prepare("SELECT * FROM audit_log WHERE action='password.reset'")
      .all();
    expect(log.results).toHaveLength(1);
    expect(JSON.stringify(log)).not.toContain(newPassword);
    expect(JSON.stringify(log)).not.toContain(oldPassword);
    expect(
      (
        await request(
          "/admin/users/reset-password",
          "POST",
          payload,
          false,
          headers,
        )
      ).status,
    ).toBe(429);
  });
  it("sesión expirada no autoriza", async () => {
    await db.prepare("UPDATE sessions SET expires_at=0").run();
    expect(
      (await request("/admin/content", "GET", undefined, true)).status,
    ).toBe(401);
  });
});
