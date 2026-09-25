import { describe, it, expect } from "vitest";
import { draftChanges } from "../frontend/src/admin/draftChanges";
import { publicContent } from "../shared/publicContent";
import { content } from "../scripts/seed-data.mjs";
describe("borradores administrativos", () => {
  it("detecta cambios y deja de marcarlos si se revierte el valor", () => {
    const draft = structuredClone(content);
    draft.tagline = "Nuevo texto";
    expect(draftChanges(content, draft)).toEqual([
      { id: "tagline", label: "frase de bienvenida", detail: "Modificado" },
    ]);
    draft.tagline = content.tagline;
    expect(draftChanges(content, draft)).toEqual([]);
  });
  it("identifica precios, incorporaciones y eliminaciones por elemento", () => {
    const draft = structuredClone(content);
    draft.products[0].price += 100;
    draft.products.pop();
    draft.buttons.push({ ...draft.buttons[0], id: "new", text: "Prueba" });
    const diff = draftChanges(content, draft);
    expect(diff).toHaveLength(3);
    expect(diff.find((c) => c.id.startsWith("products:"))?.detail).toContain(
      "precio",
    );
    expect(diff.some((c) => c.detail === "Añadido")).toBe(true);
    expect(diff.some((c) => c.detail === "Eliminado")).toBe(true);
  });
  it("respeta visibilidad pública sin mutar el borrador", () => {
    const draft = structuredClone(content);
    draft.categories[0].active = false;
    draft.hideSoldOut = true;
    draft.partners[0].active = false;
    const filtered = publicContent(draft);
    expect(
      filtered.categories.some((c) => c.id === draft.categories[0].id),
    ).toBe(false);
    expect(
      filtered.products.some(
        (p) => !p.available || p.categoryId === draft.categories[0].id,
      ),
    ).toBe(false);
    expect(filtered.partners).toHaveLength(0);
    expect(draft.partners).toHaveLength(1);
  });
});
