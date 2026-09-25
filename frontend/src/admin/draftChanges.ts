import type { Content } from "../../../shared/schema";

const labels: Record<string, string> = {
  name: "nombre",
  tagline: "frase de bienvenida",
  description: "descripción",
  logo: "logo",
  cover: "portada",
  address: "dirección",
  hours: "horario",
  mapsUrl: "ubicación en Maps",
  primary: "color principal",
  secondary: "color secundario",
  background: "fondo",
  font: "tipografía de títulos",
  bodyFont: "tipografía de textos",
  textColor: "color de texto",
  headingColor: "color de títulos",
  mutedColor: "color de texto secundario",
  buttonTextColor: "color de texto de botones",
  surface: "fondo de tarjetas",
  title: "título",
  subtitle: "subtítulo",
  eyebrow: "encabezado",
  hideSoldOut: "visibilidad de agotados",
  demo: "aviso de demostración",
  allowDining: "categoría Dónde comer",
  text: "texto",
  url: "enlace",
  order: "orden",
  active: "visibilidad",
  style: "estilo",
  action: "tipo de acción",
  icon: "icono",
  price: "precio",
  image: "imagen",
  categoryId: "categoría",
  available: "disponibilidad",
  tags: "etiquetas",
  visible: "visibilidad",
  buttonText: "texto del botón",
  start: "fecha de inicio",
  end: "fecha final",
  slug: "ruta",
  category: "categoría",
  location: "ubicación",
  catalog: "catálogo",
  buttons: "botones",
};
export const blockNames: Record<string, string> = {
  hero: "Portada",
  buttons: "Botones",
  menu: "Carta",
  promotion: "Promoción",
  recommendations: "Recomendados",
  map: "Ubicación",
  feedback: "Opiniones",
  footer: "Pie de página",
};
export type DraftChange = { id: string; label: string; detail: string };
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function fields(before: object, after: object) {
  const a = before as Record<string, unknown>,
    b = after as Record<string, unknown>;
  return Object.keys(b)
    .filter((k) => k !== "id" && !equal(a[k], b[k]))
    .map((k) => labels[k] || k)
    .join(", ");
}
export function draftChanges(saved: Content, draft: Content): DraftChange[] {
  const changes: DraftChange[] = [];
  const groups = [
    "blocks",
    "buttons",
    "categories",
    "products",
    "partners",
    "promotion",
  ];
  for (const key of Object.keys(draft) as (keyof Content)[]) {
    if (!groups.includes(key) && !equal(saved[key], draft[key]))
      changes.push({
        id: key,
        label: labels[key] || key,
        detail: "Modificado",
      });
  }
  for (const [key, label] of [
    ["blocks", "Bloque"],
    ["buttons", "Botón"],
    ["categories", "Categoría"],
    ["products", "Producto"],
    ["partners", "Negocio"],
  ] as const) {
    const old = saved[key],
      next = draft[key];
    for (const item of next) {
      const previous = old.find((x) => x.id === item.id);
      const name =
        "name" in item
          ? item.name
          : "text" in item
            ? item.text
            : blockNames[item.id] || item.id;
      if (!previous)
        changes.push({
          id: `${key}:${item.id}`,
          label: `${label}: ${name}`,
          detail: "Añadido",
        });
      else if (!equal(previous, item))
        changes.push({
          id: `${key}:${item.id}`,
          label: `${label}: ${name}`,
          detail: `Cambió: ${fields(previous, item)}`,
        });
    }
    for (const item of old) {
      if (!next.some((x) => x.id === item.id)) {
        const name =
          "name" in item
            ? item.name
            : "text" in item
              ? item.text
              : blockNames[item.id] || item.id;
        changes.push({
          id: `${key}:${item.id}`,
          label: `${label}: ${name}`,
          detail: "Eliminado",
        });
      }
    }
  }
  if (!equal(saved.promotion, draft.promotion))
    changes.push({
      id: "promotion",
      label: "Promoción principal",
      detail: !saved.promotion
        ? "Añadida"
        : !draft.promotion
          ? "Eliminada"
          : `Cambió: ${fields(saved.promotion, draft.promotion)}`,
    });
  return changes;
}
