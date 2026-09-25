import AuthPanel from "../account/AuthPanel";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  LogOut,
  Save,
  Settings2,
  UtensilsCrossed,
} from "lucide-react";
import { contentSchema, type Content, type Role } from "../../../shared/schema";
import { canManage } from "../../../shared/rules";
import { api, setCsrf } from "../api";
import { ErrorNotice } from "../components";
import Editor from "./Editor";
import DraftPreview from "./DraftPreview";
import { draftChanges } from "./draftChanges";
import {
  Audit,
  FeedbackAdmin,
  Reports,
  ReservationsAdmin,
  Tables,
  Users,
} from "./Operations";
type User = { id: string; email: string; role: Role; csrf: string };
const contentSections = [
  "General",
  "Diseño",
  "Bloques",
  "Botones",
  "Categorías",
  "Productos",
  "Promoción",
  "Recomendados",
];
export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [publicBrand, setPublicBrand] = useState({name:"Cocinería Mary",logo:""});
  const [version, setVersion] = useState(0);
  const [section, setSection] = useState("Productos");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedContent, setSavedContent] = useState<Content | null>(null);
  const dirty =
    !!content &&
    !!savedContent &&
    draftChanges(savedContent, content).length > 0;
  function acceptUser(u: User) {
    setCsrf(u.csrf);
    setUser(u);
    if (u.role === "personal") setSection("Mesas");
  }
  useEffect(() => {
    api<User>("/auth/me")
      .then(acceptUser)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if(!user)return;
    let active=true;
    api<{content:Pick<Content,"name"|"logo">}>("/content").then(({content})=>{if(active)setPublicBrand({name:content.name,logo:content.logo});}).catch(()=>{});
    return ()=>{active=false;};
  },[user]);
  useEffect(() => {
    if (!user || !canManage(user.role, "content")) return;
    api<{ content: Content; version: number }>("/admin/content")
      .then((r) => {
        setContent(r.content);
        setSavedContent(r.content);
        setVersion(r.version);
      })
      .catch((e) => setError(e.message));
  }, [user]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  if (!loaded) return <div className="loading">Abriendo administración…</div>;
  if (user?.role === "cliente")
    return (
      <main className="login-page">
        <h1>Tu cuenta de cliente</h1>
        <p>
          Esta cuenta permite reservar. La administración es exclusiva del
          equipo del restaurante.
        </p>
        <a className="button-link" href="/cuenta">
          Ir a mi cuenta
        </a>
      </main>
    );
  if (!user)
    return (
      <main className="login-page">
        <a className="back-link" href="/">
          ← Volver a la carta
        </a>
        <AuthPanel allowRegister={false} onAuthenticated={acceptUser} />
      </main>
    );
  const sections = [
    ...(canManage(user.role, "content") ? contentSections : []),
    "Mesas",
    "Reservas",
    "Opiniones",
    ...(canManage(user.role, "reports") ? ["Estadísticas", "Auditoría"] : []),
    ...(canManage(user.role, "users") ? ["Usuarios"] : []),
  ];
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="brand" href="/" target="_blank" rel="noreferrer">
          <img src={(savedContent ?? publicBrand).logo || "/brand.svg"} width={40} height={40} alt="" />
          {(savedContent ?? publicBrand).name}
        </a>
        <span className="eyebrow">ADMINISTRACIÓN</span>
        <nav aria-label="Administración">
          {sections.map((s) => (
            <button
              key={s}
              className={s === section ? "active" : ""}
              onClick={() => {
                setSection(s);
                setMessage("");
              }}
            >
              {s === "Productos" ? (
                <UtensilsCrossed size={17} />
              ) : (
                <Settings2 size={17} />
              )}{" "}
              {s}
            </button>
          ))}
        </nav>
        <div className="admin-user">
          <strong>{user.email}</strong>
          <small>{user.role}</small>
          <button
            className="text-button"
            onClick={async () => {
              if (dirty && !confirm("Hay cambios sin guardar. ¿Cerrar sesión?"))
                return;
              try {
                await api("/auth/logout", { method: "POST", body: "{}" });
              } catch (e) {
                setError((e as Error).message);
                return;
              }
              setUser(null);
              setContent(null);
              setSavedContent(null);
              setCsrf("");
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-heading">
          <div>
            <span className="eyebrow">TU RESTAURANTE</span>
            <h1>{section}</h1>
          </div>
          <a
            href="/"
            className="secondary button-link"
            target="_blank"
            rel="noreferrer"
          >
            Ver página <ExternalLink size={16} />
          </a>
        </header>
        <ErrorNotice message={error} />
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {contentSections.includes(section) && content && (
          <>
            <div className="save-bar">
              <span>
                {dirty ? "Tienes cambios sin guardar" : "Todo está guardado"}
              </span>
              <button
                className="secondary"
                disabled={!dirty || busy}
                onClick={() => {
                  if (confirm("¿Descartar los cambios sin guardar?")) {
                    setContent(savedContent);
                    setError("");
                    setMessage("Cambios descartados.");
                  }
                }}
              >
                Descartar
              </button>
              <button
                disabled={!dirty || busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    const validated = contentSchema.safeParse(content);
                    if (!validated.success)
                      throw new Error(validated.error.issues[0].message);
                    const r = await api<{ version: number; content: Content }>(
                      "/admin/content",
                      {
                        method: "PUT",
                        body: JSON.stringify({ version, content }),
                      },
                    );
                    setVersion(r.version);
                    setContent((current) =>
                      current === content ? r.content : current,
                    );
                    setSavedContent(r.content);
                    setMessage("Cambios guardados. Ya se ven en tu página.");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Save size={16} />
                {busy ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
            <div className="editor-with-preview">
              <fieldset disabled={busy} className="editor-panel">
                <Editor
                  section={section}
                  content={content}
                  onChange={(c) => {
                    setContent(c);
                    setMessage("");
                  }}
                />
              </fieldset>
              {savedContent && (
                <DraftPreview
                  content={content}
                  saved={savedContent}
                  section={section}
                />
              )}
            </div>
          </>
        )}
        {section === "Mesas" && <Tables />}
        {section === "Reservas" && <ReservationsAdmin />}
        {section === "Opiniones" && <FeedbackAdmin />}
        {section === "Estadísticas" && (
          <Reports partners={content?.partners || []} />
        )}{" "}
        {section === "Auditoría" && <Audit />}
        {section === "Usuarios" && <Users />}
      </main>
    </div>
  );
}
