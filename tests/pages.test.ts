import { describe, it, expect } from "vitest";
import { onRequest } from "../functions/[[path]]";
import type { Content } from "../shared/schema";
import { content } from "../scripts/seed-data.mjs";
function context(path: string, custom: Content = content) {
  return {
    request: new Request(`https://mary.example${path}`),
    env: {
      API: { fetch: async () => Response.json({ content: custom }) },
      ASSETS: {
        fetch: async () =>
          new Response(
            '<html><head><title>Anterior</title></head><body><div id="root"></div></body></html>',
          ),
      },
    },
  } as unknown as Parameters<typeof onRequest>[0];
}
describe("Pages: SEO dinámico y cabeceras", () => {
  it("inserta metadatos de cada recomendado y canonical sin query", async () => {
    const response = await onRequest(
      context("/recomendados/cabanas-mar-azul?test=1"),
    );
    const html = await response.text();
    expect(html).toContain("Cabañas Mar Azul · Cocinería Mary");
    expect(html).toContain(
      'rel="canonical" href="https://mary.example/recomendados/cabanas-mar-azul"',
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("Strict-Transport-Security")).toContain(
      "31536000",
    );
  });
  it("escapa el texto editorial en HTML", async () => {
    const response = await onRequest(
      context("/", { ...content, name: "<script>evil</script>" }),
    );
    expect(await response.text()).not.toContain("<script>evil</script>");
  });
  it("sitemap enumera recomendados y robots excluye administración", async () => {
    expect(await (await onRequest(context("/sitemap.xml"))).text()).toContain(
      "/recomendados/cabanas-mar-azul",
    );
    expect(await (await onRequest(context("/robots.txt"))).text()).toContain(
      "Disallow: /admin",
    );
  });
  it("devuelve 404 para páginas inexistentes y noindex para admin", async () => {
    expect((await onRequest(context("/unknown"))).status).toBe(404);
    expect(await (await onRequest(context("/admin"))).text()).toContain(
      "noindex,nofollow",
    );
  });
});
