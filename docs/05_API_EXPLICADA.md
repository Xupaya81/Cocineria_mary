# API explicada: cómo se habla con el servidor

[Volver al índice](README.md)

Cada dirección de esta lista es una puerta del servidor. GET consulta; POST crea o ejecuta; PUT guarda una representación; PATCH cambia parte; DELETE elimina. El prefijo completo es `/api`. Los nombres con `:id` se reemplazan por un identificador real.

La respuesta normal es JSON, salvo imágenes. Errores usan `{ "error": "mensaje" }`. 400 indica datos inválidos, 401 sesión ausente/vencida, 403 permiso/protección rechazada, 404 inexistente, 409 conflicto, 413 tamaño, 415 formato, 429 exceso de intentos y 503 configuración pendiente. Un 500 es un fallo interno genérico: el usuario no recibe detalles de SQL ni secretos.

Las escrituras requieren Origin permitido y JSON o multipart según corresponda. Las rutas protegidas usan cookie y, en escrituras, X-CSRF-Token. Las pruebas locales no demuestran que la infraestructura de producción esté configurada.

## Lecturas y acciones de visitantes — worker/public.ts

- **GET /content?table=1:** entrega businessId, version, content filtrado, identificación mínima de mesa y clave pública Turnstile. No entrega contenido inactivo privado ni contraseñas. table es opcional.
- **GET /media/:business/:key:** lee un JPG/PNG/WebP del negocio mediante R2. No permite enumerar el bucket. El identificador del archivo no equivale a una autorización privada; las imágenes servidas por esta ruta son visibles a quien tenga la URL.
- **POST /reservations:** recibe name, phone, date, time, people, tableId opcional y controles de formulario. Valida horario, capacidad y solapamientos. Crea pendiente y devuelve id/message con estado 201. Exige sesión de cliente o equipo y CSRF; el dueño de la reserva se toma de la sesión. No se puede reservar anónimamente.
- **POST /feedback:** recibe rating/comment y controles anti-bots. Guarda una opinión privada y responde message/201.
- **POST /events:** recibe type/target/session; verifica destino y deduplica. Responde ok aunque un evento repetido no agregue otra fila.

## Sesiones — worker/auth.ts, authRoutes

- **POST /auth/login:** recibe email/password, comprueba hash, crea sesión de 8 horas y devuelve id/email/role/csrf más cookie. Errores de credenciales usan el mismo mensaje, sin confirmar si el correo existe.
- **POST /auth/register:** público con Origin/rate limit y Turnstile en producción. Recibe email/password/website/turnstileToken, rechaza campos extra y crea únicamente cliente. Devuelve sesión y cookie con 201. No verifica propiedad del correo ni envía mensajes.
- **GET /account/reservations:** requiere sesión; devuelve hasta 100 reservas creadas por esa cuenta dentro de su negocio, sin aceptar un ID de cuenta alternativo.
- **GET /auth/me:** exige sesión; devuelve usuario actual y CSRF para que el navegador pueda continuar. No devuelve hash de contraseña.
- **POST /auth/logout:** exige sesión/CSRF; borra esa sesión y cookie. Invalida la sesión actual de cualquiera de los dos grupos. No cierra automáticamente otras sesiones del usuario.

## Contenido y operaciones — adminRoutes

- **GET /admin/content:** propietario/superadmin leen documento completo y versión, incluidos borradores guardados como inactivos.
- **PUT /admin/content:** propietario/superadmin envían `{version, content}`. Devuelve nueva versión/contenido. El número debe coincidir con el actual. Valida todo el documento y registra resumen de auditoría; no almacena cada versión histórica.
- **GET /admin/tables:** personal/propietario/superadmin consultan mesas del negocio.
- **PUT /admin/tables/:id:** esos roles envían mesa completa. El ID de ruta debe coincidir con el cuerpo. Crea o actualiza y devuelve la mesa; restricciones de reservas pueden impedirlo.
- **DELETE /admin/tables/:id:** propietario/superadmin eliminan si las referencias de la base lo permiten. Existe en API, pero no hay botón de eliminación en el panel actual. Devuelve ok; actualmente no distingue en respuesta una mesa que ya no existía.
- **GET /admin/reservations:** roles de operaciones leen hasta 300 reservas por fecha de inicio descendente.
- **PATCH /admin/reservations/:id:** roles de operaciones envían status. Revisa transición y estado previo, actualiza y audita si realmente cambió. Devuelve ok o conflicto.
- **GET /admin/feedback:** roles de operaciones leen hasta 200 opiniones recientes.
- **GET /admin/reports?period=day&target=...:** propietario/superadmin consultan día/semana/mes. target opcional filtra un recomendado. Devuelve period/start/rows/message/sent. sent es false en el adaptador actual. Un target sin coincidencias puede dar reporte vacío; no es una verificación de propiedad de anunciante independiente.
- **GET /admin/audit:** propietario/superadmin consultan hasta 100 registros recientes.
- **POST /admin/media:** propietario/superadmin envían FormData con file. Valida, guarda en R2 con nombre aleatorio, audita y devuelve url/201.
- **POST /admin/users:** superadmin envía email/password/role. Crea cuenta administrativa, guarda hash, audita y devuelve id/201. Correo duplicado se rechaza.

## Salud y tareas — worker/index.ts

**GET /health** devuelve ok para comprobar que el Worker responde. No comprueba por sí solo que D1/R2/Turnstile estén bien configurados. **scheduled** es la limpieza programada descrita en el catálogo; no es una URL pública para visitantes.

Los límites por acción están en security/rutas: login 5/15min; registro 5/h; feedback 3/h; reservas 5/h; eventos 180/10min; escrituras admin 100/10min, subidas 20/h y usuarios 10/h. No son cuotas comerciales. Son protecciones por IP/ventana que deben calibrarse en una Wi-Fi compartida.

## Rutas de páginas — Pages y React

`/` es la portada; `/m/:id` la portada asociada a mesa; `/recomendados` la guía; `/recomendados/:slug` un perfil; `/reservas` el formulario; `/cuenta` el acceso común y Mis reservas; `/admin` la administración; `/admin/preview` el marco interno. `/robots.txt` orienta buscadores y `/sitemap.xml` enumera páginas públicas. Una indicación noindex no es una contraseña ni un control de acceso.

El enlace de Administración fue retirado de la carta. Eso no cambia la necesidad de autorización en cada ruta administrativa. Desde /cuenta solo las sesiones del equipo ven Abrir administración. Una cuenta de cliente recibe 403 en la API administrativa aunque escriba las rutas a mano.
