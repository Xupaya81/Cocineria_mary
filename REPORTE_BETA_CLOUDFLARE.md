# Reporte de preparación Beta Cloudflare

Fecha: 25 de septiembre de 2026. **Estado: preparada y probada localmente; despliegue remoto bloqueado por configuración de cuenta pendiente.** No es una certificación de producción ni un lanzamiento público.

## URL y versión

- URL de beta operativa: **todavía no existe**.
- Nombre propuesto en configuración: `cocineria-mary-beta.pages.dev`; disponibilidad no comprobada en la cuenta.
- Commit desplegado: **ninguno**.
- Rama local: `main`.
- HEAD existente: `79bea9b0dc5a75395e75d172ecb2a08f8c38610f`, «Estructura inicial del proyecto antes del pull».
- Remoto: `https://github.com/Xupaya81/Cocineria_mary.git`.
- El desarrollo original se preparó en staging, pero Git rechazó el commit con `Author identity unknown`. Se solicitó nombre/correo al propietario; no se inventó una identidad. El push posterior respondió `Everything up-to-date`: eso NO significa que la aplicación se haya subido. Las mejoras beta posteriores están en el árbol local y deben añadirse también al siguiente commit.

## Revisión de archivos

Se revisó el inventario original de 82 archivos sin seguimiento y 3 modificados. Incluye frontend, Worker, modelos compartidos, migraciones, seed, pruebas, gráficos SVG, tooling y documentación. Las credenciales sintéticas de pruebas no son cuentas reales. La búsqueda de patrones no encontró tokens GitHub, claves privadas ni JWT incrustados.

Excluidos de Git: `.wrangler`, `node_modules`, `dist`, `.env`/variantes, `.dev.vars`, `work`, resultados de pruebas, logs y temporales. Añadidas exclusiones de archivos SQLite/DB, PEM/KEY y carpeta backups. `.env.example` contiene únicamente placeholders. No se incluyeron el respaldo, datos personales, sesiones locales ni el logo subido a R2.

## Recursos

Recursos remotos creados: **ninguno**. `wrangler whoami` indicó ausencia de autenticación. Se abrió OAuth oficial, pero venció sin recibir la autorización.

Plantillas preparadas:

- Pages: `cocineria-mary-beta`, con verificación Cloudflare Access en todas las rutas, API y recursos estáticos; noindex/no-store.
- Worker: `cocineria-mary-api-beta`, sin workers.dev ni preview URL pública; acceso mediante binding de Pages.
- D1: `mary-beta`, ID pendiente. Tres migraciones existentes, sin nuevas migraciones necesarias para estas mejoras.
- R2: `cocineria-mary-beta-media`, privado. Sin habilitar acceso público.
- Turnstile: widget y credenciales pendientes. No se sustituyó la verificación real por un mock en configuración beta.
- Cloudflare Access: política y correos de Piter/equipo pendientes. Su JWT se valida con firma, emisor, audiencia y vencimiento mediante JOSE; configuración/token inválidos bloquean acceso.

## Respaldo local verificable

Exportación SQL: `work/beta-backup-20260925.sql`.

SHA-256: `9bdc814784831c9ff6ec786511c0cc750c525d9c5fb3bb6654027a469369fd93`.

Restauración aislada: `work/beta-restore-20260925`. Se ejecutaron 225 instrucciones correctamente. `PRAGMA integrity_check`: **ok**. `PRAGMA foreign_key_check`: **sin errores**. Comparación por contenido de todas las filas de las tablas verificadas: **coincidente**. Manifiesto en `work/beta-backup-verification.json`.

Estado en el momento del respaldo: 1 negocio, 8 mesas, 1 usuario administrativo, 2 sesiones de equipo, 100 eventos, 20 entradas de auditoría, 67 contadores de rate limiting y 3 migraciones; 0 clientes, sesiones de cliente, reservas y feedback. Es una instantánea, no una copia continua; las pruebas posteriores pueden agregar auditoría/contadores.

Inventario R2 completo encontrado: un objeto.

- Clave: `mary/7f65f6cf-c5a9-4c66-a68c-13eb4dade42b.webp`.
- Tamaño: 96.320 bytes.
- ETag: `0ba0c5ceabbbf44d149e309b3c984f3e`.
- SHA-256: `ca962e3888c2df32d5677e944d8265b8a7cf6dc44697dc4c7c972ee23f94c4a6`.
- Copia mediante Wrangler: `work/beta-backup-logo.webp`; SHA-256 coincidente con el objeto local.

No se migró ningún dato local. La instalación remota prevista usa seed ficticio: 1 negocio, 4 categorías, 7 productos, promoción/negocio de muestra y 8 mesas. Usuarios, sesiones, métricas, auditoría, personalización y logo locales quedan fuera hasta una revisión explícita. Los respaldos siguen en el equipo y necesitan conservación privada adicional.

## Cambios realizados

1. Rate limiting por operación y usuario autenticado; para visitantes, cookie temporal firmada de una hora. Sin cookie válida mantiene un límite conservador por IP. Techo agregado de IP = 40 veces la cuota individual. Login/registro también limitan por correo normalizado a dos veces la cuota individual. Las claves almacenadas están hasheadas con secreto y negocio; no guardan IP/correo originales. Ventanas fijas y caducidad de contadores.
2. Cuotas individuales conservadas: login 5/15 min, registro 5/h, feedback 3/h, reservas 5/h, eventos 180/10 min, administración 100/10 min, imágenes 20/h, creación de usuarios 10/h. Nuevo restablecimiento 3/h por superadmin. Turnstile y CSRF permanecen activos.
3. Restablecimiento manual de contraseña en Usuarios: solo superadmin, contraseña actual obligatoria, nueva de 14–128 caracteres, confirmación en formulario, ámbito del negocio, revocación de todas las sesiones de la cuenta y auditoría sin secretos en una operación D1 por lotes. También atiende cuentas de clientes. No hay recuperación por correo, contraseña de un solo uso ni cambio obligatorio al siguiente login.
4. Configuración separada de beta, barrera de Access, empaquetado de Pages desde carpeta temporal y modo beta para creación segura del administrador remoto. Seed puede generar SQL sin aplicarlo.
5. Benchmark reproducible de scrypt local. No se tocaron algoritmo, parámetros ni formato de hashes.
6. Documentación de seguridad, especificación y changelog actualizados; procedimiento detallado en DEPLOYMENT_BETA.md.

No se implementaron Google Drive, WhatsApp Business, pagos, portal de anunciantes ni gestión centralizada multi-restaurante.

## Pruebas y resultados

Comprobación inicial antes del intento de commit: lint, typecheck, 43 pruebas y build correctos. Pruebas/build requirieron salir del aislamiento de herramientas porque esbuild no podía leer su configuración; el reintento autorizado pasó.

Comprobación de la versión beta preparada:

- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- `npm test`: **47 pruebas aprobadas en 6 archivos**. Incluyen separación de visitantes bajo la misma IP, límite individual, reset por superadmin, rechazo de rol/CSRF/contraseña incorrectos, revocación, auditoría y validación de JWT Access; también siguen pasando las reglas y endpoints existentes.
- `npm run build`: aprobado.
- `wrangler pages functions build`: aprobado con middleware de beta.
- `wrangler deploy --env beta --dry-run`: aprobado, sin despliegue. Worker 260,53 KiB, gzip 55,75 KiB.
- Prueba nueva de navegador Edge a 390 px: **1 aprobada**. Superadmin temporal restablece su propia contraseña, se desconecta, falla el login con la anterior y entra con la nueva. Duración del recorrido 5,4 s; no equivale al tiempo individual de login. La cuenta temporal se eliminó. No se repitió toda la suite E2E existente en esta fase.
- Instalación JOSE: npm informó **0 vulnerabilidades conocidas** en el análisis de dependencias de ese momento; no es garantía de ausencia de fallos.

Pruebas en producción beta: **ninguna ejecutada**, porque no hay despliegue. Permanecen pendientes registro, login, logout, cookies HTTPS, CSRF, roles, reservas, mesas, feedback, R2, analytics, QR, editor, guardado y Turnstile real. También políticas Access, cron, URLs alternativas, Wi-Fi compartida con teléfonos reales y límites de cuota. No presentar pruebas locales como pruebas de Cloudflare.

## Rendimiento y scrypt

Frontend: entrada pública gzip aproximada 79,57 kB de JS y 6,77 kB de CSS; administración se carga separadamente (26,05 kB gzip). Sin nueva medición Lighthouse, red móvil real ni latencia Cloudflare.

Benchmark en Node v22.17.0, 5 derivaciones por caso, N=16384, r=8, p=5, dkLen=32:

- Derivación para registro: 175–196 ms transcurridos; 171–203 ms de CPU del proceso local.
- Derivación usada al verificar login: 172–183 ms transcurridos; 171–235 ms de CPU del proceso local.
- Evidencia detallada: `work/scrypt-benchmark.json`.

Estos son tiempos del algoritmo en el equipo, no tiempos de registro/login completos ni CPU del edge. **CPU y tiempo de registro/login en Cloudflare siguen sin medirse.** El plan Workers Free publica 10 ms de CPU por invocación: hay un riesgo relevante de incompatibilidad con este coste, pero no se ha observado un error remoto porque no se ha desplegado.

No se rebajaron parámetros. Si la prueba remota produce error 1102 o agotamiento real de CPU, detenerse y acordar una alternativa: capacidad de CPU suficiente con autorización de costo, o una migración revisada de autenticación. No hacer ese cambio automáticamente. El reset ejecuta verificación y hash nuevo, por lo que también requiere medir CPU.

## Errores y bloqueos

- Git: falta nombre/correo del autor; no hay commit nuevo ni push del desarrollo.
- Cloudflare: sesión no autorizada, OAuth caducado. No se pudo crear recursos, administrador remoto ni despliegue.
- Faltan correos de la lista de acceso, dominio de equipo/AUD, IDs remotos y claves reales de Turnstile.
- El empaquetado local y la prueba con clave JWT de prueba no validan todavía la configuración Access real.
- Al verificar el respaldo, la primera comprobación local rechazó el nombre d1_migrations por una expresión que solo aceptaba letras. Se corrigió el verificador privado para permitir dígitos; verificación final completa y correcta.

## Costos y límites observados

No se contrataron servicios ni se crearon recursos remotos. No hay costo nuevo contratado por estas acciones; no se ha consultado la facturación de la cuenta. Los límites reales de D1/R2/Access y su posible habilitación requieren revisar la cuenta. Cada operación limitada escribe 2 o 3 contadores D1; presupuestar ese consumo y evitar pruebas de carga indiscriminadas. La protección de todos los assets en Pages añade invocaciones durante la beta.

Referencias oficiales consultadas: [Workers Free y CPU](https://developers.cloudflare.com/workers/platform/pricing/), [límites de Workers](https://developers.cloudflare.com/workers/platform/limits/), [JWT Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [protección de previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [medición de CPU en Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

## Checklist de producción, de crítico a opcional

- [ ] Confirmar identidad Git, crear commit revisado y subir main; registrar el hash real.
- [ ] Autorizar cuenta Cloudflare y correos de beta; confirmar que no se activa gasto sin autorización.
- [ ] Crear recursos separados; configurar Access para dominio principal y previews, Turnstile y secrets.
- [ ] Aplicar migraciones/seed a D1 nueva y crear superadmin remoto con contraseña privada.
- [ ] Desplegar y demostrar cierre de raíz/API/archivos/URLs alternativas ante usuarios no autorizados.
- [ ] Medir CPU real de registro/login/reset y resolver cualquier límite sin debilitar contraseñas.
- [ ] Completar todos los recorridos remotos de seguridad y funciones, en teléfonos reales y Wi-Fi compartida.
- [ ] Confirmar restauración remota, respaldo periódico, cron, alertas y límites de consumo.
- [ ] Sustituir precios/contactos/promociones ficticios; acordar si se traslada logo y personalización local.
- [ ] Revisar privacidad, retención de cuentas, procedimiento manual de recuperación y responsabilidades del equipo.
- [ ] Medir Lighthouse/red móvil y ajustar rendimiento con datos reales.
- [ ] Considerar después recuperación por correo, MFA y revisión independiente antes de apertura pública.

El objetivo pendiente es una beta privada que pueda probar el equipo. No autoriza una apertura pública automática.
