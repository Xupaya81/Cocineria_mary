import { beforeAll, describe, expect, it, vi } from "vitest";
import { generateKeyPair, SignJWT, errors, type JWTVerifyGetKey } from "jose";
import { accessDiagnostic } from "../shared/accessDiagnostic";
import { verifyBetaAccess } from "../shared/betaAccess";
import { onRequest } from "../functions/_middleware";

const env = {
  BETA_CLOSED: "true",
  BETA_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
  BETA_ACCESS_AUD: "a".repeat(64),
};
const privateIdentity = "private-subject-DO-NOT-RETURN";
const privateEmail = "private-user@example.invalid";
const cookie = "session=private-cookie-DO-NOT-RETURN";
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let resolver: JWTVerifyGetKey;
beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  resolver = async () => keys.publicKey;
});
async function sign(
  aud = env.BETA_ACCESS_AUD,
  exp = Math.floor(Date.now() / 1000) + 120,
) {
  return new SignJWT({
    email: privateEmail,
    name: "PRIVATE-NAME",
    custom: { identity: privateIdentity },
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(`https://${env.BETA_ACCESS_TEAM_DOMAIN}`)
    .setAudience(aud)
    .setSubject(privateIdentity)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(keys.privateKey);
}
function request(
  token?: string,
  path = "/__beta/access-diagnostic",
  method = "GET",
) {
  return new Request(`https://cocineria-mary-beta.pages.dev${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(token ? { "Cf-Access-Jwt-Assertion": token } : {}),
    },
  });
}
async function readSafe(response: Response, token?: string) {
  const text = await response.text();
  for (const secret of [
    token,
    cookie,
    privateIdentity,
    privateEmail,
    "PRIVATE-NAME",
    "turnstile-secret-private",
    "rate-secret-private",
  ].filter(Boolean))
    expect(text).not.toContain(secret!);
  const data = JSON.parse(text);
  expect(Object.keys(data).sort()).toEqual([
    "decoded",
    "error",
    "expectedAudience",
    "expectedIssuer",
    "hasAssertion",
    "verification",
  ]);
  if (data.decoded)
    expect(Object.keys(data.decoded).sort()).toEqual([
      "alg",
      "aud",
      "hasExp",
      "hasIat",
      "hasSub",
      "iss",
    ]);
  expect(text).not.toMatch(
    /"(?:email|sub|cookies|payload|cause|stack|token|identity)"\s*:/,
  );
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  return data;
}
describe("Diagnóstico temporal Access sin identidad", () => {
  it("JWT válido: valida criptográficamente y expone solo metadatos", async () => {
    const token = await sign();
    const response = await accessDiagnostic(
      request(token),
      {
        ...env,
        ...{
          TURNSTILE_SECRET: "turnstile-secret-private",
          RATE_LIMIT_SECRET: "rate-secret-private",
        },
      },
      resolver,
    );
    const data = await readSafe(response, token);
    expect(data.verification).toBe("ok");
    expect(data.error).toBeNull();
    expect(data.decoded).toEqual({
      alg: "RS256",
      iss: `https://${env.BETA_ACCESS_TEAM_DOMAIN}`,
      aud: env.BETA_ACCESS_AUD,
      hasExp: true,
      hasIat: true,
      hasSub: true,
    });
    expect(data.expectedIssuer).toBe(`https://${env.BETA_ACCESS_TEAM_DOMAIN}`);
    expect(data.expectedAudience).toBe(env.BETA_ACCESS_AUD);
  });
  it("AUD distinto: devuelve clase y mensaje JOSE, sin payload/cause", async () => {
    const token = await sign("b".repeat(64));
    const data = await readSafe(
      await accessDiagnostic(request(token), env, resolver),
      token,
    );
    expect(data.verification).toBe("failed");
    expect(data.error).toEqual({
      name: "JWTClaimValidationFailed",
      message: 'unexpected "aud" claim value',
    });
    expect(await verifyBetaAccess(request(token), env, resolver)).toBe(false);
  });
  it("JWT vencido o con firma inválida nunca concede acceso", async () => {
    const expired = await sign(
      env.BETA_ACCESS_AUD,
      Math.floor(Date.now() / 1000) - 60,
    );
    expect(
      (
        await readSafe(
          await accessDiagnostic(request(expired), env, resolver),
          expired,
        )
      ).error.name,
    ).toBe("JWTExpired");
    const token = await sign();
    const different = await generateKeyPair("RS256");
    const data = await readSafe(
      await accessDiagnostic(
        request(token),
        env,
        async () => different.publicKey,
      ),
      token,
    );
    expect(data.error.name).toBe("JWSSignatureVerificationFailed");
    expect(data.verification).toBe("failed");
  });
  it("header ausente o token malformado devuelven diagnóstico seguro", async () => {
    const absent = await readSafe(
      await accessDiagnostic(request(), env, resolver),
    );
    expect(absent.hasAssertion).toBe(false);
    expect(absent.verification).toBe("failed");
    const malformed = `malformed-${privateEmail}-${privateIdentity}`;
    const data = await readSafe(
      await accessDiagnostic(request(malformed), env, resolver),
      malformed,
    );
    expect(data.hasAssertion).toBe(true);
    expect(data.decoded).toBeNull();
    expect(data.verification).toBe("failed");
  });
  it("no refleja identidad colocada en alg/iss/aud de un JWT falsificado", async () => {
    const encode = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString("base64url");
    const token = `${encode({ alg: privateEmail })}.${encode({ iss: privateEmail, aud: [cookie, privateIdentity], sub: privateIdentity, email: privateEmail })}.AA`;
    const data = await readSafe(
      await accessDiagnostic(request(token), env, resolver),
      token,
    );
    expect(data.decoded.alg).toBe("[redacted]");
    expect(data.decoded.iss).toBe("[redacted]");
    expect(data.decoded.aud).toEqual(["[redacted]", "[redacted]"]);
    expect(data.decoded.hasExp).toBe(false);
    expect(data.decoded.hasIat).toBe(false);
    expect(data.verification).toBe("failed");
  });
  it("redacta excepciones que pudieran contener secretos en su mensaje", async () => {
    const token = await sign();
    const result = await accessDiagnostic(request(token), env, async () => {
      throw new errors.JOSENotSupported(
        `${token} ${cookie} ${privateEmail} ${privateIdentity}`,
      );
    });
    const data = await readSafe(result, token);
    expect(data.error.name).toBe("JOSENotSupported");
    expect(data.error.message).toContain("redacted");
  });
  it("el middleware permite solo el diagnóstico exacto; no abre el resto de la aplicación", async () => {
    const next = vi.fn(async () => new Response("PROTECTED CONTENT"));
    const context = (path: string, configuredEnv = env, method = "GET") =>
      ({
        request: request(undefined, path, method),
        env: configuredEnv,
        next,
      }) as unknown as Parameters<typeof onRequest>[0];
    const response = await onRequest(context("/__beta/access-diagnostic"));
    expect(response.status).toBe(200);
    await readSafe(response);
    expect(next).not.toHaveBeenCalled();
    expect((await onRequest(context("/admin"))).status).toBe(403);
    expect(
      (await onRequest(context("/__beta/access-diagnostic/extra"))).status,
    ).toBe(403);
    expect(
      (
        await onRequest(
          context("/__beta/access-diagnostic", {
            ...env,
            BETA_CLOSED: "false",
          }),
        )
      ).status,
    ).toBe(404);
    expect(
      (await onRequest(context("/__beta/access-diagnostic", env, "POST")))
        .status,
    ).toBe(405);
    expect(next).not.toHaveBeenCalled();
  });
});
