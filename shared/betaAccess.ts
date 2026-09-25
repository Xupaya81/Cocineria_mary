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
  const domain = env.BETA_ACCESS_TEAM_DOMAIN || "";
  const audience = env.BETA_ACCESS_AUD || "";
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) ||
    !audience ||
    audience.startsWith("REPLACE")
  )
    return false;
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) return false;
  try {
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
    return true;
  } catch {
    return false;
  }
}
