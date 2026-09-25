import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import type { Context } from "hono";
import type { AppEnv, User } from "./env";
import { loginSchema, registrationSchema } from "../shared/schema";
import {
  authenticate,
  digest,
  passwordHash,
  rateLimit,
  token,
  verifyPassword,
  verifyBot,
} from "./security";

/** Creates the same protected cookie for customers and staff; privileges come from the database. */
async function startSession(
  c: Context<AppEnv>,
  user: Pick<User, "id" | "email" | "role">,
) {
  const raw = token(),
    csrf = token();
  const statement =
    user.role === "cliente"
      ? "INSERT INTO customer_sessions(token_hash,customer_id,csrf,expires_at) VALUES(?,?,?,?)"
      : "INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)";
  await c.env.DB.prepare(statement)
    .bind(await digest(raw), user.id, csrf, Date.now() + 8 * 3600000)
    .run();
  setCookie(
    c,
    c.env.ENVIRONMENT === "production" ? "__Host-mary_session" : "mary_session",
    raw,
    {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === "production",
      sameSite: "Strict",
      path: "/",
      maxAge: 8 * 3600,
    },
  );
  return { id: user.id, email: user.email, role: user.role, csrf };
}
export const authRoutes = new Hono<AppEnv>();
authRoutes.post("/login", async (c) => {
  const data = loginSchema.parse(await c.req.json());
  await rateLimit(c, "login", 5, 900, data.email);
  const user = await c.env.DB.prepare(
    "SELECT id,business_id,email,password_hash,role FROM users WHERE email=? AND business_id=? UNION ALL SELECT id,business_id,email,password_hash,'cliente' AS role FROM customers WHERE email=? AND business_id=?",
  )
    .bind(data.email, c.env.BUSINESS_ID, data.email, c.env.BUSINESS_ID)
    .first<User & { password_hash: string }>();
  const fallback =
    "scrypt$16384$8$5$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
  const ok = await verifyPassword(
    data.password,
    user?.password_hash || fallback,
  );
  if (!user || !ok)
    throw new HTTPException(401, {
      message: "Correo o contraseña incorrectos.",
    });
  return c.json(await startSession(c, user));
});
authRoutes.post("/register", async (c) => {
  const data = registrationSchema.parse(await c.req.json());
  await rateLimit(c, "register", 5, 3600, data.email);
  await verifyBot(c, data.turnstileToken, "register");
  const id = crypto.randomUUID();
  const hash = await passwordHash(data.password);
  try {
    await c.env.DB.prepare(
      "INSERT INTO customers(id,business_id,email,password_hash,created_at) VALUES(?,?,?,?,?)",
    )
      .bind(id, c.env.BUSINESS_ID, data.email, hash, Date.now())
      .run();
  } catch (error) {
    if (/UNIQUE constraint|account_email_unavailable/.test(String(error)))
      throw new HTTPException(409, {
        message:
          "No se pudo crear la cuenta con ese correo. Intenta iniciar sesión o usa otro.",
      });
    throw error;
  }
  return c.json(
    await startSession(c, { id, email: data.email, role: "cliente" }),
    201,
  );
});
authRoutes.use("*", authenticate);
authRoutes.get("/me", (c) => c.json(c.get("user")));
authRoutes.post("/logout", async (c) => {
  const name =
    c.env.ENVIRONMENT === "production" ? "__Host-mary_session" : "mary_session";
  const hash = await digest(getCookie(c, name) || "");
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash),
    c.env.DB.prepare("DELETE FROM customer_sessions WHERE token_hash=?").bind(
      hash,
    ),
  ]);
  deleteCookie(c, name, {
    path: "/",
    secure: c.env.ENVIRONMENT === "production",
  });
  return c.json({ ok: true });
});
export const accountRoutes = new Hono<AppEnv>();
accountRoutes.use("*", authenticate);
accountRoutes.get("/reservations", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT id,name,start_at,end_at,people,status FROM reservations WHERE business_id=? AND account_id=? ORDER BY start_at DESC LIMIT 100",
      )
        .bind(c.env.BUSINESS_ID, c.get("user").id)
        .all()
    ).results,
  ),
);
