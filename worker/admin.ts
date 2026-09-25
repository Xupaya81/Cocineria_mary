import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./env";
import {
  audit,
  authenticate,
  passwordHash,
  permit,
  rateLimit,
} from "./security";
import {
  contentSchema,
  reservationStatus,
  roleSchema,
  tableSchema,
} from "../shared/schema";
import { getContent } from "./content";
import { periodStart, reservationTransitions } from "../shared/rules";
import {
  PreviewReportDeliveryProvider,
  reportMessage,
  type Metric,
} from "./reports";
import { R2StorageProvider, validateImage } from "./storage";
import { passwordResetRoutes } from "./passwordReset";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", authenticate);
adminRoutes.use("*", async (c, next) => {
  if (c.req.method !== "GET") await rateLimit(c, "admin", 100);
  await next();
});
adminRoutes.route("/users", passwordResetRoutes);
adminRoutes.get("/content", permit("content"), async (c) =>
  c.json(await getContent(c.env)),
);
adminRoutes.put("/content", permit("content"), async (c) => {
  const { version, content } = z
    .object({ version: z.number().int().positive(), content: contentSchema })
    .parse(await c.req.json());
  const previous = await getContent(c.env);
  const changes = previous.content.products.flatMap((p) => {
    const next = content.products.find((n) => n.id === p.id);
    return !next
      ? [`product.deleted:${p.id}`]
      : next.price !== p.price
        ? [`price.changed:${p.id}:${p.price}->${next.price}`]
        : [];
  });
  if (
    JSON.stringify(previous.content.promotion) !==
    JSON.stringify(content.promotion)
  )
    changes.push("promotion.modified");
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE businesses SET content=?,version=version+1 WHERE id=? AND version=?",
    ).bind(JSON.stringify(content), c.env.BUSINESS_ID, version),
    audit(
      c.env,
      c.get("user"),
      "content.saved",
      `version:${version + 1};${changes.join(";")}`.slice(0, 4000),
      true,
    ),
  ]);
  if (result[0].meta.changes !== 1)
    throw new HTTPException(409, {
      message: "Otra persona modificó el contenido. Recarga antes de guardar.",
    });
  return c.json({ version: version + 1, content });
});
adminRoutes.get("/tables", permit("operations"), async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT id,name,capacity,people,status FROM dining_tables WHERE business_id=? ORDER BY name",
      )
        .bind(c.env.BUSINESS_ID)
        .all()
    ).results,
  ),
);
adminRoutes.put("/tables/:id", permit("operations"), async (c) => {
  const table = tableSchema.parse(await c.req.json());
  if (table.id !== c.req.param("id")) throw new HTTPException(400);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO dining_tables(business_id,id,name,capacity,people,status) VALUES(?,?,?,?,?,?) ON CONFLICT(business_id,id) DO UPDATE SET name=excluded.name,capacity=excluded.capacity,people=excluded.people,status=excluded.status",
    ).bind(
      c.env.BUSINESS_ID,
      table.id,
      table.name,
      table.capacity,
      table.people,
      table.status,
    ),
    audit(c.env, c.get("user"), "table.updated", table.id),
  ]);
  return c.json(table);
});
adminRoutes.delete("/tables/:id", permit("content"), async (c) => {
  await c.env.DB.batch([
    c.env.DB.prepare(
      "DELETE FROM dining_tables WHERE business_id=? AND id=?",
    ).bind(c.env.BUSINESS_ID, c.req.param("id")),
    audit(c.env, c.get("user"), "table.deleted", c.req.param("id")),
  ]);
  return c.json({ ok: true });
});
adminRoutes.get("/reservations", permit("operations"), async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT * FROM reservations WHERE business_id=? ORDER BY start_at DESC LIMIT 300",
      )
        .bind(c.env.BUSINESS_ID)
        .all()
    ).results,
  ),
);
adminRoutes.patch("/reservations/:id", permit("operations"), async (c) => {
  const data = z
    .object({ status: reservationStatus })
    .parse(await c.req.json());
  const current = await c.env.DB.prepare(
    "SELECT status,start_at FROM reservations WHERE business_id=? AND id=?",
  )
    .bind(c.env.BUSINESS_ID, c.req.param("id"))
    .first<{ status: string; start_at: number }>();
  if (!current)
    throw new HTTPException(404, { message: "Reserva no encontrada." });
  if (
    !reservationTransitions(current.status, current.start_at).includes(
      data.status,
    )
  )
    throw new HTTPException(409, {
      message: "Ese cambio de estado no es válido para esta reserva.",
    });
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE reservations SET status=? WHERE business_id=? AND id=? AND status=?",
    ).bind(data.status, c.env.BUSINESS_ID, c.req.param("id"), current.status),
    audit(
      c.env,
      c.get("user"),
      `reservation.${data.status}`,
      c.req.param("id"),
      true,
    ),
  ]);
  if (!result[0].meta.changes)
    throw new HTTPException(409, {
      message: "La reserva cambió. Actualiza la lista.",
    });
  return c.json({ ok: true });
});
adminRoutes.get("/feedback", permit("operations"), async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT id,rating,comment,created_at FROM feedback WHERE business_id=? ORDER BY created_at DESC LIMIT 200",
      )
        .bind(c.env.BUSINESS_ID)
        .all()
    ).results,
  ),
);
adminRoutes.get("/reports", permit("reports"), async (c) => {
  const period = z
    .enum(["day", "week", "month"])
    .parse(c.req.query("period") || "day");
  const target = c.req.query("target");
  const start = periodStart(period);
  const query = target
    ? c.env.DB.prepare(
        "SELECT type,target,channel,count(*) as count FROM events WHERE business_id=? AND created_at>=? AND (target=? OR target LIKE ? ESCAPE '!') GROUP BY type,target,channel",
      ).bind(
        c.env.BUSINESS_ID,
        start,
        target,
        `${target.replaceAll("!", "!!").replaceAll("_", "!_").replaceAll("%", "!%")}!_!_%`,
      )
    : c.env.DB.prepare(
        "SELECT type,target,channel,count(*) as count FROM events WHERE business_id=? AND created_at>=? GROUP BY type,target,channel",
      ).bind(c.env.BUSINESS_ID, start);
  const rows = (await query.all<Metric>()).results;
  const { content } = await getContent(c.env);
  const preview = await new PreviewReportDeliveryProvider().deliver({
    businessName: target
      ? content.partners.find((p) => p.id === target)?.name || content.name
      : content.name,
    message: reportMessage(rows),
  });
  return c.json({ period, start, rows, ...preview });
});
adminRoutes.get("/audit", permit("reports"), async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT action,target,created_at FROM audit_log WHERE business_id=? ORDER BY created_at DESC LIMIT 100",
      )
        .bind(c.env.BUSINESS_ID)
        .all()
    ).results,
  ),
);
adminRoutes.post("/media", permit("content"), async (c) => {
  await rateLimit(c, "uploads", 20, 3600);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    throw new HTTPException(400, { message: "Selecciona una imagen." });
  const { data, mime, extension } = await validateImage(file);
  const key = `${c.env.BUSINESS_ID}/${crypto.randomUUID()}.${extension}`;
  await new R2StorageProvider(c.env.MEDIA).put(key, data, mime);
  await audit(c.env, c.get("user"), "media.uploaded", key).run();
  return c.json({ url: `/api/media/${key}` }, 201);
});
adminRoutes.post("/users", permit("users"), async (c) => {
  await rateLimit(c, "users", 10, 3600);
  const data = z
    .object({
      email: z.string().email().max(200),
      password: z.string().min(14).max(128),
      role: roleSchema,
    })
    .parse(await c.req.json());
  const id = crypto.randomUUID();
  const hash = await passwordHash(data.password);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO users(id,business_id,email,password_hash,role) VALUES(?,?,?,?,?)",
    ).bind(id, c.env.BUSINESS_ID, data.email.toLowerCase(), hash, data.role),
    audit(c.env, c.get("user"), "user.created", id),
  ]);
  return c.json({ id }, 201);
});
