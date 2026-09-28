import {
  decodeJwt,
  decodeProtectedHeader,
  errors,
  type JWTVerifyGetKey,
} from "jose";
import { verifyBetaAccessOrThrow, type BetaEnv } from "./betaAccess";

const redacted = "[redacted]";
const issuer = (value: unknown) =>
  typeof value === "string" &&
  /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\/?$/.test(value)
    ? value
    : redacted;
const audience = (value: unknown): string | string[] => {
  if (Array.isArray(value))
    return value
      .slice(0, 16)
      .map((v) =>
        typeof v === "string" && /^[a-fA-F0-9]{1,128}$/.test(v) ? v : redacted,
      );
  return typeof value === "string" && /^[a-fA-F0-9]{1,128}$/.test(value)
    ? value
    : redacted;
};

// Only fixed library messages are emitted. Some JOSE errors embed untrusted
// header names, and JWTClaimValidationFailed.payload/cause contains identity.
const safeMessages = new Set([
  "Invalid beta Access configuration",
  "Missing Access assertion header",
  "Invalid Compact JWS",
  "JWS Protected Header is invalid",
  "JWT Claims Set must be a top-level JSON object",
  '"alg" (Algorithm) Header Parameter value not allowed',
  "signature verification failed",
  "no applicable key found in the JSON Web Key Set",
  "multiple matching keys found in the JSON Web Key Set",
  "request timed out",
  "JSON Web Key Set malformed",
  "Expected 200 OK from the JSON Web Key Set HTTP response",
  "Failed to parse the JSON Web Key Set HTTP response as JSON",
]);
function safeError(error: unknown) {
  const name =
    Object.entries(errors).find(
      ([, Type]) => error instanceof Type && error.constructor === Type,
    )?.[0] || "Error";
  const message = error instanceof Error ? error.message : "";
  const fixedClaimMessage =
    /^(?:unexpected "(?:iss|aud|typ)" (?:claim|JWT header) value|missing required "(?:exp|iat|sub)" claim|"(?:exp|iat|nbf)" claim must be a number|"(?:exp|nbf)" claim timestamp check failed)$/;
  return {
    name,
    message:
      safeMessages.has(message) || fixedClaimMessage.test(message)
        ? message
        : "Verification failed; error details redacted to protect sensitive data.",
  };
}

/** TEMPORARY: returns metadata only, even when JWT verification fails. */
export async function accessDiagnostic(
  request: Request,
  env: BetaEnv,
  testKey?: JWTVerifyGetKey,
): Promise<Response> {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
  };
  if (env.BETA_CLOSED !== "true")
    return new Response("Not found", { status: 404, headers });
  if (request.method !== "GET")
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...headers, Allow: "GET" },
    });
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  let decoded: {
    alg: string | null;
    iss: string | null;
    aud: string | string[] | null;
    hasExp: boolean;
    hasIat: boolean;
    hasSub: boolean;
  } | null = null;
  if (assertion) {
    try {
      const protectedHeader = decodeProtectedHeader(assertion);
      const payload = decodeJwt(assertion);
      // Whitelist formats as well as fields: a forged iss/aud/alg must not be
      // able to reflect an email, cookie or an embedded token in this response.
      decoded = {
        alg:
          typeof protectedHeader.alg === "string" &&
          /^(?:RS|PS|ES|HS)(?:256|384|512)$|^(?:EdDSA|Ed25519|none)$/.test(
            protectedHeader.alg,
          )
            ? protectedHeader.alg
            : redacted,
        iss: payload.iss === undefined ? null : issuer(payload.iss),
        aud: payload.aud === undefined ? null : audience(payload.aud),
        hasExp: Object.hasOwn(payload, "exp"),
        hasIat: Object.hasOwn(payload, "iat"),
        hasSub: Object.hasOwn(payload, "sub"),
      };
    } catch {
      /* Malformed JWT: verification below reports a safe error. */
    }
  }
  let error: { name: string; message: string } | null = null;
  try {
    await verifyBetaAccessOrThrow(request, env, testKey);
  } catch (failure) {
    error = safeError(failure);
  }
  return Response.json(
    {
      hasAssertion: assertion !== null,
      decoded,
      expectedIssuer: issuer(`https://${env.BETA_ACCESS_TEAM_DOMAIN || ""}`),
      expectedAudience: audience(env.BETA_ACCESS_AUD),
      verification: error ? "failed" : "ok",
      error,
    },
    { headers },
  );
}
