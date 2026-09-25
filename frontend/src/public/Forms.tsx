import { useEffect, useRef, useState } from "react";
import { Star, CalendarDays } from "lucide-react";
import type { SessionUser } from "../../../shared/schema";
import { api, setCsrf } from "../api";
import { ErrorNotice } from "../components";
type TurnstileAPI = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}
export function BotCheck({
  siteKey,
  action,
  onToken,
}: {
  siteKey?: string;
  action: string;
  onToken: (s: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey) return;
    let widget: string | undefined;
    let disposed = false;
    const render = () => {
      if (!disposed && ref.current && window.turnstile)
        widget = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          action,
          callback: onToken,
          "expired-callback": () => onToken(""),
        });
    };
    if (window.turnstile) render();
    else {
      let script =
        document.querySelector<HTMLScriptElement>("#turnstile-script");
      if (!script) {
        script = document.createElement("script");
        script.id = "turnstile-script";
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render, { once: true });
    }
    return () => {
      disposed = true;
      if (widget) window.turnstile?.remove(widget);
    };
  }, [siteKey, action, onToken]);
  return <div ref={ref} />;
}
export function Feedback({ siteKey }: { siteKey?: string }) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  return (
    <section className="feedback-section section" id="opinion">
      <div>
        <span className="eyebrow">TE ESCUCHAMOS</span>
        <h2>¿Cómo estuvo tu visita?</h2>
        <p>Tu opinión nos ayuda a cocinar una mejor experiencia.</p>
      </div>
      {message ? (
        <p role="status" className="notice">
          {message}
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await api<{ message: string }>("/feedback", {
                method: "POST",
                body: JSON.stringify({
                  rating,
                  comment: f.get("comment"),
                  website: f.get("website"),
                  turnstileToken: token,
                }),
              });
              setMessage(r.message);
            } catch (e) {
              setError((e as Error).message);
              setToken("");
              setAttempt((a) => a + 1);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset className="stars">
            <legend>Califica de 1 a 5 estrellas</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  required
                />
                <Star fill={rating >= n ? "currentColor" : "none"} />
                <span className="sr-only">
                  {n} {n === 1 ? "estrella" : "estrellas"}
                </span>
              </label>
            ))}
          </fieldset>
          <label>
            ¿Algo que quieras contarnos?{" "}
            <span className="muted">(opcional)</span>
            <textarea
              name="comment"
              maxLength={1000}
              rows={3}
              placeholder="Nos encantaría saber…"
            />
          </label>
          <label className="honeypot" aria-hidden="true">
            Sitio web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <BotCheck
            key={attempt}
            siteKey={siteKey}
            action="feedback"
            onToken={setToken}
          />
          <ErrorNotice message={error} />
          <button disabled={busy || !rating}>
            {busy ? "Enviando…" : "Enviar mi opinión"}
          </button>
          <small>Privada y sin crear una cuenta.</small>
        </form>
      )}
    </section>
  );
}
export function Reservations({
  siteKey,
  demo,
}: {
  siteKey?: string;
  demo: boolean;
}) {
  const [access, setAccess] = useState<"loading" | "signed-in" | "guest">(
    "loading",
  );
  useEffect(() => {
    let active = true;
    api<SessionUser>("/auth/me")
      .then((u) => {
        if (active) {
          setCsrf(u.csrf);
          setAccess("signed-in");
        }
      })
      .catch(() => {
        if (active) setAccess("guest");
      });
    return () => {
      active = false;
    };
  }, []);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (access === "loading") return <p role="status">Comprobando tu sesión…</p>;
  if (access === "guest")
    return (
      <section className="form-page card">
        <h1>Reserva con tu cuenta</h1>
        <p>
          Inicia sesión o crea una cuenta para solicitar una mesa y consultar el
          estado de tus reservas.
        </p>
        <a className="button-link" href="/cuenta?next=reservas">
          Iniciar sesión para reservar
        </a>
      </section>
    );
  return (
    <section className="form-page">
      <span className="round-icon">
        <CalendarDays />
      </span>
      <span className="eyebrow">NOS VEMOS EN LA MESA</span>
      <h1>Reserva tu visita</h1>
      <p>
        Cuéntanos cuándo vienes. Confirmaremos tu solicitud antes de tu visita.
      </p>
      {demo && (
        <p className="notice">
          Modo demostración. Estas reservas no son atendidas por el restaurante.
        </p>
      )}
      {message ? (
        <div className="success" role="status">
          <h2>¡Solicitud recibida!</h2>
          <p>{message}</p>
          <a href="/">Volver a la carta</a>
        </div>
      ) : (
        <form
          className="card form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await api<{ message: string }>("/reservations", {
                method: "POST",
                body: JSON.stringify({
                  name: f.get("name"),
                  phone: f.get("phone"),
                  date: f.get("date"),
                  time: f.get("time"),
                  people: Number(f.get("people")),
                  website: f.get("website"),
                  turnstileToken: token,
                }),
              });
              setMessage(r.message);
            } catch (e) {
              setError((e as Error).message);
              setToken("");
              setAttempt((a) => a + 1);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Tu nombre
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label>
            Teléfono de contacto
            <input
              name="phone"
              type="tel"
              required
              maxLength={20}
              autoComplete="tel"
            />
          </label>
          <div className="two-col">
            <label>
              Fecha
              <input name="date" type="date" required />
            </label>
            <label>
              Hora
              <input name="time" type="time" required />
            </label>
          </div>
          <label>
            Personas
            <input
              name="people"
              type="number"
              min={1}
              max={50}
              defaultValue={2}
              required
            />
          </label>
          <p className="muted">
            Hora de Chile continental. Duración prevista: 90 minutos. El
            personal confirmará la disponibilidad y el horario de atención.
          </p>
          <label className="honeypot" aria-hidden="true">
            Sitio web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <BotCheck
            key={attempt}
            siteKey={siteKey}
            action="reservation"
            onToken={setToken}
          />
          <ErrorNotice message={error} />
          <button disabled={busy}>
            {busy ? "Enviando…" : "Solicitar reserva"}
          </button>
          <small>
            Usamos tu nombre y teléfono solo para gestionar esta reserva. Se
            eliminan después de 90 días.
          </small>
        </form>
      )}
    </section>
  );
}
