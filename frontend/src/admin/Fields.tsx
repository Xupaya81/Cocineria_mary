import { useState, useRef, useEffect } from "react";
import { Upload } from "lucide-react";
import { api } from "../api";
import { ErrorNotice } from "../components";
import { randomId } from "../id";
export const uid = () => randomId().slice(0, 8);
export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (s: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);
  return (
    <div className="image-field">
      <Field label={label} value={value} onChange={onChange} />
      <label className="upload">
        <Upload size={16} />
        {busy ? "Subiendo…" : "Subir desde el dispositivo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
              setError("Selecciona una imagen de hasta 20 MB.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const bitmap = await createImageBitmap(file);
              const scale = Math.min(
                1,
                1600 / Math.max(bitmap.width, bitmap.height),
              );
              const canvas = document.createElement("canvas");
              canvas.width = Math.round(bitmap.width * scale);
              canvas.height = Math.round(bitmap.height * scale);
              canvas
                .getContext("2d")!
                .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close();
              const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                  (b) =>
                    b
                      ? resolve(b)
                      : reject(new Error("No pudimos procesar la imagen.")),
                  "image/webp",
                  0.82,
                ),
              );
              const form = new FormData();
              form.set(
                "file",
                new File([blob], `${uid()}.webp`, { type: "image/webp" }),
              );
              const result = await api<{ url: string }>("/admin/media", {
                method: "POST",
                body: form,
              });
              latest.current(result.url);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {value && <img src={value} width={100} height={70} alt="Vista previa" />}
      <ErrorNotice message={error} />
    </div>
  );
}
