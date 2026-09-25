import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { ZodError } from "zod";
import type { AppEnv, Env } from "./env";
import { security } from "./security";
import { publicRoutes } from "./public";
import { adminRoutes } from "./admin";
import { authRoutes, accountRoutes } from "./auth";
const app = new Hono<AppEnv>();
app.use("*", security);
app.use(
  "*",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: "El archivo supera el límite permitido." }, 413),
  }),
);
app.use("*", async (c, next) => {
  if (
    !c.req.path.endsWith("/media") &&
    ["POST", "PUT", "PATCH"].includes(c.req.method)
  ) {
    const bytes = await c.req.arrayBuffer();
    if (bytes.byteLength > 512000)
      return c.json({ error: "Contenido demasiado grande." }, 413);
  }
  await next();
});
app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api", publicRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/account", accountRoutes);
app.route("/api/admin", adminRoutes);
app.notFound((c) => c.json({ error: "No encontramos este recurso." }, 404));
app.onError((error, c) => {
  if (error instanceof SyntaxError)
    return c.json({ error: "El formato de la solicitud no es válido." }, 400);
  if (error instanceof ZodError)
    return c.json(
      { error: error.issues[0]?.message || "Revisa los datos ingresados." },
      400,
    );
  if (error instanceof HTTPException)
    return c.json(
      { error: error.message || "No se pudo completar la acción." },
      error.status,
    );
  if (
    /reservation_overlap|table_capacity|table_has_reservations|FOREIGN KEY constraint/.test(
      String(error),
    )
  )
    return c.json(
      { error: "La mesa tiene reservas incompatibles con este cambio." },
      409,
    );
  if (/UNIQUE constraint|account_email_unavailable/.test(String(error)))
    return c.json({ error: "Ya existe un registro con esos datos." }, 409);
  // Deliberately do not log database parameters, request bodies or secrets.
  console.error("request_failed", { path: c.req.path, kind: error.name });
  return c.json(
    { error: "No pudimos completar la solicitud. Inténtalo otra vez." },
    500,
  );
});
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM customer_sessions WHERE expires_at<?").bind(
        now,
      ),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM events WHERE created_at<?").bind(
        now - 90 * 86400000,
      ),
      env.DB.prepare("DELETE FROM reservations WHERE end_at<?").bind(
        now - 90 * 86400000,
      ),
      env.DB.prepare("DELETE FROM feedback WHERE created_at<?").bind(
        now - 180 * 86400000,
      ),
      env.DB.prepare("DELETE FROM audit_log WHERE created_at<?").bind(
        now - 365 * 86400000,
      ),
    ]);
  },
};
