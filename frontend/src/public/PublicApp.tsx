import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  Clock,
  MapPin,
  Search,
  Sprout,
} from "lucide-react";
import type { Content, PublicData } from "../../../shared/schema";
import { LinkButtons, Empty, money } from "../components";
import { track } from "../api";
import { AccountLink } from "../account/AccountLink";
const Account = lazy(() => import("../account/Account"));
import { Feedback, Reservations } from "./Forms";

function Menu({ content }: { content: Content }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const products = content.products
    .filter(
      (p) =>
        (category === "all" || p.categoryId === category) &&
        `${p.name} ${p.description}`
          .toLocaleLowerCase("es")
          .includes(search.toLocaleLowerCase("es")),
    )
    .sort((a, b) => a.order - b.order);
  return (
    <section id="carta" className="menu-section section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RECIÉN HECHO, PARA TI</span>
          <h2>
            {content.blocks.find((b) => b.id === "menu")?.title ||
              "Nuestra carta"}
          </h2>
        </div>
        <span className="small-mark">
          <Sprout size={17} /> Sabor de casa
        </span>
      </div>
      <div className="menu-tools">
        <div className="category-tabs" aria-label="Categorías">
          <button
            className={category === "all" ? "selected" : ""}
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
          >
            Toda la carta
          </button>
          {[...content.categories]
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <button
                key={c.id}
                className={category === c.id ? "selected" : ""}
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
              >
                {c.name}
              </button>
            ))}
        </div>
        <label className="search">
          <Search size={18} />
          <span className="sr-only">Buscar en la carta</span>
          <input
            type="search"
            placeholder="¿Qué se te antoja?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {content.demo && (
        <p className="demo-prices">
          Carta de demostración · Platos y precios de ejemplo, pendientes de
          confirmación.
        </p>
      )}
      <div className="product-grid">
        {products.map((p) => (
          <article
            key={p.id}
            className={`product-card ${p.available ? "" : "sold-out"}`}
          >
            <div className="product-image">
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  width={400}
                  height={300}
                />
              ) : (
                <BookOpen />
              )}
              {!p.available ? (
                <span className="product-tag">Agotado</span>
              ) : (
                p.tags.length > 0 && (
                  <span className="product-tag">{p.tags[0]}</span>
                )
              )}
            </div>
            <div className="product-copy">
              <div className="product-title">
                <h3>{p.name}</h3>
                <strong>{money(p.price)}</strong>
              </div>
              <p>{p.description}</p>
              {content.demo && <small>Precio de ejemplo</small>}
            </div>
          </article>
        ))}
      </div>
      {!products.length && (
        <Empty>No encontramos platos. Prueba otra categoría o búsqueda.</Empty>
      )}
      <p className="menu-note">
        Si tienes alergias o restricciones alimentarias, consulta al personal
        antes de pedir.
      </p>
    </section>
  );
}
function Promotion({ content }: { content: Content }) {
  const ref = useRef<HTMLElement>(null);
  const p = content.promotion;
  useEffect(() => {
    if (!p || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track("ad_impression", p.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [p]);
  if (!p) return null;
  return (
    <aside ref={ref} className="promotion section">
      <div className="promotion-copy">
        <span className="eyebrow">UN DATO LOCAL · CONTENIDO PATROCINADO</span>
        <h2>{p.name}</h2>
        <p>{p.text}</p>
        {content.demo && <small>Espacio de muestra · Negocio ficticio</small>}
        <a
          className="text-link"
          href={p.url}
          onClick={() => track("promotion_click", p.id)}
        >
          {p.buttonText}
          <ArrowUpRight size={18} />
        </a>
      </div>
      {p.image && (
        <img
          src={p.image}
          alt={p.name}
          width={600}
          height={450}
          loading="lazy"
        />
      )}
    </aside>
  );
}
function Recommendations({
  content,
  full = false,
}: {
  content: Content;
  full?: boolean;
}) {
  const [category, setCategory] = useState("all");
  const partners = content.partners.filter(
    (p) => category === "all" || p.category === category,
  );
  return (
    <section className="section" id="recomendados">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SIGUE DISFRUTANDO POR AQUÍ</span>
          {full ? (
            <h1>
              {content.blocks.find((b) => b.id === "recommendations")?.title ||
                "Nuestros recomendados"}
            </h1>
          ) : (
            <h2>
              {content.blocks.find((b) => b.id === "recommendations")?.title ||
                "Conoce el barrio"}
            </h2>
          )}
          <p>Pequeños negocios, grandes descubrimientos.</p>
        </div>
        {!full && (
          <a className="text-link" href="/recomendados">
            Ver todos <ArrowRight size={18} />
          </a>
        )}
      </div>
      {full && (
        <div className="category-tabs">
          <button
            onClick={() => setCategory("all")}
            className={category === "all" ? "selected" : ""}
          >
            Todos
          </button>
          {Array.from(new Set(content.partners.map((p) => p.category))).map(
            (c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={category === c ? "selected" : ""}
              >
                {c}
              </button>
            ),
          )}
        </div>
      )}
      <div className="partner-grid">
        {partners.map((p) => (
          <a
            className="partner-card"
            href={`/recomendados/${p.slug}`}
            key={p.id}
          >
            {p.image && (
              <img
                src={p.image}
                alt={p.name}
                width={400}
                height={260}
                loading="lazy"
              />
            )}
            <div>
              <span className="eyebrow">{p.category} · PATROCINADO</span>
              <h3>
                {p.name}
                <ArrowUpRight size={20} />
              </h3>
              <p>{p.description}</p>
            </div>
          </a>
        ))}
        {!partners.length && (
          <Empty>Pronto encontrarás nuevos negocios recomendados.</Empty>
        )}
      </div>
    </section>
  );
}
function Location({
  name,
  address,
  url,
  owner = "mary",
}: {
  name: string;
  address: string;
  url: string;
  owner?: string;
}) {
  return (
    <section className="location-section section">
      <div>
        <span className="eyebrow">TE ESPERAMOS</span>
        <h2>Encuéntranos</h2>
        <p>{address || "Ubicación por confirmar"}</p>
        {url && (
          <a
            className="text-link"
            href={url}
            onClick={() => track("button_click", `${owner}__location`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir Google Maps <ArrowUpRight size={18} />
          </a>
        )}
      </div>
      <div className="map-preview">
        {url && address ? (
          <iframe
            title={`Ubicación de ${name}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <>
            <MapPin size={34} />
            <strong>{name}</strong>
            <span>
              {url
                ? "Toca el enlace para ver la ubicación"
                : "Ubicación disponible próximamente"}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
export default function PublicApp({
  data,
  pathOverride,
  preview = false,
}: {
  data: PublicData;
  pathOverride?: string;
  preview?: boolean;
}) {
  const { content } = data;
  const path = pathOverride ?? location.pathname;
  const slug = path.match(/^\/recomendados\/([^/]+)$/)?.[1];
  const partner = slug
    ? content.partners.find((p) => p.slug === slug)
    : undefined;
  const isGuide = path === "/recomendados";
  const reservation = path === "/reservas";
  const account = path === "/cuenta";
  const home = path === "/" || /^\/m\/[\w-]+$/.test(path);
  const unknown = !home && !isGuide && !reservation && !partner && !account;
  useEffect(() => {
    if (preview || account) return;
    document.title = partner
      ? `${partner.name} · Recomendados de ${content.name}`
      : isGuide
        ? `Recomendados · ${content.name}`
        : reservation
          ? `Reservas · ${content.name}`
          : `${content.name} · Carta digital`;
    if (partner) track("partner_view", partner.id);
    else if (!unknown)
      track(
        "page_view",
        isGuide ? "recommendations" : reservation ? "reservations" : "home",
      );
    if (data.table) track("table_scan", data.table.id);
  }, [
    partner,
    content.name,
    isGuide,
    reservation,
    unknown,
    data.table,
    preview,
    account,
  ]);
  const blocks = {
    hero: (
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span />{" "}
            {content.blocks.find((b) => b.id === "hero")?.title ||
              "BIENVENIDOS A NUESTRA MESA"}
          </div>
          <h1>
            {content.name === "Cocinería Mary" ? "Cocinería" : " "}
            <br />
            <em>{content.name === "Cocinería Mary" ? "Mary" : content.name}</em>
          </h1>
          <h2>{content.tagline}</h2>
          <p>{content.description}</p>
          <a href="#carta" className="hero-cta">
            <BookOpen size={20} /> Ver Carta <ArrowRight size={20} />
          </a>
          <div className="hero-details">
            <span>
              <Clock size={15} />
              {content.hours}
            </span>
            <span>
              <MapPin size={15} />
              {content.address}
            </span>
          </div>
        </div>
        <div className="hero-art">
          {content.cover && (
            <img
              src={content.cover}
              alt="Ilustración de nuestra cocina casera"
              width={800}
              height={600}
              fetchPriority="high"
            />
          )}
          <div className="hero-stamp">
            Hecho con
            <br />
            <em>cariño</em>
            <Sprout size={22} />
          </div>
          <span className="art-caption">ILUSTRACIÓN · COCINA DE CASA</span>
        </div>
      </section>
    ),
    buttons: (
      <section className="quick-links section">
        <LinkButtons buttons={content.buttons} owner={data.businessId} />
      </section>
    ),
    menu: <Menu content={content} />,
    promotion: <Promotion content={content} />,
    recommendations: <Recommendations content={content} />,
    map: (
      <Location
        name={content.name}
        address={content.address}
        url={content.mapsUrl}
        owner={data.businessId}
      />
    ),
    feedback: <Feedback siteKey={data.turnstileSiteKey} />,
    footer: (
      <footer className="public-footer">
        <img src={content.logo || "/brand.svg"} width={48} height={48} alt="" />
        <strong>{content.name}</strong>
        <p>
          {content.blocks.find((b) => b.id === "footer")?.title ||
            "Gracias por compartir nuestra mesa."}
        </p>
        <small>Estadísticas anónimas, sin publicidad de seguimiento.</small>
      </footer>
    ),
  };
  return (
    <div className="public-site">
      <a className="skip" href="#main">
        Saltar al contenido
      </a>
      <header className="topbar">
        <a className="brand" href="/">
          <img
            src={content.logo || "/brand.svg"}
            width={40}
            height={40}
            alt=""
          />
          <span>{content.name}</span>
        </a>
        <nav aria-label="Principal">
          <AccountLink preview={preview} />
          <a href="/#carta" className="nav-menu">
            La carta
          </a>
          <a href="/recomendados" className={isGuide ? "active" : ""}>
            Recomendados
          </a>
          <a href="/reservas" className="nav-reserve">
            Reservar <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      {data.table && (
        <div className="table-banner">
          Estás en {data.table.name} · ¡Bienvenido!
        </div>
      )}
      {content.demo && (
        <div className="demo-banner">
          Vista de demostración · Información por confirmar
        </div>
      )}
      <main id="main">
        {home ? (
          content.blocks
            .filter((b) => b.visible)
            .sort((a, b) => a.order - b.order)
            .map((b) => (
              <div key={b.id} data-preview-block={b.id}>
                {blocks[b.id]}
              </div>
            ))
        ) : (
          <div className="inner-page">
            <a className="back-link" href="/">
              <ChevronLeft size={17} /> Volver a {content.name}
            </a>
            {isGuide && <Recommendations content={content} full />}
            {account && (
              <Suspense fallback={<p>Cargando…</p>}>
                <Account siteKey={data.turnstileSiteKey} />
              </Suspense>
            )}
            {reservation && (
              <Reservations
                siteKey={data.turnstileSiteKey}
                demo={content.demo}
              />
            )}{" "}
            {partner && (
              <>
                <section className="partner-hero">
                  <div>
                    <span className="eyebrow">
                      {partner.category} · CONTENIDO PATROCINADO
                    </span>
                    <h1>{partner.name}</h1>
                    <p>{partner.description}</p>
                    <LinkButtons buttons={partner.buttons} owner={partner.id} />
                    {content.demo && (
                      <p className="notice">
                        Perfil de ejemplo. Contactos y ubicación por confirmar.
                      </p>
                    )}
                  </div>
                  {partner.image && (
                    <img
                      src={partner.image}
                      alt={partner.name}
                      width={600}
                      height={450}
                    />
                  )}
                </section>
                <section className="section">
                  <h2>Un vistazo a lo que encontrarás</h2>
                  <div className="partner-grid">
                    {partner.catalog.map((item, i) => (
                      <article className="partner-card" key={i}>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            width={400}
                            height={260}
                          />
                        )}
                        <div>
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
                <Location
                  name={partner.name}
                  address={partner.location}
                  url={partner.mapsUrl}
                  owner={partner.id}
                />
              </>
            )}
            {unknown && (
              <Empty>
                <h1>No encontramos esta página</h1>
                <a href="/">Volver a la carta</a>
              </Empty>
            )}
          </div>
        )}
      </main>
      <a className="mobile-menu-cta" href="/#carta">
        <BookOpen size={18} /> Ver Carta
      </a>
    </div>
  );
}
