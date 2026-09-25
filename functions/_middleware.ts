import { verifyBetaAccess, type BetaEnv } from "../shared/betaAccess";

export const onRequest: PagesFunction<BetaEnv> = async ({
  request,
  env,
  next,
}) => {
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
