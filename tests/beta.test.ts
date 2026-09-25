import { describe, expect, it } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { verifyBetaAccess } from "../shared/betaAccess";

describe("Acceso a beta cerrada", () => {
  it("rechaza configuración incompleta y ausencia de token", async () => {
    expect(
      await verifyBetaAccess(new Request("https://beta.example"), {}),
    ).toBe(false);
    expect(
      await verifyBetaAccess(new Request("https://beta.example"), {
        BETA_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
        BETA_ACCESS_AUD: "beta",
      }),
    ).toBe(false);
  });
  it("verifica firma, audiencia, emisor y caducidad", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const env = {
      BETA_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
      BETA_ACCESS_AUD: "beta",
    };
    const sign = (aud: string, exp: number) =>
      new SignJWT({})
        .setProtectedHeader({ alg: "RS256" })
        .setIssuer("https://team.cloudflareaccess.com")
        .setAudience(aud)
        .setSubject("tester")
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(privateKey);
    const check = async (token: string) =>
      verifyBetaAccess(
        new Request("https://beta.example", {
          headers: { "Cf-Access-Jwt-Assertion": token },
        }),
        env,
        async () => publicKey,
      );
    const now = Math.floor(Date.now() / 1000);
    expect(await check(await sign("beta", now + 60))).toBe(true);
    expect(await check(await sign("other", now + 60))).toBe(false);
    expect(await check(await sign("beta", now - 60))).toBe(false);
    expect(await check("forged.header.token")).toBe(false);
  });
});
