import type { Content } from "../../../shared/schema";
import { fontOptions, themePresets, type FontKey } from "../../../shared/theme";
import { Field } from "./Fields";
export default function ThemeEditor({
  content,
  onChange,
}: {
  content: Content;
  onChange: (c: Content) => void;
}) {
  const set = <K extends keyof Content>(key: K, value: Content[K]) =>
    onChange({ ...content, [key]: value });
  return (
    <div className="form-grid">
      <div>
        <h2 className="editor-title">Hazla tuya</h2>
        <p className="muted">
          Elige letras y colores para toda la web. Tu borrador se verá al lado
          antes de publicarlo.
        </p>
        <div className="theme-presets">
          {themePresets.map((p) => (
            <button
              type="button"
              className="secondary"
              key={p.name}
              onClick={() => onChange({ ...content, ...p.values })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="two-col">
        <label>
          Tipografía de títulos
          <select
            value={content.font}
            onChange={(e) => set("font", e.target.value as FontKey)}
          >
            {Object.entries(fontOptions).map(([key, font]) => (
              <option key={key} value={key}>
                {font.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipografía de textos
          <select
            value={content.bodyFont}
            onChange={(e) => set("bodyFont", e.target.value as FontKey)}
          >
            {Object.entries(fontOptions).map(([key, font]) => (
              <option key={key} value={key}>
                {font.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Fuentes del dispositivo, sin descargas externas. Su apariencia puede
        variar ligeramente según el teléfono.
      </p>
      <div
        className="theme-sample"
        style={{
          background: content.surface,
          color: content.textColor,
          fontFamily: fontOptions[content.bodyFont].css,
        }}
      >
        <h3
          style={{
            fontFamily: fontOptions[content.font].css,
            color: content.headingColor,
          }}
        >
          Un sabor que se siente en casa
        </h3>
        <p style={{ color: content.textColor }}>
          Así se leerán las descripciones y el contenido de tu carta.
        </p>
        <small style={{ color: content.mutedColor }}>
          Texto complementario
        </small>
      </div>
      <h3>Letras y botones</h3>
      <div className="two-col">
        <Field
          label="Color de títulos"
          type="color"
          value={content.headingColor}
          onChange={(v) => set("headingColor", v)}
        />
        <Field
          label="Color de texto"
          type="color"
          value={content.textColor}
          onChange={(v) => set("textColor", v)}
        />
        <Field
          label="Color de texto secundario"
          type="color"
          value={content.mutedColor}
          onChange={(v) => set("mutedColor", v)}
        />
        <Field
          label="Color de texto de botones"
          type="color"
          value={content.buttonTextColor}
          onChange={(v) => set("buttonTextColor", v)}
        />
      </div>
      <h3>Fondos e identidad</h3>
      <div className="two-col">
        <Field
          label="Color principal"
          type="color"
          value={content.primary}
          onChange={(v) => set("primary", v)}
        />
        <Field
          label="Color de acento"
          type="color"
          value={content.secondary}
          onChange={(v) => set("secondary", v)}
        />
        <Field
          label="Fondo de la página"
          type="color"
          value={content.background}
          onChange={(v) => set("background", v)}
        />
        <Field
          label="Fondo de tarjetas"
          type="color"
          value={content.surface}
          onChange={(v) => set("surface", v)}
        />
      </div>
      <p className="notice">
        Al guardar se comprueba el contraste para mantener legibles las letras y
        los botones.
      </p>
    </div>
  );
}
