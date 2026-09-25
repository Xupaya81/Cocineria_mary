import { describe, it, expect } from "vitest";
import {
  availableTables,
  canManage,
  localDateTime,
  overlaps,
  periodStart,
  promotionActive,
} from "../shared/rules";
import {
  contentSchema,
  feedbackSchema,
  reservationSchema,
  safeUrl,
  tableSchema,
} from "../shared/schema";
import { reportMessage } from "../worker/reports";
import { validateImage } from "../worker/storage";
describe("reglas del restaurante", () => {
  const tables = [
    {
      id: "1",
      name: "Mesa 1",
      capacity: 4,
      people: 0,
      status: "disponible" as const,
    },
    {
      id: "2",
      name: "Mesa 2",
      capacity: 6,
      people: 0,
      status: "fuera de servicio" as const,
    },
  ];
  it("excluye capacidad insuficiente y mesas fuera de servicio", () =>
    expect(availableTables(tables, [], 5, 100, 200)).toHaveLength(0));
  it("bloquea pendientes, permite límites contiguos y reservas canceladas", () => {
    const rows = [
      { table_id: "1", start_at: 100, end_at: 200, status: "pendiente" },
    ];
    expect(availableTables(tables, rows, 4, 150, 250)).toHaveLength(0);
    expect(availableTables(tables, rows, 4, 200, 300)).toHaveLength(1);
    expect(
      availableTables(
        tables,
        [{ ...rows[0], status: "cancelada" }],
        4,
        100,
        200,
      ),
    ).toHaveLength(1);
  });
  it("detecta solapamientos inclusivos por dentro y exclusivos por borde", () => {
    expect(overlaps(100, 200, 120, 180)).toBe(true);
    expect(overlaps(100, 200, 200, 300)).toBe(false);
  });
  it("aplica mínimo privilegio por rol", () => {
    expect(canManage("personal", "content")).toBe(false);
    expect(canManage("personal", "operations")).toBe(true);
    expect(canManage("personal", "reports")).toBe(false);
    expect(canManage("propietario", "users")).toBe(false);
    expect(canManage("superadmin", "users")).toBe(true);
  });
  it("interpreta horario de invierno y verano de Chile", () => {
    expect(new Date(localDateTime("2026-07-10", "12:30")).toISOString()).toBe(
      "2026-07-10T16:30:00.000Z",
    );
    expect(new Date(localDateTime("2026-12-10", "12:30")).toISOString()).toBe(
      "2026-12-10T15:30:00.000Z",
    );
  });
  it("calcula períodos locales, incluyendo cambio de mes UTC", () => {
    expect(
      new Date(
        periodStart("day", new Date("2026-09-26T01:00:00Z")),
      ).toISOString(),
    ).toBe("2026-09-25T03:00:00.000Z");
    expect(
      new Date(
        periodStart("week", new Date("2026-09-25T15:00:00Z")),
      ).toISOString(),
    ).toBe("2026-09-21T03:00:00.000Z");
  });
  it("evalúa vigencia de la promoción por fecha local", () => {
    expect(
      promotionActive(
        { active: true, start: "2026-09-25", end: "2026-09-25" },
        new Date("2026-09-26T01:00:00Z"),
      ),
    ).toBe(true);
    expect(
      promotionActive({
        active: false,
        start: "2026-01-01",
        end: "2030-01-01",
      }),
    ).toBe(false);
  });
  it("rechaza URLs de script, credenciales y protocol-relative", () => {
    for (const url of [
      "javascript:alert(1)",
      "//evil.com",
      "https://user:pass@evil.com",
      "data:text/html,a",
    ])
      expect(safeUrl.safeParse(url).success).toBe(false);
    expect(safeUrl.safeParse("https://wa.me/56900000000").success).toBe(true);
  });
  it("valida puntuación, capacidad, campos y horarios", () => {
    expect(feedbackSchema.safeParse({ rating: 6, comment: "" }).success).toBe(
      false,
    );
    expect(tableSchema.safeParse({ ...tables[0], people: 8 }).success).toBe(
      false,
    );
    expect(
      reservationSchema.safeParse({
        name: "A",
        phone: "x",
        date: "invalid",
        time: "25:90",
        people: 0,
      }).success,
    ).toBe(false);
    expect(contentSchema.safeParse({}).success).toBe(false);
  });
  it("reporta clics, nunca mensajes enviados", () => {
    const report = reportMessage([
      {
        type: "button_click",
        target: "mary__test",
        channel: "whatsapp",
        count: 8,
      },
    ]);
    expect(report).toContain("8 clics a WhatsApp");
    expect(report).not.toContain("mensajes enviados");
  });
  it("rechaza archivos con nombre y MIME de imagen pero contenido HTML", async () => {
    await expect(
      validateImage(
        new File(["<html>not an image</html>"], "photo.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("válida");
  });
});
