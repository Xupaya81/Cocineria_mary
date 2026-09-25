# Datos y reglas explicados

[Volver al índice](README.md)

## El documento del negocio

En D1, businesses guarda `id` (identidad interna), `slug` (nombre de ruta), `content` (documento JSON editorial) y `version` (número que cambia al guardar). Todo lo visual se concentra en ese documento para mantener sencilla la beta. No hay una tabla distinta por cada producto.

En [schema.ts](../shared/schema.ts), Content describe su forma y contentSchema valida sus datos:

- Identidad: name, description, tagline, logo, cover, address, hours y mapsUrl son nombre, descripción, frase, logo, portada, dirección, horario escrito y enlace al mapa.
- Apariencia: primary y secondary son principal/acento; background y surface son fondos; font y bodyFont son familias de títulos/textos; headingColor, textColor, mutedColor y buttonTextColor son colores de letras.
- Preferencias: hideSoldOut oculta agotados, demo muestra avisos ficticios y allowDining habilita Dónde comer.
- Colecciones: blocks, buttons, categories, products y partners son listas. promotion es un único anuncio o null (sin anuncio).

No todos los campos de un modelo se editan en pantalla. Por ejemplo, los bloques admiten subtitle y eyebrow como opcionales, pero actualmente sus formularios/renders no los aprovechan como personalización general. Añadir una propiedad al JSON no crea por sí solo un control visible.

## Elementos editoriales

**Botón:** id, text, icon, url, order, active, style y action. order define orden numérico; active controla visibilidad; style admite primary/outline/soft; action clasifica link/whatsapp/instagram/facebook/maps/tripadvisor/other. Una URL segura no garantiza que el sitio externo sea legítimo: el administrador debe revisar su destino.

**Categoría:** id, name, order y active. **Producto:** id, name, description, price, image, categoryId, available, tags y order. categoryId debe existir en categorías; price es un entero entre 0 y 10.000.000 CLP. Hasta 300 productos y 40 categorías.

**Bloque:** id identifica hero/buttons/menu/promotion/recommendations/map/feedback/footer; visible decide mostrar; order indica posición; title y los textos opcionales permiten configuración. Deben existir los ocho bloques con IDs únicos; ocultar no elimina.

**Promoción:** id, name, text, image, buttonText, url, start, end y active. Fecha final no anterior a inicial. **Recomendado:** id, slug, name, category, description, image, location, mapsUrl, active, catalog y buttons. Cada catálogo admite hasta 12 elementos con name/description/image; hasta 20 botones por negocio y 100 negocios. El restaurante admite hasta 30 botones principales.

Las rutas de recomendados y los IDs dentro de una colección deben ser únicos. El identificador es estable; el nombre puede cambiar. Los IDs no admiten `__` porque ese separador une dueño y botón en estadísticas.

## Reglas de validación

- **idSchema:** identificadores de 1 a 64 caracteres, letras/números/guion/guion bajo, sin separador doble reservado.
- **safeUrl:** HTTPS sin usuario/contraseña incrustados, ciertas rutas internas, anclas y teléfonos con formato permitido; no javascript ni HTTP externo.
- **imageUrl:** vacío o dirección compatible con imagen; no teléfono ni ancla.
- **buttonSchema, categorySchema, productSchema, blockSchema, promotionSchema, partnerSchema:** validan cada elemento descrito arriba.
- **fontSchema/colorSchema:** lista cerrada de fuentes y colores hexadecimales de seis dígitos.
- **contentSchema:** valida el documento completo, relaciones y duplicados. Exige contraste de 4,5 para textos contra fondo/tarjeta y letras de botón contra principal; acento contra fondo requiere 3. No es una auditoría automática de toda la accesibilidad.
- **tableSchema:** capacidad de 1 a 50 y personas entre 0 y capacidad; estado permitido.
- **reservationSchema:** nombre, teléfono con 7–15 dígitos reales, fecha, hora, personas 1–50, mesa opcional, comprobante Turnstile opcional en formato y website vacío como trampa para bots. La obligación real de Turnstile se comprueba aparte según entorno.
- **feedbackSchema:** estrellas enteras de 1 a 5, comentario máximo 1000 caracteres y protección de formulario.
- **eventSchema:** tipo permitido, destino simple/compuesto y sesión UUID. La API comprueba además que el destino existe y está permitido.
- **roleSchema/reservationStatus:** listas cerradas de roles administrativos y estados de reserva. No basta escribir otro nombre en un formulario para conseguir un permiso.

## Tablas operativas

[0001_initial.sql](../migrations/0001_initial.sql) crea los registros:

- **users:** id, business_id, email, password_hash y role. Las cuentas administrativas pertenecen a un negocio; el correo es único en esta tabla.
- **sessions:** token_hash, user_id, csrf y expires_at. Guarda huella de sesión y vencimiento, no la cookie original.
- **dining_tables:** id/business_id, name, capacity, people y status. Su identidad combina negocio y mesa.
- **reservations:** id/business_id/table_id, name, phone, start_at/end_at, people, status y created_at. Las fechas numéricas representan milisegundos desde un origen común, no texto presentado al cliente.
- **feedback:** id/business_id, rating, comment y created_at.
- **events:** id/business_id, type, target, channel, session_hash, bucket y created_at. bucket identifica ventana de 30 minutos. Una restricción evita duplicados del mismo evento/sesión/ventana.
- **rate_limits:** key, hits y expires_at. Controla número de intentos y vencimiento; no es una lista de clientes.
- **audit_log:** id/business_id, actor_id, action, target y created_at. Registra quién ejecutó una acción interna y sobre qué recurso.

Los tipos TypeScript Content, LinkButton, Product, Table, Reservation, EventInput y PublicData describen datos para el compilador. No reemplazan validación de servidor. PublicData contiene businessId, version, content, mesa detectada y clave pública Turnstile. La respuesta de mesa pública solo incluye id/name, aunque el tipo actual la declara con Table; no debe asumirse que el cliente recibe capacidad u ocupación por esa ruta.

## Protecciones dentro de D1

Una referencia (foreign key) evita relacionar una reserva con una mesa inexistente. Una restricción CHECK rechaza valores imposibles aunque alguien intente escribir por otro camino. Un índice acelera búsquedas. Un trigger es una revisión automática justo antes de escribir:

- **reservation_insert_guard:** comprueba mesa/capacidad y ausencia de superposición al crear pendientes/confirmadas.
- **reservation_update_guard:** vuelve a comprobar al modificar una reserva activa, excluyendo la propia reserva de la comparación.
- **table_update_guard:** evita reducir capacidad o dejar fuera de servicio una mesa con reservas incompatibles. [0002_expired_tables.sql](../migrations/0002_expired_tables.sql) lo reemplaza para ignorar reservas cuyo final ya pasó.

Las migraciones tienen orden: aplicar 0001 y luego 0002. No se debe editar una migración ya aplicada para arreglar una base existente; se agrega una nueva.

## Datos que requieren cuidado

Nombre y teléfono de reservas son personales; correo y hash son datos de cuentas. No pegarlos en issues, capturas públicas o repositorios. El borrado programado conserva eventos/reservas 90 días, opiniones 180 y auditoría 365; para reservas cuenta desde el final, no desde la solicitud. Las cuentas no tienen un borrado automático configurado.

Respaldar código, D1 e imágenes por separado. Restaurar solo código no restaura precios editados ni fotografías cargadas.

## Cuentas de cliente y migración 0003

[0003_customer_accounts.sql](../migrations/0003_customer_accounts.sql) agrega customers (id, business_id, email, password_hash, created_at) y customer_sessions (token_hash, customer_id, csrf, expires_at). Añade account_id opcional a reservations: las nuevas solicitudes lo toman de la sesión, las antiguas lo dejan vacío. No se asignan reservas anteriores por nombre o correo. Un índice acelera la consulta de cuenta.

customer_email_guard y user_email_guard evitan insertar un correo ya usado por el otro grupo. Son protección de inserciones, no un sistema general de edición de correos: no existe esa función de edición. Las cuentas de cliente no tienen columna de rol elegible; la autenticación las identifica siempre como cliente. Role incluye cliente en TypeScript, pero roleSchema para creación de equipo conserva solo superadmin/propietario/personal.

**loginSchema** valida correo, quita espacios y lo transforma a minúsculas; exige contraseña de 1 a 128 caracteres para comprobar cuentas existentes. **registrationSchema** exige mínimo 14, valida campos anti-bot y rechaza propiedades adicionales como role. **SessionUser** describe id/email/role/csrf para el navegador.

account_id no tiene una referencia obligatoria a una sola tabla porque puede pertenecer a cliente o equipo. El servidor lo determina y filtra por negocio; no acepta que el solicitante elija dueño. Las cuentas no expiran con las reservas. Agregar eliminación de cuentas requerirá tratar expresamente sus relaciones y retención.
