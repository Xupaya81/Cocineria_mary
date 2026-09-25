import { HTTPException } from "hono/http-exception";
export interface StorageProvider {
  put(key: string, data: ArrayBuffer, mime: string): Promise<void>;
  get(key: string): Promise<R2ObjectBody | null>;
}
export class R2StorageProvider implements StorageProvider {
  constructor(private bucket: R2Bucket) {}
  async put(key: string, data: ArrayBuffer, mime: string) {
    await this.bucket.put(key, data, {
      httpMetadata: {
        contentType: mime,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }
  get(key: string) {
    return this.bucket.get(key);
  }
}
export async function validateImage(file: File) {
  if (file.size > 5 * 1024 * 1024 || file.size < 12)
    throw new HTTPException(400, {
      message: "La imagen debe pesar como máximo 5 MB.",
    });
  const data = await file.arrayBuffer();
  const b = new Uint8Array(data);
  const format =
    b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
      ? "jpeg"
      : b.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
        ? "png"
        : String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...b.slice(8, 12)) === "WEBP"
          ? "webp"
          : null;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    !format ||
    file.type !== `image/${format}` ||
    !(format === "jpeg" ? ["jpg", "jpeg"] : [format]).includes(ext || "")
  )
    throw new HTTPException(400, {
      message:
        "Usa una imagen JPG, PNG o WebP válida. No se admiten SVG subidos.",
    });
  return { data, mime: `image/${format}`, extension: format };
}
