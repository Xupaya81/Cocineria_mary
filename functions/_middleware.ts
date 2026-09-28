import { verifyBetaAccess, type BetaEnv } from "../shared/betaAccess";
import { accessDiagnostic } from "../shared/accessDiagnostic";

export const onRequest: PagesFunction<BetaEnv> = async ({
  request,
  env,
  next,
}) => {
  // TEMPORARY: only this metadata endpoint can diagnose a rejected assertion.
  // It never calls next() or serves application content. The edge Access policy
  // still applies; all other routes retain the existing cryptographic barrier.
  if (new URL(request.url).pathname === "/__beta/access-diagnostic")
    return accessDiagnostic(request, env);
  if (env.BETA_CLOSED !== "true") return next();
  const response = (await verifyBetaAccess(request, env))
    ? await next()
    : new Response(
        "Beta privada. Accede con una cuenta autorizada por el equipo.",
        {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
  const result = new Response(response.body, response);
  result.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  result.headers.set("Cache-Control", "private, no-store");
  return result;
};
