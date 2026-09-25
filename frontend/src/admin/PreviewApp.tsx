import { useEffect, useState } from "react";
import PublicApp from "../public/PublicApp";
import { applyTheme } from "../theme";
import type { PreviewMessage } from "./DraftPreview";
import { publicContent } from "../../../shared/publicContent";
const blocks: Record<string, string> = {
  General: "hero",
  Diseño: "hero",
  Bloques: "hero",
  Botones: "buttons",
  Categorías: "menu",
  Productos: "menu",
  Promoción: "promotion",
  Recomendados: "recommendations",
};
export default function PreviewApp() {
  const [draft, setDraft] = useState<PreviewMessage | null>(null);
  const [path, setPath] = useState("/");
  const sectionName = draft?.section;
  const ready = !!draft;
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "mary:draft"
      )
        return;
      setDraft(event.data as PreviewMessage);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "mary:preview-ready" }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!draft) return;
    applyTheme(draft.content);
  }, [draft]);
  useEffect(() => {
    setPath("/");
  }, [draft?.section]);
  useEffect(() => {
    if (!draft) return;
    document
      .querySelectorAll(".preview-highlight")
      .forEach((el) => el.classList.remove("preview-highlight"));
    const section = document.querySelector(
      `[data-preview-block="${blocks[draft.section] || "hero"}"]`,
    );
    section?.classList.add("preview-highlight");
  }, [draft, path]);
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-preview-block="${blocks[sectionName || ""] || "hero"}"]`,
      );
      if (el)
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY,
          behavior: "instant",
        });
    });
    return () => cancelAnimationFrame(id);
  }, [sectionName, path, ready]);
  if (!draft)
    return (
      <p className="loading" role="status">
        Preparando vista previa…
      </p>
    );
  const block = draft.content.blocks.find(
    (b) => b.id === blocks[draft.section],
  );
  return (
    <div
      onSubmitCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={(e) => {
        const anchor = (e.target as Element).closest("a");
        if (!anchor) return;
        e.preventDefault();
        e.stopPropagation();
        const url = new URL(anchor.href);
        if (url.origin !== location.origin) return;
        if (url.pathname.startsWith("/admin")) return;
        setPath(url.pathname);
        if (url.hash)
          requestAnimationFrame(() =>
            document.getElementById(url.hash.slice(1))?.scrollIntoView(),
          );
      }}
    >
      {block && !block.visible && (
        <p className="notice">
          Esta sección está oculta. Actívala en Bloques para mostrarla.
        </p>
      )}
      <PublicApp
        data={{
          businessId: "mary",
          version: 0,
          table: null,
          content: publicContent(draft.content),
        }}
        pathOverride={path}
        preview
      />
    </div>
  );
}
