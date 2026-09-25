import { z } from "zod";
import { contrast } from "./contrast";
import { themeDefaults } from "./theme";

export const idSchema = z.string().regex(/^(?!.*__)[a-zA-Z0-9_-]{1,64}$/);
const fontSchema = z.enum([
  "serif",
  "sans",
  "humanist",
  "readable",
  "editorial",
  "mono",
]);
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Selecciona un color válido.");
const text = (max: number) => z.string().trim().max(max);
export const safeUrl = z
  .string()
  .max(1000)
  .refine((value) => {
    if (
      /^\/(?!\/)[a-zA-Z0-9./#?=_%-]*$/.test(value) ||
      /^#[\w-]+$/.test(value) ||
      /^tel:\+?[0-9]{7,15}$/.test(value)
    )
      return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Usa una URL https segura o una ruta interna.");
export const imageUrl = z.union([
  z.literal(""),
  safeUrl.refine(
    (v) => !v.startsWith("tel:") && !v.startsWith("#"),
    "Usa una dirección de imagen válida.",
  ),
]);
export const buttonSchema = z
  .object({
    id: idSchema,
    text: text(60).min(1),
    icon: z.enum([
      "book",
      "instagram",
      "facebook",
      "whatsapp",
      "map",
      "phone",
      "link",
      "star",
      "calendar",
    ]),
    url: safeUrl,
    order: z.number().int().min(0),
    active: z.boolean(),
    style: z.enum(["primary", "outline", "soft"]),
    action: z.enum([
      "link",
      "whatsapp",
      "instagram",
      "facebook",
      "maps",
      "tripadvisor",
      "other",
    ]),
  })
  .refine(
    (b) =>
      b.action !== "whatsapp" ||
      /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(b.url),
    "WhatsApp debe usar un enlace oficial wa.me o api.whatsapp.com.",
  );
export const categorySchema = z.object({
  id: idSchema,
  name: text(60).min(1),
  order: z.number().int().min(0),
  active: z.boolean(),
});
export const productSchema = z.object({
  id: idSchema,
  name: text(100).min(1),
  description: text(500),
  price: z.number().int().min(0).max(10000000),
  image: imageUrl,
  categoryId: idSchema,
  available: z.boolean(),
  tags: z
    .array(z.enum(["destacado", "recomendación", "nuevo", "vegetariano"]))
    .max(4),
  order: z.number().int().min(0),
});
export const blockSchema = z.object({
  id: z.enum([
    "hero",
    "buttons",
    "menu",
    "promotion",
    "recommendations",
    "map",
    "feedback",
    "footer",
  ]),
  visible: z.boolean(),
  order: z.number().int().min(0),
  title: text(100).optional(),
  subtitle: text(300).optional(),
  eyebrow: text(100).optional(),
});
export const promotionSchema = z
  .object({
    id: idSchema,
    name: text(100).min(1),
    text: text(300),
    image: imageUrl,
    buttonText: text(60).min(1),
    url: safeUrl,
    start: z.string().date(),
    end: z.string().date(),
    active: z.boolean(),
  })
  .refine(
    (v) => v.start <= v.end,
    "La fecha final debe ser posterior al inicio.",
  );
export const partnerSchema = z.object({
  id: idSchema,
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  name: text(100).min(1),
  category: text(60).min(1),
  description: text(600),
  image: imageUrl,
  location: text(180),
  mapsUrl: z.union([z.literal(""), safeUrl]),
  active: z.boolean(),
  catalog: z
    .array(
      z.object({
        name: text(100).min(1),
        description: text(200),
        image: imageUrl,
      }),
    )
    .max(12),
  buttons: z.array(buttonSchema).max(20),
});
export const contentSchema = z
  .object({
    name: text(100).min(1),
    description: text(350),
    tagline: text(100),
    logo: imageUrl,
    cover: imageUrl,
    address: text(180),
    hours: text(180),
    mapsUrl: z.union([z.literal(""), safeUrl]),
    primary: colorSchema,
    secondary: colorSchema,
    background: colorSchema,
    font: fontSchema,
    bodyFont: fontSchema.default("sans"),
    textColor: colorSchema.default(themeDefaults.textColor),
    headingColor: colorSchema.default(themeDefaults.headingColor),
    mutedColor: colorSchema.default(themeDefaults.mutedColor),
    buttonTextColor: colorSchema.default(themeDefaults.buttonTextColor),
    surface: colorSchema.default(themeDefaults.surface),
    hideSoldOut: z.boolean(),
    demo: z.boolean(),
    allowDining: z.boolean(),
    blocks: z.array(blockSchema).length(8),
    buttons: z.array(buttonSchema).max(30),
    categories: z.array(categorySchema).max(40),
    products: z.array(productSchema).max(300),
    promotion: promotionSchema.nullable(),
    partners: z.array(partnerSchema).max(100),
  })
  .superRefine((v, ctx) => {
    if (contrast(v.primary, v.buttonTextColor) < 4.5)
      ctx.addIssue({
        code: "custom",
        message:
          "El texto del botón y su color principal necesitan más contraste.",
      });
    for (const bg of [v.background, v.surface])
      for (const [color, label] of [
        [v.textColor, "texto"],
        [v.headingColor, "títulos"],
        [v.mutedColor, "texto secundario"],
      ])
        if (contrast(bg, color) < 4.5)
          ctx.addIssue({
            code: "custom",
            message: `El color de ${label} necesita más contraste con el fondo o las tarjetas.`,
          });
    if (contrast(v.secondary, v.background) < 3)
      ctx.addIssue({
        code: "custom",
        message: "El color secundario necesita más contraste con el fondo.",
      });
    const collections = [
      v.blocks,
      v.buttons,
      v.categories,
      v.products,
      v.partners,
    ];
    if (collections.some((a) => new Set(a.map((x) => x.id)).size !== a.length))
      ctx.addIssue({
        code: "custom",
        message: "Hay identificadores duplicados.",
      });
    if (new Set(v.partners.map((x) => x.slug)).size !== v.partners.length)
      ctx.addIssue({
        code: "custom",
        message: "Las rutas de negocios deben ser únicas.",
      });
    if (
      v.partners.some(
        (p) => new Set(p.buttons.map((b) => b.id)).size !== p.buttons.length,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Un negocio tiene botones con identificadores duplicados.",
      });
    if (
      v.products.some((p) => !v.categories.some((c) => c.id === p.categoryId))
    )
      ctx.addIssue({
        code: "custom",
        message: "Cada producto debe tener una categoría existente.",
      });
  });
export type Content = z.infer<typeof contentSchema>;
export type LinkButton = z.infer<typeof buttonSchema>;
export type Product = z.infer<typeof productSchema>;
export const roleSchema = z.enum(["superadmin", "propietario", "personal"]);
export type Role = z.infer<typeof roleSchema> | "cliente";
export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  csrf: string;
};
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});
export const registrationSchema = loginSchema
  .extend({
    password: z
      .string()
      .min(14, "Usa al menos 14 caracteres para tu contraseña.")
      .max(128),
    website: z.string().max(0).optional(),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();
export const tableSchema = z
  .object({
    id: idSchema,
    name: text(40).min(1),
    capacity: z.number().int().min(1).max(50),
    people: z.number().int().min(0).max(50),
    status: z.enum(["disponible", "ocupada", "reservada", "fuera de servicio"]),
  })
  .refine((v) => v.people <= v.capacity, "La ocupación supera la capacidad.");
export type Table = z.infer<typeof tableSchema>;
export const reservationSchema = z.object({
  name: text(100).min(2),
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{7,20}$/)
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Ingresa un teléfono válido."),
  date: z.string().date(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  people: z.number().int().min(1).max(50),
  tableId: idSchema.optional(),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().max(2048).optional(),
});
export const reservationStatus = z.enum([
  "pendiente",
  "confirmada",
  "cancelada",
  "finalizada",
]);
export type Reservation = {
  id: string;
  business_id: string;
  table_id: string;
  name: string;
  phone: string;
  start_at: number;
  end_at: number;
  people: number;
  status: z.infer<typeof reservationStatus>;
};
export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: text(1000),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().max(2048).optional(),
});
export const eventSchema = z.object({
  type: z.enum([
    "page_view",
    "partner_view",
    "ad_impression",
    "promotion_click",
    "button_click",
    "table_scan",
  ]),
  target: z
    .string()
    .max(130)
    .refine(
      (v) =>
        v.split("__").length <= 2 &&
        v.split("__").every((part) => idSchema.safeParse(part).success),
      "Destino del evento no válido.",
    ),
  session: z.string().uuid(),
});
export type EventInput = z.infer<typeof eventSchema>;
export type PublicData = {
  businessId: string;
  version: number;
  content: Content;
  table: Table | null;
  turnstileSiteKey?: string;
};
