import { useEffect, useState } from "react";
import type { SessionUser } from "../../../shared/schema";
import { canManage } from "../../../shared/rules";
import { api, setCsrf } from "../api";
import { ErrorNotice, Empty } from "../components";
import AuthPanel from "./AuthPanel";
type MyReservation = {
  id: string;
  name: string;
  start_at: number;
  end_at: number;
  people: number;
  status: string;
};
export default function Account({ siteKey }: { siteKey?: string }) {
  const [user, setUser] = useState<SessionUser | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [rows, setRows] = useState<MyReservation[] | null>(null);
  const accept = (u: SessionUser) => {
    setCsrf(u.csrf);
    setUser(u);
  };
  useEffect(() => {
    api<SessionUser>("/auth/me")
      .then(accept)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setRows(null);
    api<MyReservation[]>("/account/reservations")
      .then((r) => {
        if (active) setRows(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user]);
  if (!loaded) return <p role="status">Abriendo tu cuenta…</p>;
  if (!user)
    return (
      <div className="login-page">
        <AuthPanel
          siteKey={siteKey}
          onAuthenticated={(u) => {
            accept(u);
            if (new URLSearchParams(location.search).get("next") === "reservas")
              location.assign("/reservas");
            else location.assign("/cuenta");
          }}
        />
      </div>
    );
  return (
    <section className="account-page">
      <h1>Mi cuenta</h1>
      <p className="break-word">{user.email}</p>
      <div className="account-actions">
        <a className="button-link" href="/reservas">
          Hacer una reserva
        </a>
        {canManage(user.role, "operations") && (
          <a className="button-link secondary" href="/admin">
            Abrir administración
          </a>
        )}
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api("/auth/logout", { method: "POST", body: "{}" });
              setCsrf("");
              location.assign("/cuenta");
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          Cerrar sesión
        </button>
      </div>
      <ErrorNotice message={error} />
      <h2>Mis reservas</h2>
      <p>
        Solo aparecen solicitudes realizadas desde esta cuenta. El restaurante
        debe confirmar las pendientes.
      </p>
      {rows === null && !error && <p role="status">Cargando reservas…</p>}
      {rows?.length === 0 && <Empty>Todavía no tienes reservas.</Empty>}
      {rows?.map((r) => (
        <article className="card" key={r.id}>
          <h3>
            {new Intl.DateTimeFormat("es-CL", {
              timeZone: "America/Santiago",
              dateStyle: "medium",
              timeStyle: "short",
            }).format(r.start_at)}
          </h3>
          <p>
            {r.people} personas · {r.name}
          </p>
          <strong>Estado: {r.status}</strong>
        </article>
      ))}
      <p className="muted">
        Para cambiar o cancelar una solicitud, contacta al restaurante. No hay
        recuperación automática de contraseña por correo en esta beta.
      </p>
    </section>
  );
}
