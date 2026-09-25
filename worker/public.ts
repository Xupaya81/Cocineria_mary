import { publicContent } from "../shared/publicContent";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  eventSchema,
  feedbackSchema,
  reservationSchema,
  type Table,
  type Reservation,
} from "../shared/schema";
import {
  availableTables,
  localDateTime,
  promotionActive,
} from "../shared/rules";
import type { AppEnv } from "./env";
import { getContent } from "./content";
import { authenticate, digest, rateLimit, verifyBot } from "./security";
import { R2StorageProvider } from "./storage";

export const publicRoutes = new Hono<AppEnv>();
publicRoutes.get("/content", async (c) => {
  const { content, version } = await getContent(c.env);
  const tableId = c.req.query("table");
  const table = tableId
    ? await c.env.DB.prepare(
        "SELECT id,name FROM dining_tables WHERE business_id=? AND id=?",
      )
        .bind(c.env.BUSINESS_ID, tableId)
        .first()
    : null;
  return c.json({
    businessId: c.env.BUSINESS_ID,
    version,
    table,
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY,
    content: publicContent(content),
  });
});
publicRoutes.get("/media/:business/:key", async (c) => {
  if (
    c.req.param("business") !== c.env.BUSINESS_ID ||
    !/^[-\w]+\.(jpeg|png|webp)$/.test(c.req.param("key"))
  )
    throw new HTTPException(404);
  const obj = await new R2StorageProvider(c.env.MEDIA).get(
    `${c.req.param("business")}/${c.req.param("key")}`,
  );
  if (!obj) throw new HTTPException(404, { message: "Imagen no encontrada." });
  c.header(
    "Content-Type",
    obj.httpMetadata?.contentType || "application/octet-stream",
  );
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  c.header("ETag", obj.httpEtag);
  return c.body(obj.body);
});
publicRoutes.post("/reservations", authenticate, async (c) => {
  await rateLimit(c, "reservations", 5, 3600);
  const data = reservationSchema.parse(await c.req.json());
  await verifyBot(c, data.turnstileToken, "reservation");
  let start: number;
  try {
    start = localDateTime(data.date, data.time);
  } catch {
    throw new HTTPException(400, {
      message: "Ese horario no existe en Chile. Elige otro horario.",
    });
  }
  const end = start + 90 * 60000;
  if (start < Date.now() + 15 * 60000 || start > Date.now() + 90 * 86400000)
    throw new HTTPException(400, {
      message:
        "Reserva con al menos 15 minutos de anticipación y hasta 90 días.",
    });
  const tables = (
    await c.env.DB.prepare("SELECT * FROM dining_tables WHERE business_id=?")
      .bind(c.env.BUSINESS_ID)
      .all<Table>()
  ).results;
  const reservations = (
    await c.env.DB.prepare(
      "SELECT table_id,start_at,end_at,status FROM reservations WHERE business_id=? AND start_at<? AND end_at>? AND status IN ('pendiente','confirmada')",
    )
      .bind(c.env.BUSINESS_ID, end, start)
      .all<Reservation>()
  ).results;
  const candidates = availableTables(
    tables,
    reservations,
    data.people,
    start,
    end,
  ).filter((t) => !data.tableId || t.id === data.tableId);
  for (const table of candidates) {
    try {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        "INSERT INTO reservations(id,business_id,table_id,name,phone,start_at,end_at,people,status,created_at,account_id) VALUES(?,?,?,?,?,?,?,?,'pendiente',?,?)",
      )
        .bind(
          id,
          c.env.BUSINESS_ID,
          table.id,
          data.name,
          data.phone,
          start,
          end,
          data.people,
          Date.now(),
          c.get("user").id,
        )
        .run();
      return c.json(
        {
          id,
          message:
            "Solicitud recibida. El restaurante debe confirmar tu reserva.",
        },
        201,
      );
    } catch (error) {
      if (
        !String(error).includes("reservation_overlap") &&
        !String(error).includes("table_capacity")
      )
        throw error;
    }
  }
  throw new HTTPException(409, {
    message:
      "No hay una mesa disponible para ese grupo y horario. Prueba otra hora.",
  });
});
publicRoutes.post("/feedback", async (c) => {
  await rateLimit(c, "feedback", 3, 3600);
  const data = feedbackSchema.parse(await c.req.json());
  await verifyBot(c, data.turnstileToken, "feedback");
  await c.env.DB.prepare(
    "INSERT INTO feedback(id,business_id,rating,comment,created_at) VALUES(?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      c.env.BUSINESS_ID,
      data.rating,
      data.comment,
      Date.now(),
    )
    .run();
  return c.json(
    {
      message:
        "Gracias por contarnos. Tu opinión se enviará de forma privada al restaurante.",
    },
    201,
  );
});
publicRoutes.post("/events", async (c) => {
  await rateLimit(c, "events", 180);
  const event = eventSchema.parse(await c.req.json());
  const { content } = await getContent(c.env);
  let channel = "";
  let valid = false;
  if (event.type === "page_view")
    valid = ["home", "recommendations", "reservations"].includes(event.target);
  if (event.type === "partner_view")
    valid = content.partners.some(
      (p) =>
        p.id === event.target &&
        p.active &&
        (content.allowDining || p.category !== "Dónde comer"),
    );
  if (event.type === "ad_impression" || event.type === "promotion_click")
    valid =
      event.target === content.promotion?.id &&
      promotionActive(content.promotion);
  if (event.type === "table_scan")
    valid = !!(await c.env.DB.prepare(
      "SELECT id FROM dining_tables WHERE business_id=? AND id=?",
    )
      .bind(c.env.BUSINESS_ID, event.target)
      .first());
  if (event.type === "button_click") {
    const [owner, id] = event.target.split("__");
    const buttons =
      owner === c.env.BUSINESS_ID
        ? content.buttons
        : content.partners.find(
            (p) =>
              p.id === owner &&
              p.active &&
              (content.allowDining || p.category !== "Dónde comer"),
          )?.buttons;
    const button = buttons?.find((b) => b.id === id && b.active);
    valid = !!button;
    channel = button?.action || "other";
    if (id === "location") {
      valid =
        owner === c.env.BUSINESS_ID
          ? !!content.mapsUrl
          : !!content.partners.find(
              (p) =>
                p.id === owner &&
                p.active &&
                (content.allowDining || p.category !== "Dónde comer"),
            )?.mapsUrl;
      channel = "maps";
    }
  }
  if (!valid) throw new HTTPException(400, { message: "Evento no válido." });
  const bucket = Math.floor(Date.now() / 1800000);
  const sessionHash = await digest(
    `${c.env.RATE_LIMIT_SECRET || "local"}:${event.session}:${bucket}`,
  );
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO events(id,business_id,type,target,channel,session_hash,bucket,created_at) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      c.env.BUSINESS_ID,
      event.type,
      event.target,
      channel,
      sessionHash,
      bucket,
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});
