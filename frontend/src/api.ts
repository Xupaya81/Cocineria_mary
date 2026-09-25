import type { EventInput } from "../../shared/schema";
import { randomId } from "./id";
export let csrf = "";
export const setCsrf = (value: string) => {
  csrf = value;
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const body = (await res.json()) as { error?: string };
  if (!res.ok)
    throw new Error(
      body.error || "No fue posible conectar. Inténtalo nuevamente.",
    );
  return body as T;
}
export function track(type: EventInput["type"], target: string) {
  if (location.pathname === "/admin/preview") return;
  try {
    const now = Date.now();
    const stored = sessionStorage.getItem("mary-analytics");
    let session = stored
      ? (JSON.parse(stored) as { id: string; expires: number })
      : null;
    if (!session || session.expires < now) {
      session = { id: randomId(), expires: now + 1800000 };
      sessionStorage.setItem("mary-analytics", JSON.stringify(session));
    }
    void api("/events", {
      method: "POST",
      body: JSON.stringify({ type, target, session: session.id }),
    }).catch(() => {});
  } catch {
    /* Analytics never blocks access to the menu. */
  }
}
