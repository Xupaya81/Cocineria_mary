import type { Content } from "../../shared/schema";
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
const password = `E2e-${randomUUID()}!`;
const email = `e2e-${randomUUID()}@example.invalid`;
test.beforeAll(() => {
  execFileSync(process.execPath, ["scripts/create-admin.mjs"], {
    env: {
      ...process.env,
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD: password,
      ADMIN_ROLE: "superadmin",
      WRANGLER_LOG_PATH: "work/e2e-wrangler.log",
    },
    stdio: "pipe",
  });
});
test.afterAll(() => {
  writeFileSync(
    "work/e2e-cleanup.sql",
    `DELETE FROM users WHERE email='${email}'; DELETE FROM customers WHERE email='customer-${email}'; DELETE FROM feedback WHERE comment='Opinión de prueba E2E'; DELETE FROM reservations WHERE name='Reserva E2E';`,
  );
  try {
    execFileSync(
      process.execPath,
      [
        "node_modules/wrangler/bin/wrangler.js",
        "--config",
        "wrangler.worker.jsonc",
        "d1",
        "execute",
        "mary",
        "--local",
        "--file=work/e2e-cleanup.sql",
      ],
      {
        env: { ...process.env, WRANGLER_LOG_PATH: "work/e2e-wrangler.log" },
        stdio: "pipe",
      },
    );
  } finally {
    unlinkSync("work/e2e-cleanup.sql");
  }
});
test("carta móvil: imágenes, categorías, búsqueda y recomendado", async ({
  page,
}) => {
  await page.goto("/m/1");
  await expect(page.getByText("Estás en Mesa 1 · ¡Bienvenido!")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cocinería Mary", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-art > img")
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Sabores del mar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pescado con acompañamiento" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Empanadas de queso" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toda la carta", exact: true })
    .click();
  await page.getByRole("searchbox").fill("limonada");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("");
  await page.screenshot({ path: "work/mobile-menu.png", fullPage: true });
  await page.getByRole("link", { name: "Conocer este lugar" }).click();
  await expect(
    page.getByRole("heading", { name: "Cabañas Mar Azul", exact: true }),
  ).toBeVisible();
});
test("feedback privado y reserva solicitada", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "5 estrellas", exact: true }).check();
  await page
    .getByLabel("¿Algo que quieras contarnos?")
    .fill("Opinión de prueba E2E");
  await page.getByRole("button", { name: "Enviar mi opinión" }).click();
  await expect(page.getByRole("status")).toContainText("Gracias por contarnos");
  await page.goto("/reservas");
  await page
    .getByRole("link", { name: "Iniciar sesión para reservar" })
    .click();
  await page
    .getByRole("button", { name: "No tengo cuenta: registrarme" })
    .click();
  await page.getByLabel("Correo", { exact: true }).fill("customer-" + email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Repetir contraseña", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Crear mi cuenta", exact: true })
    .click();
  await page.getByLabel("Tu nombre").fill("Reserva E2E");
  await page.getByLabel("Teléfono de contacto").fill("000000000");
  await page
    .getByLabel("Fecha", { exact: true })
    .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await page.getByLabel("Hora", { exact: true }).fill("14:00");
  await page.getByRole("button", { name: "Solicitar reserva" }).click();
  await expect(
    page.getByRole("heading", { name: "¡Solicitud recibida!" }),
  ).toBeVisible();
  await page.goto("/cuenta");
  await expect(
    page.getByRole("heading", { name: "Mis reservas" }),
  ).toBeVisible();
  await expect(page.getByText("Estado: pendiente")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir administración" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "work/customer-account.png", fullPage: true });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Tu cuenta de cliente" }),
  ).toBeVisible();
});
test("administración: guardar y restaurar contenido, mesas, reportes y logout", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Productos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "General", exact: true }).click();
  const field = page.getByLabel("Frase de bienvenida");
  const original = await field.inputValue();
  try {
    await field.fill("Texto temporal E2E");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("status")).toContainText("Cambios guardados");
    const r = await page.request.get("/api/content");
    expect((await r.json()).content.tagline).toBe("Texto temporal E2E");
  } finally {
    await field.fill(original);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("status")).toContainText("Cambios guardados");
  }
  await page.getByRole("button", { name: "Mesas", exact: true }).click();
  await expect(page.locator(".table-card")).toHaveCount(8);
  await page.getByRole("button", { name: "Ver QR de mesa" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Estadísticas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reporte para compartir" }),
  ).toBeVisible();
  await page.screenshot({ path: "work/mobile-admin.png", fullPage: true });
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("button", { name: "Ingresar", exact: true }),
  ).toBeVisible();
});
test("portada escritorio sin desbordamiento", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nuestra carta" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "work/desktop-home.png", fullPage: true });
});
test("vista previa en vivo sin publicar ni enviar eventos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: "General", exact: true }).click();
  const field = page.getByLabel("Frase de bienvenida");
  const original = await field.inputValue();
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/") && r.method() !== "GET") writes.push(r.url());
  });
  const frame = page.frameLocator(
    'iframe[title="Vista previa móvil del borrador"]',
  );
  await field.fill("Así se verá antes de guardar");
  await expect(
    frame.getByRole("heading", { name: "Así se verá antes de guardar" }),
  ).toBeVisible();
  await expect(page.locator(".draft-summary")).toContainText(
    "frase de bienvenida",
  );
  await expect(frame.locator('[data-preview-block="hero"]')).toHaveClass(
    "preview-highlight",
  );
  const published = await page.request.get("/api/content");
  expect((await published.json()).content.tagline).toBe(original);
  await page.screenshot({ path: "work/draft-preview.png", fullPage: true });
  await page.getByRole("button", { name: "Ocultar vista previa" }).click();
  await expect(page.locator(".draft-frame")).toHaveCount(0);
  await page.getByRole("button", { name: "Mostrar vista previa" }).click();
  await expect(
    frame.getByRole("heading", { name: "Así se verá antes de guardar" }),
  ).toBeVisible();
  await frame.getByRole("radio", { name: "5 estrellas", exact: true }).check();
  await frame.getByRole("button", { name: "Enviar mi opinión" }).click();
  await expect(
    frame.getByRole("button", { name: "Enviar mi opinión" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  await field.fill(original);
  await expect(page.locator(".draft-summary")).toContainText(
    "Sin cambios pendientes",
  );
  await expect(
    page.getByRole("button", { name: "Guardar cambios" }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("diseño: fuentes, colores, contraste y descartar sin publicar", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: "Diseño", exact: true }).click();
  const before = await (await page.request.get("/api/content")).json();
  await page.getByRole("button", { name: "Noche cálida", exact: true }).click();
  await page.getByLabel("Tipografía de títulos").selectOption("mono");
  await page.getByLabel("Tipografía de textos").selectOption("readable");
  const frame = page.frameLocator(
    'iframe[title="Vista previa móvil del borrador"]',
  );
  await expect(frame.locator(".hero h1")).toHaveCSS("font-family", /Courier/);
  await expect(frame.locator(".hero p")).toHaveCSS("font-family", /Verdana/);
  await expect(frame.locator(".hero h2")).toHaveCSS(
    "color",
    "rgb(255, 244, 219)",
  );
  await page.screenshot({ path: "work/theme-preview.png", fullPage: true });
  expect(
    (await (await page.request.get("/api/content")).json()).content,
  ).toEqual(before.content);
  await page.getByLabel("Color de texto", { exact: true }).fill("#202821");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("alert")).toContainText("contraste");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardar cambios" }),
  ).toBeDisabled();
});

test("acceso común muestra administración solo al equipo", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  await page.getByRole("link", { name: "Iniciar sesión", exact: true }).click();
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("link", { name: "Abrir administración" }).click();
  await expect(
    page.getByRole("heading", { name: "Productos", exact: true }),
  ).toBeVisible();
});

test("productos agrupados: abrir categoría, añadir y mover sin publicar", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Productos", exact: true }),
  ).toBeVisible();
  const data = (await (
    await page.request.get("/api/admin/content")
  ).json()) as { content: Content; version: number };
  const categories = [...data.content.categories].sort(
    (a, b) => a.order - b.order,
  );
  const groups = page.locator(".product-category-group");
  await expect(groups).toHaveCount(categories.length);
  for (const group of await groups.all())
    await expect(group).not.toHaveAttribute("open", "");
  const first = groups.first();
  await first.locator(":scope > summary").click();
  await expect(first).toHaveAttribute("open", "");
  const count = data.content.products.filter(
    (p) => p.categoryId === categories[0].id,
  ).length;
  await expect(first.locator(".edit-card")).toHaveCount(count);
  await first
    .getByRole("button", { name: "Añadir producto", exact: true })
    .click();
  await expect(first.locator(".edit-card")).toHaveCount(count + 1);
  const added = first.locator(".edit-card").last();
  await added.locator("summary").click();
  await expect(
    added.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toHaveValue(categories[0].id);
  if (categories.length > 1) {
    await added
      .getByRole("combobox", { name: "Categoría", exact: true })
      .selectOption(categories[1].id);
    await expect(first.locator(".edit-card")).toHaveCount(count);
    await groups.nth(1).locator(":scope > summary").click();
    await expect(
      groups.nth(1).getByText("Nuevo producto", { exact: false }),
    ).toBeVisible();
  }
  const published = await (await page.request.get("/api/admin/content")).json();
  expect(published.version).toBe(data.version);
  await page.screenshot({ path: "work/category-products.png", fullPage: true });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardar cambios" }),
  ).toBeDisabled();
});

test("beta: superadmin restablece su contraseña y vuelve a iniciar sesión", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: "Usuarios", exact: true }).click();
  await page.getByLabel("Correo de la cuenta", { exact: true }).fill(email);
  await page.getByLabel("Tu contraseña de superadmin").fill(password);
  const nextPassword = `Reset-${randomUUID()}!`;
  await page
    .getByLabel("Nueva contraseña (mínimo 14 caracteres)", { exact: true })
    .fill(nextPassword);
  await page.getByLabel("Repite la nueva contraseña").fill(nextPassword);
  await page
    .getByRole("button", { name: "Restablecer y cerrar sesiones" })
    .click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Correo o contraseña incorrectos",
  );
  await page.getByLabel("Contraseña", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
});
