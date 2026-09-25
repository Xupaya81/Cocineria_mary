import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./env";
import {
  audit,
  passwordHash,
  permit,
  rateLimit,
  verifyPassword,
} from "./security";

// Mounted under authenticated admin routes. No public reset or recovery token.
export const passwordResetRoutes = new Hono<AppEnv>();
passwordResetRoutes.post("/reset-password", permit("users"), async (c) => {
  await rateLimit(c, "password-reset", 3, 3600);
  const data = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(200)
        .transform((v) => v.toLowerCase()),
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(14).max(128),
    })
    .strict()
    .parse(await c.req.json());
  const actor = c.get("user");
  const admin = await c.env.DB.prepare(
    "SELECT password_hash FROM users WHERE id=? AND business_id=? AND role='superadmin'",
  )
    .bind(actor.id, actor.business_id)
    .first<{ password_hash: string }>();
  if (
    !admin ||
    !(await verifyPassword(data.currentPassword, admin.password_hash))
  ) {
    await audit(c.env, actor, "password.reset.denied", actor.id).run();
    throw new HTTPException(403, {
      message: "Tu contraseña actual no es correcta.",
    });
  }
  const target = await c.env.DB.prepare(
    "SELECT id,'staff' AS kind FROM users WHERE email=? AND business_id=? UNION ALL SELECT id,'customer' AS kind FROM customers WHERE email=? AND business_id=?",
  )
    .bind(data.email, actor.business_id, data.email, actor.business_id)
    .first<{ id: string; kind: "staff" | "customer" }>();
  if (!target)
    throw new HTTPException(404, {
      message: "No encontramos esa cuenta en este negocio.",
    });
  const hash = await passwordHash(data.newPassword);
  // Static SQL variants; never interpolate client input into SQL.
  await c.env.DB.batch([
    c.env.DB.prepare(
      target.kind === "staff"
        ? "UPDATE users SET password_hash=? WHERE id=? AND business_id=?"
        : "UPDATE customers SET password_hash=? WHERE id=? AND business_id=?",
    ).bind(hash, target.id, actor.business_id),
    audit(c.env, actor, "password.reset", `${target.kind}:${target.id}`, true),
    c.env.DB.prepare(
      target.kind === "staff"
        ? "DELETE FROM sessions WHERE user_id=?"
        : "DELETE FROM customer_sessions WHERE customer_id=?",
    ).bind(target.id),
  ]);
  return c.json({ ok: true, signedOut: target.id === actor.id });
});
