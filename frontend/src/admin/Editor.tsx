import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Content, LinkButton, Product } from "../../../shared/schema";
import { uid, Field, Check, ImageField } from "./Fields";
export { uid, Field } from "./Fields";
import ThemeEditor from "./ThemeEditor";

// Swap only the selected category's products; other categories keep their slots.
function moveWithinCategory(items: Product[], id: string, neighborId: string) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((p) => p.id === id),
    j = sorted.findIndex((p) => p.id === neighborId);
  if (i < 0 || j < 0 || sorted[i].categoryId !== sorted[j].categoryId)
    return items;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  return sorted.map((p, order) => ({ ...p, order }));
}
function Moves({
  index,
  length,
  onMove,
  onDelete,
}: {
  index: number;
  length: number;
  onMove: (offset: number) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="row-actions">
      <button
        type="button"
        className="icon-button"
        aria-label="Subir"
        disabled={!index}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={17} />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Bajar"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={17} />
      </button>
      {onDelete && (
        <button
          className="icon-button danger"
          type="button"
          aria-label="Eliminar"
          onClick={() => {
            if (
              confirm(
                "¿Eliminar este elemento? El cambio se aplicará al guardar.",
              )
            )
              onDelete();
          }}
        >
          <Trash2 size={17} />
        </button>
      )}
    </div>
  );
}
const reorder = <T extends { order: number }>(
  items: T[],
  i: number,
  offset: number,
) => {
  const a = [...items];
  [a[i], a[i + offset]] = [a[i + offset], a[i]];
  return a.map((x, order) => ({ ...x, order }));
};
export function ButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: LinkButton[];
  onChange: (b: LinkButton[]) => void;
}) {
  return (
    <>
      <p className="muted">
        Usa enlaces https. Para WhatsApp: https://wa.me/ seguido del número
        internacional.
      </p>
      {buttons.map((b, i) => {
        const patch = (p: Partial<LinkButton>) =>
          onChange(buttons.map((v, j) => (j === i ? { ...v, ...p } : v)));
        return (
          <div className="edit-card" key={b.id}>
            <div className="edit-card-top">
              <strong>{b.text}</strong>
              <Moves
                index={i}
                length={buttons.length}
                onMove={(o) => onChange(reorder(buttons, i, o))}
                onDelete={() => onChange(buttons.filter((_, j) => j !== i))}
              />
            </div>
            <div className="two-col">
              <Field
                label="Texto"
                value={b.text}
                onChange={(text) => patch({ text })}
              />
              <Field
                label="Enlace"
                value={b.url}
                onChange={(url) => patch({ url })}
              />
              <label>
                Icono
                <select
                  value={b.icon}
                  onChange={(e) =>
                    patch({ icon: e.target.value as LinkButton["icon"] })
                  }
                >
                  {[
                    "book",
                    "calendar",
                    "whatsapp",
                    "instagram",
                    "facebook",
                    "map",
                    "phone",
                    "star",
                    "link",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de clic
                <select
                  value={b.action}
                  onChange={(e) =>
                    patch({ action: e.target.value as LinkButton["action"] })
                  }
                >
                  {[
                    "link",
                    "whatsapp",
                    "instagram",
                    "facebook",
                    "maps",
                    "tripadvisor",
                    "other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Estilo
                <select
                  value={b.style}
                  onChange={(e) =>
                    patch({ style: e.target.value as LinkButton["style"] })
                  }
                >
                  <option value="primary">Principal</option>
                  <option value="outline">Contorno</option>
                  <option value="soft">Suave</option>
                </select>
              </label>
              <Check
                label="Visible"
                value={b.active}
                onChange={(active) => patch({ active })}
              />
            </div>
          </div>
        );
      })}
      <button
        className="secondary"
        onClick={() =>
          onChange([
            ...buttons,
            {
              id: uid(),
              text: "Nuevo botón",
              icon: "link",
              url: "/recomendados",
              order: buttons.length,
              active: true,
              style: "outline",
              action: "other",
            },
          ])
        }
      >
        <Plus size={17} /> Añadir botón
      </button>
    </>
  );
}
export default function Editor({
  section,
  content,
  onChange,
}: {
  section: string;
  content: Content;
  onChange: (c: Content) => void;
}) {
  const set = <K extends keyof Content>(key: K, value: Content[K]) =>
    onChange({ ...content, [key]: value });
  if (section === "Diseño")
    return <ThemeEditor content={content} onChange={onChange} />;
  if (section === "General")
    return (
      <div className="form-grid">
        <Field
          label="Nombre del restaurante"
          value={content.name}
          onChange={(v) => set("name", v)}
        />
        <Field
          label="Frase de bienvenida"
          value={content.tagline}
          onChange={(v) => set("tagline", v)}
        />
        <label>
          Descripción
          <textarea
            value={content.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
          />
        </label>
        <div className="two-col">
          <Field
            label="Dirección"
            value={content.address}
            onChange={(v) => set("address", v)}
          />
          <Field
            label="Horario"
            value={content.hours}
            onChange={(v) => set("hours", v)}
          />
        </div>
        <Field
          label="Enlace de Google Maps"
          value={content.mapsUrl}
          onChange={(v) => set("mapsUrl", v)}
        />
        <ImageField
          label="Logo"
          value={content.logo}
          onChange={(v) => set("logo", v)}
        />
        <ImageField
          label="Portada"
          value={content.cover}
          onChange={(v) => set("cover", v)}
        />
        <Check
          label="Mostrar aviso de demostración"
          value={content.demo}
          onChange={(v) => set("demo", v)}
        />
        <Check
          label="Ocultar productos agotados"
          value={content.hideSoldOut}
          onChange={(v) => set("hideSoldOut", v)}
        />
        <Check
          label="Habilitar categoría Dónde comer en recomendados"
          value={content.allowDining}
          onChange={(v) => set("allowDining", v)}
        />
      </div>
    );
  if (section === "Bloques") {
    const names = {
      hero: "Portada",
      buttons: "Botones",
      menu: "Carta",
      promotion: "Promoción",
      recommendations: "Recomendados",
      map: "Ubicación",
      feedback: "Opiniones",
      footer: "Pie de página",
    };
    return (
      <>
        <p>Ordena las secciones con las flechas y elige cuáles mostrar.</p>
        {content.blocks.map((b, i) => (
          <div className="edit-card" key={b.id}>
            <div className="block-row">
              <Check
                label={names[b.id]}
                value={b.visible}
                onChange={(visible) =>
                  set(
                    "blocks",
                    content.blocks.map((x) =>
                      x.id === b.id ? { ...x, visible } : x,
                    ),
                  )
                }
              />
              <Moves
                index={i}
                length={content.blocks.length}
                onMove={(offset) =>
                  set("blocks", reorder(content.blocks, i, offset))
                }
              />
            </div>
            {["menu", "recommendations", "hero", "footer"].includes(b.id) && (
              <Field
                label={
                  b.id === "hero"
                    ? "Encabezado de bienvenida"
                    : b.id === "footer"
                      ? "Mensaje de despedida"
                      : "Título de sección"
                }
                value={b.title || ""}
                onChange={(title) =>
                  set(
                    "blocks",
                    content.blocks.map((x) =>
                      x.id === b.id ? { ...x, title } : x,
                    ),
                  )
                }
              />
            )}
          </div>
        ))}
      </>
    );
  }
  if (section === "Botones")
    return (
      <ButtonsEditor
        buttons={content.buttons}
        onChange={(v) => set("buttons", v)}
      />
    );
  if (section === "Categorías")
    return (
      <>
        {content.categories.map((c, i) => (
          <div className="edit-card" key={c.id}>
            <div className="edit-card-top">
              <Field
                label="Nombre"
                value={c.name}
                onChange={(name) =>
                  set(
                    "categories",
                    content.categories.map((x) =>
                      x.id === c.id ? { ...x, name } : x,
                    ),
                  )
                }
              />
              <Moves
                index={i}
                length={content.categories.length}
                onMove={(o) =>
                  set("categories", reorder(content.categories, i, o))
                }
                onDelete={() => {
                  if (content.products.some((p) => p.categoryId === c.id)) {
                    alert(
                      "Mueve o elimina primero los productos de esta categoría.",
                    );
                    return;
                  }
                  set(
                    "categories",
                    content.categories.filter((x) => x.id !== c.id),
                  );
                }}
              />
            </div>
            <Check
              label="Visible"
              value={c.active}
              onChange={(active) =>
                set(
                  "categories",
                  content.categories.map((x) =>
                    x.id === c.id ? { ...x, active } : x,
                  ),
                )
              }
            />
          </div>
        ))}
        <button
          className="secondary"
          onClick={() =>
            set("categories", [
              ...content.categories,
              {
                id: uid(),
                name: "Nueva categoría",
                order: content.categories.length,
                active: true,
              },
            ])
          }
        >
          Añadir categoría
        </button>
      </>
    );
  if (section === "Productos")
    return (
      <div className="product-categories-editor">
        <p className="muted">
          Abre una categoría para ver y editar sus productos.
        </p>
        {!content.categories.length && (
          <p className="notice">
            Crea primero una categoría en Categorías para añadir productos.
          </p>
        )}
        {[...content.categories]
          .sort((a, b) => a.order - b.order)
          .map((category) => {
            const products = content.products
              .filter((p) => p.categoryId === category.id)
              .sort((a, b) => a.order - b.order);
            return (
              <details className="product-category-group" key={category.id}>
                <summary>
                  <strong>{category.name}</strong>
                  <small>
                    {products.length}{" "}
                    {products.length === 1 ? "producto" : "productos"}
                    {!category.active ? " · Oculta en la carta" : ""}
                  </small>
                </summary>
                <div className="category-products">
                  {!products.length && (
                    <p className="muted">
                      Esta categoría todavía no tiene productos.
                    </p>
                  )}
                  {products.map((p, i) => {
                    const patch = (changes: Partial<typeof p>) =>
                      set(
                        "products",
                        content.products.map((x) =>
                          x.id === p.id ? { ...x, ...changes } : x,
                        ),
                      );
                    return (
                      <details className="edit-card" key={p.id}>
                        <summary>
                          {p.name}
                          <span>{p.available ? "Disponible" : "Agotado"}</span>
                        </summary>
                        <div className="form-grid">
                          <Moves
                            index={i}
                            length={products.length}
                            onMove={(o) =>
                              set(
                                "products",
                                moveWithinCategory(
                                  content.products,
                                  p.id,
                                  products[i + o].id,
                                ),
                              )
                            }
                            onDelete={() =>
                              set(
                                "products",
                                content.products.filter((x) => x.id !== p.id),
                              )
                            }
                          />
                          <Field
                            label="Nombre"
                            value={p.name}
                            onChange={(name) => patch({ name })}
                          />
                          <Field
                            label="Descripción"
                            value={p.description}
                            onChange={(description) => patch({ description })}
                          />
                          <div className="two-col">
                            <Field
                              label="Precio (CLP)"
                              value={p.price}
                              type="number"
                              onChange={(v) => patch({ price: Number(v) })}
                            />
                            <label>
                              Categoría
                              <select
                                value={p.categoryId}
                                onChange={(e) =>
                                  patch({ categoryId: e.target.value })
                                }
                              >
                                {content.categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <ImageField
                            label="Imagen"
                            value={p.image}
                            onChange={(image) => patch({ image })}
                          />
                          <Check
                            label="Disponible"
                            value={p.available}
                            onChange={(available) => patch({ available })}
                          />
                          <div className="tag-checks">
                            {(
                              [
                                "destacado",
                                "recomendación",
                                "nuevo",
                                "vegetariano",
                              ] as const
                            ).map((tag) => (
                              <Check
                                key={tag}
                                label={tag}
                                value={p.tags.includes(tag)}
                                onChange={(v) =>
                                  patch({
                                    tags: v
                                      ? [...p.tags, tag]
                                      : p.tags.filter((t) => t !== tag),
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                  <button
                    className="secondary"
                    disabled={!content.categories.length}
                    onClick={() =>
                      set("products", [
                        ...content.products,
                        {
                          id: uid(),
                          name: "Nuevo producto",
                          description: "",
                          price: 0,
                          image: "",
                          categoryId: category.id,
                          available: true,
                          tags: [],
                          order: content.products.length,
                        },
                      ])
                    }
                  >
                    Añadir producto
                  </button>
                </div>
              </details>
            );
          })}
      </div>
    );
  if (section === "Promoción") {
    const p = content.promotion;
    if (!p)
      return (
        <button
          onClick={() =>
            set("promotion", {
              id: uid(),
              name: "Nueva promoción",
              text: "",
              image: "",
              buttonText: "Conocer más",
              url: "/recomendados",
              start: new Date().toISOString().slice(0, 10),
              end: "2030-12-31",
              active: false,
            })
          }
        >
          Crear espacio promocional
        </button>
      );
    const patch = (v: Partial<typeof p>) => set("promotion", { ...p, ...v });
    return (
      <div className="form-grid">
        <p className="notice">
          Solo se muestra un espacio patrocinado, dentro de las fechas elegidas.
        </p>
        <Check
          label="Activo"
          value={p.active}
          onChange={(active) => patch({ active })}
        />
        <Field
          label="Título / nombre del negocio"
          value={p.name}
          onChange={(name) => patch({ name })}
        />
        <Field
          label="Texto breve"
          value={p.text}
          onChange={(text) => patch({ text })}
        />
        <ImageField
          label="Imagen"
          value={p.image}
          onChange={(image) => patch({ image })}
        />
        <div className="two-col">
          <Field
            label="Texto del botón"
            value={p.buttonText}
            onChange={(buttonText) => patch({ buttonText })}
          />
          <Field
            label="Enlace"
            value={p.url}
            onChange={(url) => patch({ url })}
          />
          <Field
            label="Inicio"
            value={p.start}
            type="date"
            onChange={(start) => patch({ start })}
          />
          <Field
            label="Fin"
            value={p.end}
            type="date"
            onChange={(end) => patch({ end })}
          />
        </div>
        <button
          className="danger secondary"
          onClick={() => {
            if (confirm("¿Eliminar promoción?")) set("promotion", null);
          }}
        >
          Eliminar promoción
        </button>
      </div>
    );
  }
  if (section === "Recomendados")
    return (
      <>
        {content.partners.map((p) => {
          const patch = (v: Partial<typeof p>) =>
            set(
              "partners",
              content.partners.map((x) => (x.id === p.id ? { ...x, ...v } : x)),
            );
          return (
            <details className="edit-card" key={p.id}>
              <summary>{p.name}</summary>
              <div className="form-grid">
                <Check
                  label="Visible"
                  value={p.active}
                  onChange={(active) => patch({ active })}
                />
                <Field
                  label="Nombre"
                  value={p.name}
                  onChange={(name) => patch({ name })}
                />
                <Field
                  label="Ruta (sin espacios)"
                  value={p.slug}
                  onChange={(slug) => patch({ slug })}
                />
                <label>
                  Categoría
                  <select
                    value={p.category}
                    onChange={(e) => patch({ category: e.target.value })}
                  >
                    {[
                      "Dónde quedarse",
                      "Cabañas",
                      "Cafeterías",
                      "Panoramas",
                      "Turismo",
                      "Servicios",
                      "Comercio local",
                      "Transporte",
                      "Otros",
                      ...(content.allowDining ? ["Dónde comer"] : []),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Descripción"
                  value={p.description}
                  onChange={(description) => patch({ description })}
                />
                <ImageField
                  label="Imagen principal"
                  value={p.image}
                  onChange={(image) => patch({ image })}
                />
                <Field
                  label="Ubicación"
                  value={p.location}
                  onChange={(location) => patch({ location })}
                />
                <Field
                  label="Enlace Google Maps"
                  value={p.mapsUrl}
                  onChange={(mapsUrl) => patch({ mapsUrl })}
                />
                <h3>Productos o servicios</h3>
                {p.catalog.map((item, i) => (
                  <div className="edit-card" key={i}>
                    <Field
                      label="Nombre del servicio"
                      value={item.name}
                      onChange={(name) =>
                        patch({
                          catalog: p.catalog.map((x, j) =>
                            j === i ? { ...x, name } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Descripción del servicio"
                      value={item.description}
                      onChange={(description) =>
                        patch({
                          catalog: p.catalog.map((x, j) =>
                            j === i ? { ...x, description } : x,
                          ),
                        })
                      }
                    />
                    <ImageField
                      label="Imagen del servicio"
                      value={item.image}
                      onChange={(image) =>
                        patch({
                          catalog: p.catalog.map((x, j) =>
                            j === i ? { ...x, image } : x,
                          ),
                        })
                      }
                    />
                    <button
                      className="secondary danger"
                      onClick={() =>
                        patch({ catalog: p.catalog.filter((_, j) => i !== j) })
                      }
                    >
                      Quitar servicio
                    </button>
                  </div>
                ))}
                <button
                  className="secondary"
                  onClick={() =>
                    patch({
                      catalog: [
                        ...p.catalog,
                        { name: "Nuevo servicio", description: "", image: "" },
                      ],
                    })
                  }
                >
                  Añadir servicio
                </button>
                <h3>Botones de contacto</h3>
                <ButtonsEditor
                  buttons={p.buttons}
                  onChange={(buttons) => patch({ buttons })}
                />
                <button
                  className="secondary danger"
                  onClick={() => {
                    if (confirm("¿Eliminar este negocio?"))
                      set(
                        "partners",
                        content.partners.filter((x) => x.id !== p.id),
                      );
                  }}
                >
                  Eliminar negocio
                </button>
              </div>
            </details>
          );
        })}
        <button
          className="secondary"
          onClick={() => {
            const id = uid();
            set("partners", [
              ...content.partners,
              {
                id,
                slug: `nuevo-${id}`,
                name: "Nuevo negocio",
                category: "Servicios",
                description: "",
                image: "",
                location: "",
                mapsUrl: "",
                active: false,
                catalog: [],
                buttons: [],
              },
            ]);
          }}
        >
          Añadir negocio
        </button>
      </>
    );
  return null;
}
