interface PagesEnv {
  API: Fetcher;
  ASSETS: Fetcher;
}
const headers = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export const onRequest: PagesFunction<PagesEnv> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/api/"))
    return context.env.API.fetch(context.request);
  if (url.pathname === "/robots.txt")
    return new Response(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /m/\nSitemap: ${url.origin}/sitemap.xml`,
      { headers: { ...headers, "Content-Type": "text/plain" } },
    );
  const isPage = !url.pathname.split("/").pop()?.includes(".");
  if (!isPage && url.pathname !== "/sitemap.xml") {
    const asset = await context.env.ASSETS.fetch(context.request);
    const r = new Response(asset.body, asset);
    Object.entries(headers).forEach(([k, v]) => r.headers.set(k, v));
    return r;
  }
  let data: {
    content: {
      name: string;
      description: string;
      cover: string;
      partners: {
        slug: string;
        name: string;
        description: string;
        image: string;
      }[];
    };
  } | null = null;
  if (!url.pathname.startsWith("/admin"))
    try {
      const res = await context.env.API.fetch(
        new Request(`${url.origin}/api/content`),
      );
      if (res.ok) data = await res.json();
    } catch {
      /* SPA displays API error if backend unavailable. */
    }
  if (url.pathname === "/sitemap.xml") {
    const paths = [
      "/",
      "/recomendados",
      "/reservas",
      ...(data?.content.partners.map((p) => `/recomendados/${p.slug}`) || []),
    ];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${escape(url.origin + p)}</loc></url>`).join("")}</urlset>`,
      { headers: { ...headers, "Content-Type": "application/xml" } },
    );
  }
  const asset = await context.env.ASSETS.fetch(
    new Request(`${url.origin}/index.html`, context.request),
  );
  let html = await asset.text();
  const partner = data?.content.partners.find(
    (p) => url.pathname === `/recomendados/${p.slug}`,
  );
  const title = partner
    ? `${partner.name} · ${data?.content.name}`
    : data
      ? `${data.content.name} · Carta digital`
      : "Cocinería Mary";
  const description =
    partner?.description || data?.content.description || "Carta digital";
  const image = partner?.image || data?.content.cover;
  const canonical =
    url.origin + (url.pathname.startsWith("/m/") ? "/" : url.pathname);
  html = html
    .replace(/<title>.*?<\/title>/, "")
    .replace(/<meta\s+(?:name="description"|property="og:[^"]+")[^>]*>/g, "")
    .replace(
      "</head>",
      `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(canonical)}">${image ? `<meta property="og:image" content="${escape(new URL(image, url.origin).href)}">` : ""}${url.pathname.startsWith("/admin") || url.pathname === "/cuenta" ? '<meta name="robots" content="noindex,nofollow">' : ""}</head>`,
    );
  const known =
    [
      "/",
      "/reservas",
      "/recomendados",
      "/cuenta",
      "/admin",
      "/admin/preview",
    ].includes(url.pathname) ||
    /^\/m\/[\w-]+$/.test(url.pathname) ||
    !!partner;
  const pageHeaders = {
    ...headers,
    "Content-Security-Policy": headers["Content-Security-Policy"].replace(
      "frame-src ",
      "frame-src 'self' ",
    ),
  };
  if (url.pathname === "/admin/preview")
    pageHeaders["Content-Security-Policy"] = pageHeaders[
      "Content-Security-Policy"
    ].replace("frame-ancestors 'none'", "frame-ancestors 'self'");
  return new Response(html, {
    status: known ? 200 : 404,
    headers: {
      ...pageHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};
