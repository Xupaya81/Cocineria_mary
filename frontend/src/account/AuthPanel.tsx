import { useState } from "react";
import type { SessionUser } from "../../../shared/schema";
import { api, setCsrf } from "../api";
import { ErrorNotice } from "../components";
import { BotCheck } from "../public/Forms";
/** Shared login. Registration always creates a customer, never a staff account. */
export default function AuthPanel({
  onAuthenticated,
  siteKey,
  allowRegister = true,
}: {
  onAuthenticated: (user: SessionUser) => void;
  siteKey?: string;
  allowRegister?: boolean;
}) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [token, setToken] = useState(""),
    [attempt, setAttempt] = useState(0);
  return (
    <form
      className="login-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        const password = String(f.get("password"));
        if (register && password !== f.get("confirmation")) {
          setError("Las contraseñas no coinciden.");
          return;
        }
        setBusy(true);
        try {
          const user = await api<SessionUser>(
            register ? "/auth/register" : "/auth/login",
            {
              method: "POST",
              body: JSON.stringify({
                email: f.get("email"),
                password,
                ...(register
                  ? { website: f.get("website"), turnstileToken: token }
                  : {}),
              }),
            },
          );
          setCsrf(user.csrf);
          onAuthenticated(user);
        } catch (e) {
          setError((e as Error).message);
          setToken("");
          setAttempt((n) => n + 1);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>{register ? "Crea tu cuenta" : "Iniciar sesión"}</h1>
      <p>
        {register
          ? "Tu cuenta te permitirá solicitar reservas y consultar su estado."
          : "Entra con tu correo y contraseña para continuar."}
      </p>
      <label>
        Correo
        <input
          name="email"
          type="email"
          autoComplete="username"
          maxLength={200}
          required
          disabled={busy}
        />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          minLength={register ? 14 : 1}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
          required
          disabled={busy}
        />
      </label>
      {register && (
        <>
          <label>
            Repetir contraseña
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={14}
              maxLength={128}
              required
              disabled={busy}
            />
          </label>
          <small>
            Al menos 14 caracteres. Puedes usar una frase larga que recuerdes.
          </small>
          <label className="honeypot" aria-hidden="true">
            Sitio web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <BotCheck
            key={attempt}
            siteKey={siteKey}
            action="register"
            onToken={setToken}
          />
          <p className="muted">
            Guardamos tu correo para el acceso y relacionamos tus reservas con
            tu cuenta. No enviamos correos de verificación ni mensajes
            automáticos.
          </p>
        </>
      )}
      <ErrorNotice message={error} />
      <button disabled={busy}>
        {busy ? "Un momento…" : register ? "Crear mi cuenta" : "Ingresar"}
      </button>
      {allowRegister && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => {
            setRegister((v) => !v);
            setError("");
            setToken("");
            setAttempt((n) => n + 1);
          }}
        >
          {register ? "Ya tengo una cuenta" : "No tengo cuenta: registrarme"}
        </button>
      )}
    </form>
  );
}
