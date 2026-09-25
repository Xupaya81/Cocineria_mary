# Cocinería Mary

Beta cerrada: consultar [procedimiento de despliegue](DEPLOYMENT_BETA.md) y [reporte de preparación y bloqueos](REPORTE_BETA_CLOUDFLARE.md). La existencia de estos archivos no significa que haya un despliegue remoto activo.

Carta digital y administración para una beta de restaurante. React + TypeScript + Vite, API Hono en Cloudflare Workers, D1 y R2. Los datos de demostración no representan precios, dirección ni contactos reales.

## Documentación para personas sin experiencia

Comienza en [la guía paso a paso](docs/README.md): manual del panel, funcionamiento, catálogo de funciones, datos, API y mantenimiento.

## Ejecutar desde cero

Requiere Node.js 22 y npm. En la carpeta del repositorio:

```sh
npm ci
npm run setup
npm run dev
```

Abrir http://localhost:5173. El acceso común está en http://localhost:5173/cuenta: los clientes pueden registrarse y consultar sus reservas; el equipo ve Abrir administración. /admin sigue protegido como acceso directo. El frontend expone la red local; en el teléfono usar la IP del computador seguida de `:5173`, en la misma Wi-Fi. El firewall debe permitir el acceso a esa red. La API se mantiene en 127.0.0.1:8787 y Vite reenvía `/api`. No utilizar el servidor de desarrollo para publicar en Internet.

`setup` aplica migraciones y agrega seed sin reemplazar el negocio existente. La base y los archivos locales persisten en `.wrangler/`; no borrar esa carpeta si se desea conservar el contenido.

## Crear primer administrador

No hay contraseña universal. En PowerShell, introducir una contraseña nueva sin guardarla en scripts:

```powershell
$env:ADMIN_EMAIL = 'tu-correo@example.com'
$env:ADMIN_ROLE = 'superadmin'
$claveMary = Read-Host 'Contraseña (mínimo 14 caracteres)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $claveMary).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

Propietario administra contenido, operaciones y reportes; personal administra mesas, reservas y opiniones; superadmin también crea usuarios. La sesión dura 8 horas. No se incluye aún recuperación de contraseña por correo.

## Uso del panel

General: identidad, portada, logo, información. Diseño: seis familias de letras para títulos y textos, ocho colores y tres temas. Bloques: orden, visibilidad y algunos encabezados. Botones, categorías, productos, promoción y recomendados se editan sin código.

El cuadro de vista previa muestra el borrador y resume cambios. Solo **Guardar cambios** publica contenido. **Descartar** recupera la versión cargada. Las imágenes se suben al seleccionarlas; descartar el borrador no elimina esos archivos de R2. La vista previa no registra estadísticas ni envía formularios. Si otra persona guardó primero, el servidor impide sobrescribirla; conservar los cambios manualmente antes de recargar.

Mesas y reservas son operaciones inmediatas. Reservar requiere sesión de cliente o equipo. Las reservas duran 90 minutos y requieren confirmación del personal. La agenda no incluye todavía calendario de cierres ni horarios de atención estructurados.

## Comprobaciones

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Las pruebas E2E requieren el servidor local ejecutándose y Microsoft Edge (configuración de Playwright). Crean un usuario temporal y restauran el contenido que modifican. Ejecutarlas en una base de desarrollo sin editores concurrentes. En otro sistema, adaptar `channel` de `playwright.config.ts` a un navegador instalado.

## Estructura

- `frontend/src/public`: carta, guía y formularios públicos.
- `frontend/src/admin`: administración, editor, diseño y vista previa aislada.
- `shared`: validación, reglas de reservas, permisos, temas y filtros compartidos.
- `worker`: API, sesiones, almacenamiento, auditoría y reportes.
- `functions`: proxy Pages, metadatos y cabeceras de producción.
- `migrations`: tablas y restricciones D1.
- `scripts`: seed, administrador y recursos gráficos originales.
- `tests`: reglas, API sobre D1/R2 locales, Pages y flujos de navegador.

Ver `DEPLOYMENT.md`, `SECURITY.md`, `REPORTE_WEB.md` y `REPORTE_CAMBIOS.md`. Los archivos iniciales del repositorio se conservaron. `app.py` no interviene en esta aplicación.
