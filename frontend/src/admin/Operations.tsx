import Dialog from "./Dialog";
import PasswordReset from "./PasswordReset";
import { reservationTransitions } from "../../../shared/rules";
import { useEffect, useState } from "react";
import type { Table, Reservation } from "../../../shared/schema";
import { api } from "../api";
import { ErrorNotice, Empty } from "../components";
import { Field, uid } from "./Editor";
import { metricLabels, type Metric } from "../../../worker/reports";

export function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [qr, setQr] = useState<{
    image: string;
    url: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Table[]>("/admin/tables")
      .then(setTables)
      .catch((e) => setError(e.message));
  }, []);
  async function save(table: Table) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<Table>(`/admin/tables/${table.id}`, {
        method: "PUT",
        body: JSON.stringify(table),
      });
      setTables((t) =>
        t.some((x) => x.id === result.id)
          ? t.map((x) => (x.id === result.id ? result : x))
          : [...t, result],
      );
      setMessage(`${table.name} actualizada.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        El estado refleja la atención actual. Las reservas se gestionan por
        horario y duración.
      </p>
      <ErrorNotice message={error} />
      <p role="status">{message}</p>
      <div className="table-grid">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`table-card ${t.status === "ocupada" ? "occupied" : ""}`}
          >
            <h3>{t.name}</h3>
            <span>
              {t.people} / {t.capacity} personas
            </span>
            <label>
              Estado
              <select
                disabled={busy}
                value={t.status}
                onChange={(e) =>
                  void save({
                    ...t,
                    status: e.target.value as Table["status"],
                    people: e.target.value === "disponible" ? 0 : t.people,
                  })
                }
              >
                {[
                  "disponible",
                  "ocupada",
                  "reservada",
                  "fuera de servicio",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save({
                  ...t,
                  name: String(f.get("name")),
                  capacity: Number(f.get("capacity")),
                  people: Number(f.get("people")),
                });
              }}
            >
              <label>
                Nombre
                <input name="name" defaultValue={t.name} required />
              </label>
              <div className="two-col">
                <label>
                  Capacidad
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={t.capacity}
                    required
                  />
                </label>
                <label>
                  Personas
                  <input
                    name="people"
                    type="number"
                    min={0}
                    max={50}
                    defaultValue={t.people}
                    key={t.people}
                    required
                  />
                </label>
              </div>
              <button className="secondary" disabled={busy}>
                Actualizar
              </button>
            </form>
            <button
              className="text-button"
              onClick={async () => {
                const { toDataURL } = await import("qrcode");
                const url = `${location.origin}/m/${t.id}`;
                setQr({
                  image: await toDataURL(url, { width: 512, margin: 4 }),
                  url,
                  name: t.name,
                });
              }}
            >
              Ver QR de mesa
            </button>
          </div>
        ))}
      </div>
      <button
        className="secondary"
        disabled={busy}
        onClick={() =>
          void save({
            id: uid(),
            name: `Mesa ${tables.length + 1}`,
            capacity: 4,
            people: 0,
            status: "disponible",
          })
        }
      >
        Añadir mesa
      </button>
      {qr && (
        <Dialog onClose={() => setQr(null)}>
          <button autoFocus className="secondary" onClick={() => setQr(null)}>
            Cerrar
          </button>
          <h2>{qr.name}</h2>
          <img
            src={qr.image}
            width={256}
            height={256}
            alt={`QR para ${qr.name}`}
          />
          <p className="break-word">{qr.url}</p>
          <p>Genera los QR definitivos después de configurar el dominio.</p>
          <a download={`qr-${qr.name}.png`} href={qr.image}>
            Descargar QR
          </a>
        </Dialog>
      )}
    </>
  );
}
const dateTime = (n: number) =>
  new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(n);
export function ReservationsAdmin() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Reservation[]>("/admin/reservations")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <p>
        Las solicitudes pendientes también bloquean la mesa durante 90 minutos.
        Cancela las que no se confirmarán.
      </p>
      <a
        className="text-link"
        href="/reservas"
        target="_blank"
        rel="noreferrer"
      >
        Crear una reserva ↗
      </a>
      <ErrorNotice message={error} />
      {!rows.length && <Empty>No hay reservas todavía.</Empty>}
      {rows.map((r) => (
        <article className="edit-card" key={r.id}>
          <h3>
            {r.name} · {r.people} personas
          </h3>
          <p>
            {dateTime(r.start_at)} · Mesa {r.table_id}
          </p>
          <p>{r.phone}</p>
          <label>
            Estado
            <select
              disabled={busy}
              value={r.status}
              onChange={async (e) => {
                const status = e.target.value as Reservation["status"];
                setBusy(true);
                setError("");
                try {
                  await api(`/admin/reservations/${r.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  });
                  setRows((a) =>
                    a.map((x) => (x.id === r.id ? { ...x, status } : x)),
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {[r.status, ...reservationTransitions(r.status, r.start_at)].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
        </article>
      ))}
    </>
  );
}
export function FeedbackAdmin() {
  const [rows, setRows] = useState<
    { id: string; rating: number; comment: string; created_at: number }[]
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api<typeof rows>("/admin/feedback")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <p>Opiniones privadas. No se publican automáticamente.</p>
      <ErrorNotice message={error} />
      {!rows.length && <Empty>Aún no hay opiniones.</Empty>}
      {rows.map((r) => (
        <article className="edit-card" key={r.id}>
          <strong aria-label={`${r.rating} de 5 estrellas`}>
            {"★".repeat(r.rating)}
            {"☆".repeat(5 - r.rating)}
          </strong>
          <p>{r.comment || "Sin comentario"}</p>
          <small>{dateTime(r.created_at)}</small>
        </article>
      ))}
    </>
  );
}
export function Reports({
  partners,
}: {
  partners: { id: string; name: string }[];
}) {
  const [period, setPeriod] = useState("day");
  const [target, setTarget] = useState("");
  const [report, setReport] = useState<{
    rows: Metric[];
    message: string;
    sent: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    setReport(null);
    api<NonNullable<typeof report>>(
      `/admin/reports?period=${period}${target ? `&target=${target}` : ""}`,
    )
      .then((r) => {
        if (active) setReport(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [period, target]);
  return (
    <>
      <div className="two-col">
        <label>
          Período
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="day">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
        </label>
        <label>
          Negocio
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Todo el restaurante</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNotice message={error} />
      <p className="muted">
        Hora de Chile. Eventos repetidos de la misma sesión se deduplican en
        ventanas de 30 minutos. No representan personas únicas ni mensajes
        enviados.
      </p>
      {report && (
        <>
          <div className="metric-grid">
            {report.rows.map((r, i) => (
              <div className="metric-card" key={i}>
                <strong>{r.count}</strong>
                <span>
                  {metricLabels[
                    r.type === "button_click" ? r.channel : r.type
                  ] || r.type}
                </span>
                <small>{r.target}</small>
              </div>
            ))}
          </div>
          {!report.rows.length && (
            <Empty>Las estadísticas aparecerán cuando haya actividad.</Empty>
          )}
          <div className="edit-card">
            <h3>Reporte para compartir</h3>
            <p>{report.message}</p>
            <button
              className="secondary"
              onClick={() => {
                const blob = new Blob([report.message], {
                  type: "text/plain;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `reporte-${period}.txt`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Descargar reporte
            </button>
            <p className="muted">
              No se envió ningún mensaje. Adaptador de prueba listo para
              conectar WhatsApp Business Platform.
            </p>
          </div>
        </>
      )}
    </>
  );
}
export function Audit() {
  const [rows, setRows] = useState<
    { action: string; target: string; created_at: number }[]
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api<typeof rows>("/admin/audit")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <ErrorNotice message={error} />
      {rows.map((r, i) => (
        <p className="block-row" key={i}>
          {r.action} · {r.target}
          <small>{dateTime(r.created_at)}</small>
        </p>
      ))}
    </>
  );
}
export function Users() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("personal");
  return (
    <>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await api("/admin/users", {
              method: "POST",
              body: JSON.stringify({ email, password, role }),
            });
            setMessage("Usuario creado.");
            setEmail("");
            setPassword("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Field label="Correo" type="email" value={email} onChange={setEmail} />
        <Field
          label="Contraseña (mínimo 14 caracteres)"
          type="password"
          value={password}
          onChange={setPassword}
        />
        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {["personal", "propietario", "superadmin"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <ErrorNotice message={error} />
        <p role="status">{message}</p>
        <button>Crear usuario</button>
      </form>
      <PasswordReset />
    </>
  );
}
