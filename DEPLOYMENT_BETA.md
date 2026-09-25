# Beta cerrada en Cloudflare

Estado: preparación local verificada; no hay despliegue remoto. No ejecutar los pasos remotos sin iniciar sesión en la cuenta correcta. Los identificadores de recursos del archivo de configuración son placeholders.

## 1. Requisitos y respaldo

Confirmar autor de Git, correos autorizados de Piter/equipo, correo del superadmin y cuenta Cloudflare. No enviar contraseñas por chat ni guardarlas en Git.

Se exportó D1 a `work/beta-backup-20260925.sql` y se restauró en `work/beta-restore-20260925`. El manifiesto privado `work/beta-backup-verification.json` contiene comparación de tablas, integridad y hashes. Se respaldó el logo en `work/beta-backup-logo.webp`. Todo está excluido de Git. Estos archivos contienen información sensible o privada; conservar una copia protegida fuera de este equipo antes de operaciones destructivas.

La base remota será NUEVA. El seed incluye solo el negocio demostrativo, carta ficticia y ocho mesas. No traslada usuarios, contraseñas, sesiones, analytics, auditoría, reservas, personalización ni el logo local. Cualquier importación posterior requiere presentar primero los datos y acordarla con el propietario.

## 2. Guardar la versión probada

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
git status --short
git diff --cached --stat
```

Configurar `git config user.name` y `git config user.email` únicamente con la identidad indicada por el propietario. Revisar staged/unstaged, crear el commit y subir `main` a `origin`. No usar `push --force`.

## 3. Cuenta y recursos aislados

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler d1 create mary-beta
npx wrangler r2 bucket create cocineria-mary-beta-media
npx wrangler pages project create cocineria-mary-beta --production-branch main
```

No crear recursos si ya existen con esos nombres sin comprobar a quién pertenecen. No activar una suscripción de pago ni introducir tarjeta sin autorización. Si R2 requiere habilitación de facturación, el propietario debe revisar ese paso. La cuota gratuita no es un tope de gasto en un servicio de pago por uso.

Copiar el ID real de D1 exclusivamente a `env.beta.d1_databases` en `wrangler.worker.jsonc`. Conservar local/production separados. Si Pages asigna otro nombre, actualizar su configuración, PUBLIC_ORIGIN, script de despliegue, Turnstile y Access antes de continuar.

## 4. Access y Turnstile antes de compartir

En Pages activar Access para previews. En Zero Trust / Access / Applications revisar la aplicación y proteger tanto `cocineria-mary-beta.pages.dev` como `*.cocineria-mary-beta.pages.dev`. La protección automática de previews por sí sola NO cubre el dominio principal. Usar una política Allow únicamente para los correos acordados; nunca Everyone ni Bypass. Si el plan disponible requiere pago, detenerse.

Copiar el dominio del equipo (`equipo.cloudflareaccess.com`, sin https) y el Audience/AUD de esa aplicación en `wrangler.beta.pages.jsonc`. Conservar BETA_CLOSED=true. La aplicación verifica firma RS256, emisor, audiencia y vencimiento mediante JOSE; comprobar solo que exista una cabecera no sería suficiente. `_routes.json` hace pasar también los archivos estáticos por la barrera. Sin token válido devuelve 403 y no sirve la aplicación. Falta comprobar esta protección en el edge real, incluidos enlaces de despliegues y previews.

Crear un widget Turnstile administrado para el hostname real de Pages. Su site key pública va en `env.beta.vars.TURNSTILE_SITE_KEY`. Guardar el secreto de Turnstile y un secreto aleatorio de al menos 32 bytes mediante prompts de Wrangler:

```powershell
npx wrangler secret put TURNSTILE_SECRET --config wrangler.worker.jsonc --env beta
npx wrangler secret put RATE_LIMIT_SECRET --config wrangler.worker.jsonc --env beta
```

No poner esos valores en comandos guardados, SQL, archivos versionados ni capturas. El backend comprueba hostname y acción en Siteverify. Registro, reservas y feedback requieren Turnstile real; login usa los límites combinados. No usar claves de prueba de Turnstile en la beta compartida.

## 5. Base nueva y administrador

```powershell
npx wrangler d1 migrations apply mary-beta --config wrangler.worker.jsonc --env beta --remote
node scripts/seed.mjs --generate-only
npx wrangler d1 execute mary-beta --config wrangler.worker.jsonc --env beta --remote --file work/seed.sql
```

Se aplican 0001_initial.sql, 0002_expired_tables.sql y 0003_customer_accounts.sql. No importar el respaldo local. Revisar que haya 1 negocio, 8 mesas y ninguna cuenta antes de crear el superadmin.

Crear la contraseña en un gestor de contraseñas. Este ejemplo la solicita sin eco y la mantiene temporalmente en memoria; no la escribe en el historial:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Correo del superadmin remoto'
$env:ADMIN_ROLE = 'superadmin'
$betaPassword = Read-Host 'Contraseña de al menos 14 caracteres' -AsSecureString
$betaPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($betaPassword)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($betaPointer)
  node scripts/create-admin.mjs --remote --beta
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($betaPointer)
  Remove-Item Env:ADMIN_PASSWORD, Env:ADMIN_EMAIL, Env:ADMIN_ROLE -ErrorAction SilentlyContinue
  $betaPassword.Dispose()
}
```

El script crea la cuenta con scrypt y elimina su SQL temporal al terminar. No imprime la contraseña. No usar el administrador de desarrollo ni copiar sesiones locales.

## 6. Despliegue

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx wrangler deploy --config wrangler.worker.jsonc --env beta --dry-run --outdir work/beta-worker
npx wrangler deploy --config wrangler.worker.jsonc --env beta
node scripts/deploy-beta-pages.mjs
```

Guardar previamente configuración y código en Git: el script de Pages rechaza un árbol con cambios y los placeholders de Access. Prepara una carpeta temporal con el nombre `wrangler.jsonc` requerido por Pages y adjunta el commit a la publicación. El Worker queda sin workers.dev ni preview URL y se alcanza mediante el binding de Pages. R2 queda privado, sin r2.dev público. No ejecutar deploy:api, que apunta al entorno production anterior.

Registrar URL y commit reales en REPORTE_BETA_CLOUDFLARE.md. No declarar una URL operativa por estar escrita en un archivo.

## 7. Pruebas remotas obligatorias

Primero probar desde una ventana sin Access: raíz, API, imágenes, assets y URLs alternativas deben quedar bloqueadas. Probar un correo no invitado y un invitado.

Con cuentas desechables del equipo, probar registro/login/logout, contraseña incorrecta, cookies HttpOnly/Secure/SameSite=Strict, expiración, escritura sin Origin/CSRF y aislamiento de roles. Restablecer una cuenta, confirmar revocación de sus sesiones y auditoría sin secretos. Probar varios teléfonos en el mismo Wi-Fi y también fuera de él.

Crear y cancelar reservas; rechazar capacidad excedida/solapamiento y acceso a reservas ajenas. Cambiar mesas y abrir su QR; enviar feedback válido y rechazar spam. Subir imágenes válidas y rechazar formatos/tamaños inválidos. Probar deduplicación de analytics, borrador, vista previa, guardado y conflicto de versiones. Verificar Turnstile real, token inválido, vencido y reutilizado. La batería local no sustituye estas pruebas.

## 8. CPU y límite de scrypt

El entorno beta activa observability. En Workers Logs filtrar las invocaciones de `/api/auth/register` y `/api/auth/login` por hora/ruta y revisar `$workers.cpuTimeMs`, wall time y outcome. Tomar muestras separadas de login correcto/incorrecto y registro, incluidos arranque frío y múltiples teléfonos. Relacionar con CF-Ray sin guardar cuerpos, cookies ni contraseñas. El cron y tráfico de assets no deben mezclarse con esas muestras.

`node scripts/benchmark-scrypt.mjs` es una referencia local de la derivación solamente; CPU de Node no es CPU de Cloudflare ni tiempo total del endpoint. No usar Date.now o tiempo de red como sustituto de CPU. Registrar muestras reales y error 1102 si ocurre. Detener las pruebas repetitivas si hay agotamiento del límite.

No modificar N=16384,r=8,p=5,dkLen=32 para encajar en un plan. Si scrypt falla en el plan elegido, presentar al propietario las alternativas: autorizar un plan con CPU suficiente conservando el algoritmo, o diseñar una migración revisada a un servicio de autenticación compatible. No contratar ni cambiar autenticación sin esa decisión.

Fuentes oficiales: [Access y JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [protección de previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [CPU y límites](https://developers.cloudflare.com/workers/platform/limits/), [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).
