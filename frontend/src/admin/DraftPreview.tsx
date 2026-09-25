import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Content } from "../../../shared/schema";
import { draftChanges } from "./draftChanges";
export type PreviewMessage = {
  type: "mary:draft";
  content: Content;
  section: string;
};
export default function DraftPreview({
  content,
  saved,
  section,
}: {
  content: Content;
  saved: Content;
  section: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(true);
  const changes = draftChanges(saved, content);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / 390));
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);
  const send = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "mary:draft", content, section } satisfies PreviewMessage,
      location.origin,
    );
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { type: "mary:draft", content, section } satisfies PreviewMessage,
      location.origin,
    );
  }, [content, section, visible]);
  useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "mary:preview-ready"
      )
        frame.current?.contentWindow?.postMessage(
          { type: "mary:draft", content, section } satisfies PreviewMessage,
          location.origin,
        );
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [content, section]);
  return (
    <aside
      className="draft-panel"
      aria-label="Vista previa y cambios pendientes"
    >
      <header>
        <div>
          <span className="eyebrow">ANTES DE GUARDAR</span>
          <h2>Vista previa</h2>
        </div>
        <button
          className="icon-button"
          aria-label={visible ? "Ocultar vista previa" : "Mostrar vista previa"}
          aria-expanded={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </header>
      <p className="draft-hint">
        Solo tú ves este borrador. La sección que editas se resalta en la vista
        móvil.
      </p>
      {visible && (
        <div
          className="draft-viewport"
          ref={viewport}
          style={{ height: 600 * scale }}
        >
          <iframe
            style={{ transform: `scale(${scale})` }}
            ref={frame}
            src="/admin/preview"
            title="Vista previa móvil del borrador"
            onLoad={send}
            className="draft-frame"
          />
        </div>
      )}
      <div className="draft-summary">
        <h3>
          {changes.length
            ? `${changes.length} ${changes.length === 1 ? "cambio pendiente" : "cambios pendientes"}`
            : "Sin cambios pendientes"}
        </h3>
        {changes.length ? (
          <ul>
            {changes.map((c) => (
              <li key={c.id}>
                <strong>{c.label}</strong>
                <span>{c.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Modifica un campo para ver el resultado aquí.</p>
        )}
        <small>Se publican únicamente al guardar los cambios.</small>
      </div>
    </aside>
  );
}
