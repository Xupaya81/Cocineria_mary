import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export interface BetaEnv {
  BETA_CLOSED?: string;
  BETA_ACCESS_TEAM_DOMAIN?: string;
  BETA_ACCESS_AUD?: string;
}
const keysets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function verifyBetaAccess(
  request: Request,
  env: BetaEnv,
  testKey?: JWTVerifyGetKey,
): Promise<boolean> {
  try {
    await verifyBetaAccessOrThrow(request, env, testKey);
    return true;
  } catch {
    return false;
  }
}

/** Same verification for the barrier and its temporary diagnostic; never logs claims. */
export async function verifyBetaAccessOrThrow(
  request: Request,
  env: BetaEnv,
  testKey?: JWTVerifyGetKey,
): Promise<void> {
  const domain = env.BETA_ACCESS_TEAM_DOMAIN || "";
  const audience = env.BETA_ACCESS_AUD || "";
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) ||
    !audience ||
    audience.startsWith("REPLACE")
  )
    throw new Error("Invalid beta Access configuration");
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) throw new Error("Missing Access assertion header");
  let keys = keysets.get(domain);
  if (!keys) {
    keys = createRemoteJWKSet(
      new URL(`https://${domain}/cdn-cgi/access/certs`),
    );
    keysets.set(domain, keys);
  }
  await jwtVerify(assertion, testKey || keys, {
    issuer: `https://${domain}`,
    audience,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub"],
  });
}
