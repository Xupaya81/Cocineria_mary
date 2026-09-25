import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { PublicData } from "../../shared/schema";
import { api } from "./api";
import { applyTheme } from "./theme";
import PublicApp from "./public/PublicApp";
import "./styles.css";
const Admin = lazy(() => import("./admin/Admin"));
const PreviewApp = lazy(() => import("./admin/PreviewApp"));
function App() {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState("");
  const admin = location.pathname.startsWith("/admin");
  useEffect(() => {
    if (admin) return;
    const table = location.pathname.match(/^\/m\/([\w-]+)$/)?.[1] || "";
    api<PublicData>(`/content${table ? `?table=${table}` : ""}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [admin]);
  useEffect(() => {
    if (!data) return;
    applyTheme(data.content);
  }, [data]);
  if (location.pathname === "/admin/preview")
    return (
      <Suspense
        fallback={<div className="loading">Preparando vista previa…</div>}
      >
        <PreviewApp />
      </Suspense>
    );
  if (admin)
    return (
      <Suspense
        fallback={<div className="loading">Abriendo administración…</div>}
      >
        <Admin />
      </Suspense>
    );
  if (error)
    return (
      <main className="loading">
        <h1>No pudimos abrir la carta</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Reintentar</button>
      </main>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        <img src="/brand.svg" width="70" height="70" alt="" />
        <p>Preparando nuestra carta…</p>
      </div>
    );
  return <PublicApp data={data} />;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
