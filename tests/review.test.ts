import { describe, it, expect } from "vitest";
import { content } from "../scripts/seed-data.mjs";
import {
  contentSchema,
  eventSchema,
  reservationSchema,
} from "../shared/schema";
import { themePresets } from "../shared/theme";
import { reservationTransitions } from "../shared/rules";
import { reportMessage } from "../worker/reports";
import { publicContent } from "../shared/publicContent";
describe("revisión de personalización y lógica", () => {
  it("migra documentos antiguos con valores predeterminados", () => {
    expect(contentSchema.parse(content).bodyFont).toBe("sans");
  });
  for (const preset of themePresets)
    it(`valida contraste del tema ${preset.name}`, () => {
      expect(
        contentSchema.safeParse({ ...content, ...preset.values }).success,
      ).toBe(true);
    });
  it("rechaza letras ilegibles y fuentes no admitidas", () => {
    expect(
      contentSchema.safeParse({ ...content, textColor: content.background })
        .success,
    ).toBe(false);
    expect(
      contentSchema.safeParse({ ...content, font: "external-script" }).success,
    ).toBe(false);
  });
  it("valida teléfono por dígitos reales", () => {
    expect(
      reservationSchema.safeParse({
        name: "Prueba",
        phone: "(       )",
        date: "2026-10-10",
        time: "14:00",
        people: 2,
      }).success,
    ).toBe(false);
  });
  it("permite identificadores compuestos largos sin ambigüedad", () => {
    expect(
      eventSchema.safeParse({
        type: "button_click",
        target: "a".repeat(64) + "__" + "b".repeat(64),
        session: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });
  it("reservas terminales no se reabren ni se finalizan antes de comenzar", () => {
    expect(reservationTransitions("cancelada", 0)).toEqual([]);
    expect(reservationTransitions("finalizada", 0)).toEqual([]);
    expect(reservationTransitions("confirmada", 200, 100)).not.toContain(
      "finalizada",
    );
    expect(reservationTransitions("confirmada", 50, 100)).toContain(
      "finalizada",
    );
  });
  it("agrupa clics de varios botones en un solo total", () => {
    expect(
      reportMessage([
        { type: "button_click", target: "a", channel: "whatsapp", count: 2 },
        { type: "button_click", target: "b", channel: "whatsapp", count: 3 },
      ]),
    ).toBe("5 clics a WhatsApp.");
  });
  it("no publica botones desactivados de negocios", () => {
    const draft = contentSchema.parse(content);
    draft.partners[0].buttons.push({
      id: "hidden",
      text: "Privado",
      url: "https://example.invalid",
      icon: "link",
      action: "other",
      active: false,
      order: 9,
      style: "outline",
    });
    expect(
      publicContent(draft).partners[0].buttons.some((b) => b.id === "hidden"),
    ).toBe(false);
  });
});
