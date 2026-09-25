import { scryptAsync } from "@noble/hashes/scrypt";
import { getCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { AppEnv, Env, User } from "./env";
import { canManage } from "../shared/rules";

export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
export const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}
export async function passwordHash(password: string) {
  const salt = token().slice(0, 32);
  const hash = await scryptAsync(password, salt, {
    N: 16384,
    r: 8,
    p: 5,
    dkLen: 32,
  });
  return `scrypt$16384$8$5$${salt}$${hex(hash)}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, salt, expected] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    n !== "16384" ||
    r !== "8" ||
    p !== "5" ||
    !salt ||
    !expected
  )
    return false;
  const actual = hex(
    await scryptAsync(password, salt, { N: 16384, r: 8, p: 5, dkLen: 32 }),
  );
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export const security = createMiddleware<AppEnv>(async (c, next) => {
  const production = c.env.ENVIRONMENT === "production";
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
  c.header("Cache-Control", "no-store");
  if (production)
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    const allowed =
      origin === c.env.PUBLIC_ORIGIN ||
      (!production &&
        !!origin &&
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):5173$/.test(
          origin,
        ));
    if (!allowed)
      throw new HTTPException(403, { message: "Origen no autorizado." });
    const type = c.req.header("Content-Type") || "";
    if (
      !type.startsWith("application/json") &&
      !type.startsWith("multipart/form-data")
    )
      throw new HTTPException(415, { message: "Formato no admitido." });
  }
  if (c.req.path === "/api/content" && c.req.method === "GET")
    await visitorSession(c, true);
  await next();
});
export const authenticate = createMiddleware<AppEnv>(async (c, next) => {
  const raw = getCookie(
    c,
    c.env.ENVIRONMENT === "production" ? "__Host-mary_session" : "mary_session",
  );
  if (!raw)
    throw new HTTPException(401, { message: "Inicia sesión para continuar." });
  let user = await c.env.DB.prepare(
    "SELECT u.id,u.business_id,u.email,u.role,s.csrf FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.business_id=?",
  )
    .bind(await digest(raw), Date.now(), c.env.BUSINESS_ID)
    .first<User>();
  if (!user)
    user = await c.env.DB.prepare(
      "SELECT u.id,u.business_id,u.email,'cliente' AS role,s.csrf FROM customer_sessions s JOIN customers u ON s.customer_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.business_id=?",
    )
      .bind(await digest(raw), Date.now(), c.env.BUSINESS_ID)
      .first<User>();
  if (!user)
    throw new HTTPException(401, {
      message: "Tu sesión ha caducado. Vuelve a ingresar.",
    });
  if (
    !["GET", "HEAD"].includes(c.req.method) &&
    c.req.header("X-CSRF-Token") !== user.csrf
  )
    throw new HTTPException(403, {
      message: "Vuelve a cargar la página e inténtalo nuevamente.",
    });
  c.set("user", user);
  await next();
});
export const permit = (area: Parameters<typeof canManage>[1]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!canManage(c.get("user").role, area))
      throw new HTTPException(403, {
        message: "Tu rol no permite esta acción.",
      });
    await next();
  });
export async function rateLimit(
  c: Context<AppEnv>,
  scope: string,
  max: number,
  seconds = 600,
  account?: string,
) {
  if (c.env.ENVIRONMENT === "production" && !c.env.RATE_LIMIT_SECRET)
    throw new HTTPException(503, {
      message: "El servicio está pendiente de configuración.",
    });
  const ip = c.req.header("CF-Connecting-IP") || "local";
  const visitor = await visitorSession(c);
  const user = c.get("user");
  const window = Math.floor(Date.now() / (seconds * 1000));
  // A shared Wi-Fi has a generous aggregate ceiling, not one customer's quota.
  // Cookie-less clients retain the conservative IP quota; rotating cookies is
  // still bounded by the aggregate ceiling. Account limits resist IP rotation.
  const subjects: [string, number][] = [
    [`ip:${ip}`, max * 40],
    [
      user
        ? `user:${user.id}`
        : visitor
          ? `visitor:${visitor}`
          : `anonymous:${ip}`,
      max,
    ],
  ];
  if (account) subjects.push([`account:${account}`, max * 2]);
  const statements = await Promise.all(
    subjects.map(async ([subject]) => {
      const key = await digest(
        `${c.env.RATE_LIMIT_SECRET || "local-development"}:${c.env.BUSINESS_ID}:${scope}:${subject}:${window}`,
      );
      return c.env.DB.prepare(
        "INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits",
      ).bind(key, (window + 1) * seconds * 1000);
    }),
  );
  const rows = await c.env.DB.batch<{ hits: number }>(statements);
  if (
    rows.some((row, i) => (row.results[0]?.hits ?? Infinity) > subjects[i][1])
  ) {
    c.header(
      "Retry-After",
      String(
        Math.max(
          1,
          Math.ceil(((window + 1) * seconds * 1000 - Date.now()) / 1000),
        ),
      ),
    );
    throw new HTTPException(429, {
      message: "Demasiados intentos. Espera unos minutos.",
    });
  }
}

/** Signed, short-lived anonymous abuse token; never used to identify a person. */
async function visitorSession(
  c: Context<AppEnv>,
  issue = false,
): Promise<string | null> {
  const production = c.env.ENVIRONMENT === "production";
  const secret =
    c.env.RATE_LIMIT_SECRET || (!production ? "local-development" : "");
  if (!secret) return null;
  const name = production ? "__Host-mary_visitor" : "mary_visitor";
  const value = await getSignedCookie(c, secret, name);
  if (typeof value === "string") {
    const [id, expiry] = value.split(":");
    if (
      /^[a-f0-9]{64}$/.test(id) &&
      Number(expiry) > Date.now() &&
      Number(expiry) <= Date.now() + 3600000
    )
      return id;
  }
  if (issue)
    await setSignedCookie(
      c,
      name,
      `${token()}:${Date.now() + 3600000}`,
      secret,
      {
        httpOnly: true,
        secure: production,
        sameSite: "Strict",
        path: "/",
        maxAge: 3600,
      },
    );
  return null;
}
export async function verifyBot(
  c: Context<AppEnv>,
  value: string | undefined,
  action: string,
) {
  if (c.env.ENVIRONMENT !== "production" && !c.env.TURNSTILE_SECRET) return;
  if (!c.env.TURNSTILE_SECRET || !value)
    throw new HTTPException(400, {
      message: "Completa la verificación de seguridad.",
    });
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: c.env.TURNSTILE_SECRET,
        response: value,
      }),
    },
  );
  const result = (await response.json()) as {
    success: boolean;
    hostname: string;
    action: string;
  };
  if (
    !result.success ||
    result.hostname !== new URL(c.env.PUBLIC_ORIGIN).hostname ||
    result.action !== action
  )
    throw new HTTPException(400, {
      message: "La verificación ha caducado. Inténtalo otra vez.",
    });
}
export function audit(
  env: Env,
  user: User,
  action: string,
  target: string,
  onlyIfChanged = false,
) {
  return env.DB.prepare(
    onlyIfChanged
      ? "INSERT INTO audit_log(id,business_id,actor_id,action,target,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1"
      : "INSERT INTO audit_log(id,business_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?,?)",
  ).bind(
    crypto.randomUUID(),
    user.business_id,
    user.id,
    action,
    target,
    Date.now(),
  );
}
