import { afterAll, beforeAll, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { build } from "esbuild";
import { mkdir, readFile, access } from "node:fs/promises";
import { digest } from "../worker/security";
import { content } from "../scripts/seed-data.mjs";
import { storageCapability } from "../worker/storage";
import type { Env } from "../worker/env";
let mf: Miniflare;
const origin = "https://cocineria-mary-beta.pages.dev";
beforeAll(async () => {
  await mkdir("work", { recursive: true });
  await build({
    entryPoints: ["worker/index.ts"],
    outfile: "work/no-r2-worker.mjs",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: "work/no-r2-worker.mjs",
      compatibilityDate: "2026-09-01",
      d1Databases: ["DB"],
      bindings: {
        ENVIRONMENT: "production",
        DEPLOYMENT_STAGE: "beta",
        STORAGE_MODE: "disabled",
        BUSINESS_ID: "mary",
        PUBLIC_ORIGIN: origin,
        RATE_LIMIT_SECRET: "test-only-rate-secret",
      },
    }),
  );
  const db = await mf.getD1Database("DB");
  for (const file of [
    "0001_initial.sql",
    "0002_expired_tables.sql",
    "0003_customer_accounts.sql",
  ]) {
    const migration = await readFile(`migrations/${file}`, "utf8");
    for (const sql of migration.match(
      /CREATE TRIGGER[\s\S]*?\nEND;|(?:PRAGMA|CREATE TABLE|CREATE INDEX|DROP TRIGGER|ALTER TABLE)[\s\S]*?;/g,
    ) || [])
      await db.prepare(sql).run();
  }
  await db
    .prepare("INSERT INTO businesses(id,slug,content) VALUES(?,?,?)")
    .bind("mary", "mary", JSON.stringify(content))
    .run();
  await db
    .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
    .bind(
      "tester",
      "mary",
      "tester@example.invalid",
      "unused-test-hash",
      "propietario",
    )
    .run();
  await db
    .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
    .bind(
      await digest("test-session"),
      "tester",
      "test-csrf",
      Date.now() + 60000,
    )
    .run();
});
afterAll(async () => {
  await mf?.dispose();
});
const headers = {
  Origin: origin,
  Cookie: "__Host-mary_session=test-session",
  "X-CSRF-Token": "test-csrf",
  "Content-Type": "application/json",
};
it("sirve la carta y la administración sin binding MEDIA", async () => {
  const publicResult = await mf.dispatchFetch(`${origin}/api/content`);
  expect(publicResult.status).toBe(200);
  expect(
    ((await publicResult.json()) as { content: { logo: string } }).content.logo,
  ).toBe("/brand.svg");
  const admin = await mf.dispatchFetch(`${origin}/api/admin/content`, {
    headers,
  });
  expect(admin.status).toBe(200);
  expect(
    ((await admin.json()) as { storage: { enabled: boolean } }).storage.enabled,
  ).toBe(false);
});
it("rechaza subidas y lecturas sin almacenamiento con mensaje, no 500", async () => {
  const upload = await mf.dispatchFetch(`${origin}/api/admin/media`, {
    method: "POST",
    headers,
    body: "{}",
  });
  expect(upload.status).toBe(409);
  expect(await upload.text()).toContain("desactivada en esta beta");
  const image = await mf.dispatchFetch(`${origin}/api/media/mary/old.webp`);
  expect(image.status).toBe(409);
  expect(await image.text()).toContain("desactivada en esta beta");
});
it("conserva autorización y CSRF aunque la subida esté desactivada", async () => {
  expect(
    (
      await mf.dispatchFetch(`${origin}/api/admin/media`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await mf.dispatchFetch(`${origin}/api/admin/media`, {
        method: "POST",
        headers: { ...headers, "X-CSRF-Token": "wrong" },
        body: "{}",
      })
    ).status,
  ).toBe(403);
});
it("el modo desactivado solo se aplica a beta", () => {
  const media = {} as R2Bucket;
  expect(
    storageCapability({
      DEPLOYMENT_STAGE: "beta",
      STORAGE_MODE: "disabled",
      MEDIA: media,
    } as Env).enabled,
  ).toBe(false);
  expect(
    storageCapability({
      DEPLOYMENT_STAGE: "production",
      STORAGE_MODE: "disabled",
      MEDIA: media,
    } as Env).enabled,
  ).toBe(true);
  expect(storageCapability({ MEDIA: media } as Env).enabled).toBe(true);
});
it("todas las imágenes del seed existen como archivos estáticos", async () => {
  const paths = [...JSON.stringify(content).matchAll(/"(\/[^"]+\.svg)"/g)].map(
    (m) => m[1],
  );
  expect(paths.length).toBeGreaterThan(5);
  for (const path of paths) await access(`frontend/public${path}`);
  expect(JSON.stringify(content)).not.toContain("/api/media/");
  expect(JSON.stringify(content)).not.toContain("data:image");
});
