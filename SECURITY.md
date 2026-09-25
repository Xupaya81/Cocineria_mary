# Seguridad y límites de la beta

Validación Zod en servidor, SQL parametrizado, autorización por rol y businessId, control de versiones del contenido, Origin en escrituras y token CSRF administrativo. Sesiones de 8 horas: token aleatorio, digest SHA-256 almacenado y cookie HttpOnly/SameSite Strict; Secure y prefijo __Host en producción.

Contraseñas scrypt de @noble/hashes, N=16384, r=8, p=5, salt aleatorio de 16 bytes, clave de 32 bytes. No se diseñó un algoritmo propio. Medir CPU en Workers real antes de escoger plan; el emulador local no certifica límites del plan.

CSP, HSTS de producción, nosniff, referrer policy y permisos restringidos. La página de vista previa admite framing únicamente del mismo origen. El resto bloquea embedding. No se usa HTML introducido por administradores como código ejecutable.

R2 privado; acceso de lectura por ruta controlada del Worker. Imágenes JPG/PNG/WebP: MIME, extensión, firma y límite 5 MB en servidor; nombres aleatorios. Cliente optimiza a WebP y limita dimensiones. La validación de firma no es un análisis antivirus ni decodificación completa en servidor. Imágenes externas siguen permitidas mediante HTTPS y pueden contactar al proveedor externo; preferir subir a R2.

Rate limiting en D1 por operación: usuario autenticado o cookie anónima firmada de una hora, además de un techo agregado por IP de 40 veces la cuota individual. Sin cookie válida se conserva la cuota conservadora por IP. Login/registro añaden una cuota por correo normalizado de dos veces la individual. Las claves incluyen businessId y secreto; no guardan IP/correo originales. Cookies anónimas HttpOnly/SameSite Strict y Secure/__Host en producción, emitidas al cargar /api/content. Rotar cookies no elimina el techo por IP; rotar IP no elimina el límite por cuenta. Ventanas fijas, no deslizantes: al cruzar una ventana puede haber una ráfaga de dos cuotas. Validar en Wi-Fi real antes de ampliar; cada operación escribe 2 o 3 contadores en D1. Turnstile protege registro, reservas y feedback en producción. Analytics conserva su sesión independiente de 30 minutos; no mide personas únicas ni garantiza ausencia total de fraude publicitario.

Tarea programada elimina sesiones/límites vencidos; eventos y reservas se conservan 90 días, opiniones 180 y auditoría 365. La base contiene datos personales de reservas, aunque analytics no los recoja. Proteger respaldos y restringir acceso. Confirmar ejecución programada en producción.

Restablecimiento manual: únicamente superadmin del negocio, con reautenticación por contraseña actual, Origin/CSRF, límite de 3/h por usuario y 120/h por IP. Contraseña nueva de 14 a 128 caracteres. Actualización, auditoría password.reset y revocación de todas las sesiones de la cuenta en un batch D1. Contraseña incorrecta registra password.reset.denied sin secretos. La persona operadora debe verificar identidad y entregar la nueva contraseña por un canal privado; no existe envío automático, contraseña de un solo uso ni obligación de cambio al entrar. Si restablece su propia cuenta, sale del panel.

Beta remota: Access con verificación JWT mediante JOSE en Pages, noindex y no-store; todos los paths incluidos en Functions. Worker sin ruta pública directa, R2 privado. Configuración incompleta de Access deniega el acceso. No sustituye los roles/CSRF de la aplicación. Pendiente demostrar en Cloudflare real que root, API, assets, previews y enlaces alternativos quedan cerrados.

Pendientes operativos: recuperación por correo y autoservicio, revocación individual sin reset, MFA si se requiere, política de privacidad, respaldo remoto programado, prueba de carga y revisión independiente antes de una apertura amplia. El respaldo local del 25/09 fue restaurado y verificado; esto no constituye una política de respaldos remotos. No se presenta esta revisión como certificación de seguridad.

## Actualización: cuentas de clientes

Registro público limitado a cliente, con tablas/sesiones separadas del equipo. Reservas exigen sesión y CSRF y guardan account_id desde servidor; Mis reservas filtra por negocio/cuenta. Clientes no reciben permisos administrativos. Correos normalizados y bloqueo de duplicados entre grupos al insertar. Turnstile también protege registro en producción. No hay correo verificado ni recuperación/eliminación autoservicio; existe el restablecimiento manual descrito arriba. No tratar el correo declarado como identidad comprobada. Las cuentas se conservan sin plazo automático; la política de 90 días corresponde a reservas terminadas. La limpieza programada incluye ambas tablas de sesiones.
