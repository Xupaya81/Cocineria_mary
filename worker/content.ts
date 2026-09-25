import { HTTPException } from "hono/http-exception";
import { contentSchema } from "../shared/schema";
import type { Env } from "./env";
export async function getContent(env: Env) {
  const row = await env.DB.prepare(
    "SELECT content,version FROM businesses WHERE id=?",
  )
    .bind(env.BUSINESS_ID)
    .first<{ content: string; version: number }>();
  if (!row)
    throw new HTTPException(503, {
      message: "La carta aún no está configurada.",
    });
  return {
    content: contentSchema.parse(JSON.parse(row.content)),
    version: row.version,
  };
}
