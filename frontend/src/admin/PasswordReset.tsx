import { useState } from "react";
import { api } from "../api";
import { ErrorNotice } from "../components";

export default function PasswordReset() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="edit-card">
      <h3>Restablecer una contraseña</h3>
      <p>
        Verifica personalmente la identidad del titular. Se cerrarán todas sus
        sesiones. Entrega la nueva contraseña por un canal privado acordado con
        esa persona.
      </p>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const values = new FormData(form);
          if (values.get("newPassword") !== values.get("confirmation")) {
            setError("Las contraseñas nuevas no coinciden.");
            return;
          }
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const result = await api<{ signedOut: boolean }>(
              "/admin/users/reset-password",
              {
                method: "POST",
                body: JSON.stringify({
                  email: values.get("email"),
                  currentPassword: values.get("currentPassword"),
                  newPassword: values.get("newPassword"),
                }),
              },
            );
            form.reset();
            if (result.signedOut) {
              window.location.assign("/cuenta");
              return;
            }
            setMessage(
              "Contraseña restablecida y sesiones cerradas. La acción quedó registrada.",
            );
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Correo de la cuenta
          <input required name="email" type="email" autoComplete="off" />
        </label>
        <label>
          Tu contraseña de superadmin
          <input
            required
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
          />
        </label>
        <label>
          Nueva contraseña (mínimo 14 caracteres)
          <input
            required
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={14}
            maxLength={128}
          />
        </label>
        <label>
          Repite la nueva contraseña
          <input
            required
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={14}
            maxLength={128}
          />
        </label>
        <ErrorNotice message={error} />
        <p role="status">{message}</p>
        <button disabled={busy}>
          {busy ? "Restableciendo…" : "Restablecer y cerrar sesiones"}
        </button>
      </form>
    </section>
  );
}
