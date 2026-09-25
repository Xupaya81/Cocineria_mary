# Publicación en Cloudflare

No se ha desplegado ni contratado ningún servicio. Estos pasos requieren al propietario de la cuenta. Mantener secretos fuera de Git y comprobar límites del plan antes de habilitar recursos.

## Recursos y configuración

1. Conectar el repositorio GitHub a un proyecto Cloudflare Pages. Raíz: este repositorio; compilación `npm run build`; salida `dist`; Node 22. Anotar el dominio asignado `https://<proyecto>.pages.dev`.
2. Crear D1 y bucket R2 privado en la misma cuenta, usando el panel o Wrangler autenticado:

```sh
npx wrangler login
npx wrangler d1 create mary
npx wrangler r2 bucket create cocineria-mary-media
```

3. En `wrangler.worker.jsonc`, sección `env.production`, reemplazar `database_id` por el real y `PUBLIC_ORIGIN` por el dominio exacto de Pages, sin barra final. Mantener `ENVIRONMENT=production`, `BUSINESS_ID=mary`. Los ID de recursos no son secretos; las claves sí.
4. Crear widget Turnstile para ese hostname. Configurar su clave pública como `TURNSTILE_SITE_KEY` y agregar secretos mediante prompts:

```sh
npx wrangler secret put RATE_LIMIT_SECRET --config wrangler.worker.jsonc --env production
npx wrangler secret put TURNSTILE_SECRET --config wrangler.worker.jsonc --env production
```

Usar un secreto aleatorio de al menos 32 bytes para rate limiting. Turnstile es obligatorio para registro de clientes, reservas y feedback en producción.

## Inicializar y desplegar

```sh
npx wrangler d1 migrations apply mary --config wrangler.worker.jsonc --env production --remote
npm run db:seed
npx wrangler d1 execute mary --config wrangler.worker.jsonc --env production --remote --file=work/seed.sql
npm run deploy:api
```

`db:seed` genera `work/seed.sql` y lo aplica localmente. El comando remoto siguiente aplica únicamente datos demostrativos sin reemplazar registros. El contenido local editado NO se copia automáticamente. Cargar contenido real desde el panel del sitio publicado.

Crear un usuario de producción con las variables descritas en README y `npm run admin:create -- --remote`. El script selecciona `env production`; no subir contraseñas al repositorio. Limpiar la variable de contraseña después.

Pages utiliza el binding de servicio `API` hacia `cocineria-mary-api-prod`, declarado en `wrangler.jsonc`. Verificarlo en Settings → Bindings y volver a desplegar Pages. El Worker tiene workers.dev deshabilitado y recibe llamadas mediante el binding; la web utiliza `/api` bajo el mismo origen. No configurar un API público con CORS abierto.

## Validación antes de apertura

Aplicar también la migración 0003 de clientes antes de ejecutar esta versión. Probar registro/login/logout, aislamiento de Mis reservas, rechazo de clientes en administración, edición, imágenes R2, reserva, opinión y reportes en HTTPS. Verificar cookies Secure, rechazo de peticiones sin Origin/CSRF y que Turnstile funcione desde el dominio real. Revisar CPU de login: scrypt puede exceder el límite del plan gratuito. No reducir la protección de contraseñas para encajar en un plan; medir y decidir con el propietario si adaptar autenticación o contratar un plan. No se garantiza operación gratuita.

Configurar staging con recursos independientes; no conectar previews de ramas a la base de producción. Revisar cabeceras, metadatos compartidos y Lighthouse en el dominio real. Usar fotos WebP/JPG reales para compartir: las ilustraciones SVG de ejemplo no garantizan preview en todas las redes.

## Dominio, datos y respaldo

Agregar el dominio propio desde Pages cuando el propietario lo disponga. Actualizar `PUBLIC_ORIGIN` y hostnames de Turnstile y redirigir el dominio antiguo al canónico. Generar QR definitivos después; no imprimir los QR de localhost.

Cambiar datos demostrativos, revisar precios y contactos, y solo después desactivar el aviso demo. Las reservas recogen nombre y teléfono; publicar aviso de privacidad apropiado al uso real. Respaldar D1 y R2 y ensayar restauración antes de aceptar información de clientes. Ejemplo de exportación D1 (contiene datos privados; nunca versionarla):

```sh
npx wrangler d1 export mary --config wrangler.worker.jsonc --env production --remote --output=work/backup.sql
```

El frontend puede redeplegarse desde un commit anterior. Antes de cambios de esquema, exportar la base; las migraciones no se revierten automáticamente.

Fuentes oficiales verificadas para esta guía: [bindings de Pages](https://developers.cloudflare.com/pages/functions/bindings/), [comandos D1](https://developers.cloudflare.com/d1/wrangler-commands/), [límites de Workers](https://developers.cloudflare.com/workers/platform/limits/).
