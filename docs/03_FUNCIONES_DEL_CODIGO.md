# Catálogo de funciones del código

[Volver al índice](README.md)

Una función puede devolver datos, producir una pantalla o provocar un efecto, como guardar un registro. Las entradas de un componente se llaman `props`; son los datos que recibe de otro componente. Aquí se cubren las funciones propias con nombre, los métodos y las tareas importantes sin nombre. Los controladores de API se describen individualmente en [API explicada](05_API_EXPLICADA.md).

## Entrada y comunicación

En [main.tsx](../frontend/src/main.tsx), **App()** no recibe datos externos: mira la dirección actual, carga contenido y decide entre web pública, panel y preview. Devuelve la pantalla correspondiente o un aviso de carga/error. Sus efectos solicitan contenido y aplican diseño cuando llega la respuesta. `createRoot(...).render(...)` monta esa pantalla dentro del HTML inicial.

En [api.ts](../frontend/src/api.ts):

- **setCsrf(value)** recibe la clave de protección de la sesión y la conserva en memoria para posteriores escrituras. No la publica.
- **api(path, options)** recibe una ruta y opciones de lectura/escritura. Adjunta cookie del mismo sitio y protección CSRF, envía la solicitud, interpreta JSON y devuelve datos. Si el servidor responde un error, lo convierte en un mensaje que puede mostrar la pantalla. Es asíncrona: hay que esperar su resultado.
- **track(type, target)** recibe el tipo de evento y su destino. Recupera o crea una sesión temporal de 30 minutos y manda el evento. No devuelve confirmación de una acción externa. Omite eventos en `/admin/preview` y absorbe fallos para no bloquear la carta.

En [id.ts](../frontend/src/id.ts), **randomId()** genera un UUID aleatorio. Utiliza Web Crypto también cuando no existe `crypto.randomUUID` en la conexión local del teléfono. No se usa el nombre ni el teléfono de una persona.

En [theme.ts](../frontend/src/theme.ts), **applyTheme(content)** recibe configuración y escribe variables CSS para letras y colores. Cambia la apariencia del documento del navegador; no guarda en la base. La vista previa tiene su propio documento, por eso su tema no modifica los controles del panel.

## Piezas reutilizables

En [components.tsx](../frontend/src/components.tsx):

- **LinkButtons({buttons, owner})** recibe una lista de botones y el identificador de su negocio. Filtra activos, ordena, elige iconos y construye enlaces. Al pulsarlos intenta contar un clic. El valor predeterminado de owner es mary; la página principal pasa su businessId explícito.
- **ErrorNotice({message})** construye un aviso accesible si existe mensaje; con texto vacío no muestra nada.
- **Empty({children})** coloca un contenido dentro de una tarjeta de estado vacío. `children` significa lo que se pone dentro de ese componente.
- **money(value)** recibe un número y devuelve texto en pesos chilenos, sin decimales. No cambia el precio almacenado.

## Página pública

En [PublicApp.tsx](../frontend/src/public/PublicApp.tsx):

- **PublicApp({data, pathOverride, preview})** recibe datos públicos. Decide si mostrar portada, guía, reserva, perfil o página no encontrada. Ordena los bloques visibles. Puede recibir una ruta simulada para preview. En uso normal actualiza el título del navegador y registra visitas; no lo hace en modo preview.
- **Menu({content})** recibe carta y categorías. Conserva temporalmente búsqueda/categoría elegidas, filtra productos, ordena y dibuja tarjetas. No consulta al servidor cada vez que se busca.
- **Promotion({content})** muestra el anuncio recibido o nada si no existe. Observa cuándo al menos la mitad del bloque entra en pantalla para intentar registrar una impresión una vez durante ese montaje. Su enlace registra un clic separado.
- **Recommendations({content, full})** muestra tarjetas de negocios. Con full habilita la guía completa y su filtro de categorías; en la portada muestra una invitación y enlace para ver todos.
- **Location({name, address, url, owner})** recibe datos de ubicación. Muestra un mapa basado en address cuando hay dirección y enlace, o una tarjeta informativa. El enlace abre la URL configurada y registra clic a Maps. No usa una API de pago configurada en el proyecto.

En [Forms.tsx](../frontend/src/public/Forms.tsx):

- **BotCheck({siteKey, action, onToken})** prepara el control Turnstile cuando existe clave pública. Su función interna **render()** crea el control y entrega el comprobante a onToken. Al vencer lo vacía; al desmontarse elimina el control. Sin clave pública no dibuja un control.
- **Feedback({siteKey})** construye estrellas y comentario. Al enviar recoge campos, comprobante anti-bots y campo trampa, solicita `/feedback` y muestra éxito/error. Un fallo limpia el comprobante y recrea el control para reintentar.
- **Reservations({siteKey, demo})** consulta primero la sesión; sin ella presenta un enlace de acceso. Con sesión prepara CSRF y construye el formulario de reserva. Envía nombre, teléfono, fecha, hora y personas; muestra solicitud recibida o error. demo añade el aviso de que no es una reserva atendida por el restaurante. No asigna la mesa en el navegador.

## Administración y edición

En [Admin.tsx](../frontend/src/admin/Admin.tsx):

- **Admin()** coordina sesión, sección elegida, contenido cargado, versión, borrador, guardado y permisos visuales. Renderiza login si no hay sesión. Los permisos reales se comprueban además en el servidor.
- **acceptUser(u)** recibe usuario y clave CSRF; activa la sesión de la interfaz y dirige al personal a Mesas.
- **handler(e)** es el aviso de salida cuando hay cambios pendientes: solicita al navegador una advertencia antes de cerrar/recargar. El navegador decide cómo mostrarla; no guarda un respaldo.
- El login se delega al componente AuthPanel compartido; el de guardar valida y envía contenido/version, actualiza la copia guardada y conserva ediciones posteriores si las hubo. El de descartar repone la copia guardada después de confirmar. El de logout elimina sesión en servidor y memoria; muestra errores si no pudo hacerlo.

En [Fields.tsx](../frontend/src/admin/Fields.tsx):

- **uid()** obtiene los primeros ocho caracteres de randomId para nuevos elementos editoriales. El servidor revisa duplicados al guardar; no sustituye la clave criptográfica de sesiones.
- **Field({label, value, onChange, type})** dibuja un campo con etiqueta. Al escribir entrega el nuevo texto a onChange; quien lo recibe decide cómo guardarlo.
- **Check({label, value, onChange})** hace lo mismo para una casilla de sí/no.
- **ImageField({label, value, onChange})** ofrece URL y selección de foto. Su controlador asíncrono valida tamaño inicial, reduce dimensiones, convierte a WebP, sube y entrega la dirección resultante. Conserva la versión más reciente de onChange para no reemplazar otros cambios hechos durante la subida.

En [Editor.tsx](../frontend/src/admin/Editor.tsx):

- **Moves({index, length, onMove, onDelete})** construye Subir/Bajar y opcionalmente Eliminar. Desactiva movimientos fuera de la lista y confirma eliminación. Avisa al componente padre; no llama a la API.
- **reorder(items, i, offset)** intercambia un elemento con el anterior/siguiente en una copia y recalcula los números de orden. Devuelve la lista nueva.
- **ButtonsEditor({buttons, onChange})** edita campos y orden de botones de restaurante o recomendado. Su auxiliar **patch(p)** combina los campos cambiados con el botón elegido y devuelve la lista nueva.
- **Editor({section, content, onChange})** elige el formulario de cada sección. Su auxiliar **set(key, value)** sustituye una parte del borrador. Los auxiliares **patch(changes)** o **patch(v)** de productos, promoción y recomendados combinan cambios parciales sin borrar los demás campos. Son funciones locales distintas con el mismo nombre descriptivo.
- Los controladores de añadir crean valores iniciales; los de quitar eliminan de la copia tras confirmar. Categorías comprueba productos asociados antes de eliminar. Estos eventos no publican hasta Guardar cambios.

En [ThemeEditor.tsx](../frontend/src/admin/ThemeEditor.tsx), **ThemeEditor({content, onChange})** construye selectores, temas y muestra tipográfica. Su **set(key, value)** cambia una propiedad del borrador; elegir un preset combina varias. No descarga fuentes ni publica automáticamente.

## Borrador y vista previa

En [draftChanges.ts](../frontend/src/admin/draftChanges.ts):

- **equal(a, b)** compara representaciones JSON; responde verdadero si coinciden según esa representación.
- **fields(before, after)** compara campos de un elemento y devuelve sus nombres legibles separados por comas, omitiendo el ID.
- **draftChanges(saved, draft)** compara configuración, listas y promoción. Devuelve descripciones de añadidos, modificaciones y eliminados. No es un historial de base de datos: se recalcula entre dos copias en memoria.

En [DraftPreview.tsx](../frontend/src/admin/DraftPreview.tsx), **DraftPreview({content, saved, section})** dibuja marco móvil y resumen. **send()** envía el borrador al marco después de cargar. **ready(event)** escucha su aviso de estar preparado y reenvía datos solo si origen y ventana coinciden. Sus efectos mantienen tamaño proporcional y envían cambios cuando se edita; los observadores se retiran al desmontarse.

En [PreviewApp.tsx](../frontend/src/admin/PreviewApp.tsx), **PreviewApp()** es la página dentro del marco. **receive(event)** acepta solo mensajes del padre y mismo origen. Sus efectos aplican tema, restablecen ruta al cambiar de sección, resaltan el bloque y desplazan el marco a él. Los controladores de captura bloquean formularios y enlaces externos; las rutas internas se simulan. El contenido se filtra con publicContent antes de dibujarlo. Usa mary como identificador de esta beta dentro del preview, sin estadísticas.

## Operaciones del restaurante

En [Operations.tsx](../frontend/src/admin/Operations.tsx):

- **Tables()** carga las mesas y presenta formularios y estados. Su **save(table)** manda una mesa a la API y actualiza la tarjeta con la respuesta o muestra un error. Generar QR carga la biblioteca qrcode solo cuando se necesita y codifica una URL estándar.
- **dateTime(n)** recibe milisegundos y devuelve fecha/hora legible en America/Santiago.
- **ReservationsAdmin()** carga reservas. Usa reservationTransitions para ofrecer estados válidos y envía el cambio al servidor antes de reflejarlo en pantalla.
- **FeedbackAdmin()** carga opiniones privadas y construye tarjetas con estrellas, comentario y fecha.
- **Reports({partners})** conserva período y negocio elegidos, carga métricas y presenta el mensaje preparado. Descarta respuestas de filtros anteriores que lleguen tarde. Descargar crea un archivo de texto local y libera después su dirección temporal.
- **Audit()** carga y presenta los registros recientes de acciones administrativas; no permite revertirlos.
- **Users()** envía nueva cuenta con correo, contraseña y rol; limpia correo/contraseña tras éxito. No lista ni elimina usuarios.

En [Dialog.tsx](../frontend/src/admin/Dialog.tsx), **Dialog({children, onClose})** abre un diálogo nativo al aparecer, lo cierra al retirarse y comunica Escape/clic de fondo. El navegador maneja foco y bloqueo del resto de la pantalla mientras permanece abierto.

## Reglas compartidas

En [rules.ts](../shared/rules.ts):

- **canManage(role, area)** recibe rol y área; devuelve permiso sí/no. No cambia datos.
- **overlaps(start, end, otherStart, otherEnd)** compara intervalos. Límites contiguos no se superponen; compartir parte del tiempo sí.
- **availableTables(tables, reservations, people, start, end)** devuelve mesas suficientes, no fuera de servicio y sin reserva pendiente/confirmada superpuesta. Ordena por menor capacidad. No cambia su estado físico ni combina mesas.
- **localDateTime(date, time)** transforma fecha/hora de Chile continental en milisegundos. Prueba desfases UTC de tres/cuatro horas y comprueba coincidencia; rechaza horas inexistentes. Ante una hora repetida de cambio estacional devuelve la primera alternativa válida que prueba.
- **periodStart(period, now)** calcula inicio de hoy, semana desde lunes o mes en Chile. Usa 01:00 si la medianoche no existe por cambio horario. now permite probar fechas sin esperar a ese día.
- **promotionActive(p, now)** devuelve si existe promoción, está activa y hoy cae entre sus fechas incluidas.
- **reservationTransitions(status, startAt, now)** devuelve próximos estados permitidos. No ejecuta la transición ni modifica el registro.

En [contrast.ts](../shared/contrast.ts), **contrast(a, b)** calcula la razón de contraste entre dos colores hexadecimales. Su **luminance(hex)** transforma los canales rojo/verde/azul en brillo perceptual. Se usa para validar legibilidad, no para escoger colores automáticamente.

En [publicContent.ts](../shared/publicContent.ts), **publicContent(content)** devuelve una copia filtrada: categorías activas, productos correspondientes, agotados según preferencia, negocios permitidos, botones activos y promoción vigente. Mantiene los bloques con su visibilidad para que el render decida mostrarlos.

En [schema.ts](../shared/schema.ts), **text(max)** crea una regla reutilizable de texto: quitar espacios en los extremos y limitar longitud. Los demás nombres Schema son reglas de validación, explicadas en [Datos y reglas](04_DATOS_Y_REGLAS.md); sus comprobaciones internas son funciones sin nombre que aceptan/rechazan valores.

En [theme.ts](../shared/theme.ts) no hay funciones: fontOptions, themeDefaults y themePresets son listas/configuraciones. FontKey describe las claves de fuentes admitidas.

## Contenido, seguridad y archivos en servidor

En [content.ts](../worker/content.ts), **getContent(env)** busca el negocio configurado y devuelve contenido validado más versión. Completa valores predeterminados del esquema. Si no existe, devuelve error de servicio pendiente; no crea el seed automáticamente.

En [security.ts](../worker/security.ts):

- **hex(bytes)** convierte bytes en texto hexadecimal.
- **token()** genera 32 bytes aleatorios y los convierte a texto; sirve para sesiones y CSRF.
- **digest(value)** calcula SHA-256 y devuelve una huella. No permite recuperar el valor original mediante descifrado; no es el algoritmo usado para contraseñas.
- **passwordHash(password)** usa scrypt con salt aleatorio y devuelve parámetros, salt y resultado. Se guarda esa representación, nunca la contraseña original.
- **verifyPassword(password, encoded)** recalcula con el salt/parámetros aceptados y compara el resultado sin cortar la comparación al primer carácter diferente. Devuelve sí/no.
- **security**, un controlador creado con createMiddleware, aplica cabeceras y comprueba origen y formato de solicitudes de escritura. Middleware significa paso de control que se ejecuta antes/después del destino solicitado.
- **authenticate**, otro middleware, busca sesión vigente, negocio y usuario primero del equipo y después de clientes. En escrituras exige la clave CSRF. Deja al usuario disponible para la ruta siguiente o rechaza acceso.
- **permit(area)** construye un control para esa área usando canManage; restringe al usuario ya autenticado.
- **rateLimit(c, scope, max, seconds)** cuenta intentos por tipo de acción/IP/ventana mediante una clave hash. Rechaza exceso con 429 y exige secreto en producción. Distintos clientes bajo una misma Wi-Fi pueden compartir el límite.
- **verifyBot(c, value, action)** consulta Turnstile y comprueba éxito, hostname y acción. Puede omitirse en desarrollo sin secreto; producción no lo omite.
- **audit(env, user, action, target, onlyIfChanged)** prepara una escritura de auditoría. Devuelve una sentencia lista para ejecutar: el llamador debe usar `.run()` o incluirla en un batch. onlyIfChanged usa el resultado de la sentencia anterior en el mismo batch; evita registrar un cambio que no ocurrió.

En [storage.ts](../worker/storage.ts):

- **StorageProvider** es un contrato: quien guarde archivos debe ofrecer put y get. No realiza nada por sí solo.
- **R2StorageProvider** recibe el bucket (contenedor de archivos) en su constructor.
- **put(key, data, mime)** guarda bytes con tipo y política de caché; no publica el bucket administrativo.
- **get(key)** devuelve el objeto R2 o ausencia. La ruta pública decide cómo responder al navegador.
- **validateImage(file)** revisa tamaño, extensión, MIME y firma; devuelve bytes, tipo y extensión aceptada o un error. No es un antivirus ni una decodificación completa de la imagen.

## Reportes, entrada del Worker y Pages

En [reports.ts](../worker/reports.ts), **reportMessage(rows)** suma cantidades por tipo/canal y devuelve una frase, o un aviso de ausencia de actividad. **ReportDeliveryProvider** es el contrato para un envío futuro. **PreviewReportDeliveryProvider.deliver(report)** recibe nombre/texto y devuelve el mensaje con `sent:false`, sin contactar WhatsApp. metricLabels traduce claves a etiquetas comprensibles.

En [index.ts](../worker/index.ts), los pasos iniciales aplican seguridad y límites de tamaño, conectan rutas y convierten errores en respuestas JSON. **fetch**, delegada a Hono, recibe cada petición. **scheduled(event, env)** ejecuta limpieza por lotes: sesiones/límites vencidos, eventos y reservas antiguos, opiniones y auditoría. Es una tarea programada, no se ejecuta por abrir el panel. Requiere que Cloudflare la programe o el emulador la invoque.

En [functions/[[path]].ts](../functions/%5B%5Bpath%5D%5D.ts):

- **escape(s)** transforma caracteres especiales para colocar texto editorial en HTML/XML como texto, sin convertirlo en etiquetas ejecutables.
- **onRequest(context)** reenvía `/api`, sirve archivos, genera robots/sitemap y agrega título, descripción, canonical y OpenGraph a páginas. Marca admin como noindex y aplica cabeceras. Decide 200/404 según ruta y negocios conocidos. Si no puede cargar la API, usa información básica; la web mostrará el fallo al pedir datos. No produce renderizado completo del contenido React en servidor.

## Scripts manuales

En [seed.mjs](../scripts/seed.mjs), **escape(s)** duplica comillas para los datos del SQL generado. La tarea principal escribe seed.sql y lo ejecuta localmente con INSERT OR IGNORE; no reemplaza registros existentes. [seed-data.mjs](../scripts/seed-data.mjs) contiene datos ficticios, no funciones. Su declaración `.d.mts` ayuda a TypeScript a reconocer el formato esperado, pero no valida por sí sola los datos.

En [create-admin.mjs](../scripts/create-admin.mjs), **esc(s)** protege comillas del correo usado en el archivo SQL temporal. La tarea lee variables de entorno, genera salt/hash, inserta una cuenta y elimina el SQL temporal al terminar el intento. Selecciona producción solo con --remote. No imprime la contraseña ni implementa recuperación de cuentas existentes.

En [art.mjs](../scripts/art.mjs), **shell(body, bg)** envuelve formas SVG en una imagen con fondo/patrón. La tarea genera ilustraciones originales desde formas escritas en el código. Ejecutarla sobrescribe los archivos gráficos que genera; no es necesaria para editar la carta en el panel.

## Funciones auxiliares de pruebas y tareas sin nombre

En [api.test.ts](../tests/api.test.ts), **request(path, method, body, auth, extra)** envía peticiones al Worker aislado del test; **send(body)** serializa formularios de imagen para probar R2. En [pages.test.ts](../tests/pages.test.ts), **context(path, custom)** fabrica un entorno Pages de prueba con respuestas simuladas. No deben utilizarse como conexiones de producción.

`describe` agrupa pruebas, `it`/`test` ejecutan casos, `beforeAll` prepara y `afterAll` limpia. Sus funciones sin nombre documentan escenarios en el texto de cada prueba. Los archivos de reglas, borradores y revisión comparan resultados; E2E abre el navegador, actúa como usuario, comprueba y restaura sus cambios temporales.

En React, **onClick**, **onChange** y **onSubmit** son nombres de eventos: las funciones escritas allí indican qué hacer al pulsar, editar o enviar. **useEffect** registra tareas asociadas a cambios y su limpieza; no equivale a guardar. **map** transforma cada elemento, **filter** selecciona y **sort** ordena. Sus pequeñas funciones de flecha se explican junto al componente al que pertenecen; no son módulos independientes.

## Acceso común y cuentas (añadido durante esta documentación)

En [AuthPanel.tsx](../frontend/src/account/AuthPanel.tsx), **AuthPanel({onAuthenticated, siteKey, allowRegister})** construye login y opcionalmente registro. Su controlador de envío compara ambas contraseñas al registrarse, envía los campos permitidos, conserva CSRF y avisa al componente padre con onAuthenticated. El registro utiliza BotCheck con acción register y recrea comprobante después de un fallo. El formulario nunca envía una elección de rol.

En [Account.tsx](../frontend/src/account/Account.tsx), **Account({siteKey})** carga la sesión y después las reservas de esa cuenta. Su **accept(u)** guarda usuario/CSRF. Si falta sesión dibuja AuthPanel; tras autenticación vuelve a reservas únicamente cuando next vale reservas, o a /cuenta, evitando redirecciones arbitrarias. Solo muestra Abrir administración cuando canManage permite operaciones. Logout invalida la sesión y recarga la pantalla. MyReservation es la forma de los campos que esta pantalla recibe.

En [AccountLink.tsx](../frontend/src/account/AccountLink.tsx), **AccountLink({preview})** consulta si existe sesión para rotular el enlace público Iniciar sesión o Mi cuenta. No muestra un enlace administrativo. En preview no consulta la sesión.

En [worker/auth.ts](../worker/auth.ts), **startSession(c, user)** genera token y CSRF, guarda la huella en sessions o customer_sessions según rol obtenido del servidor y establece la cookie común de 8 horas. Devuelve datos mínimos para continuar. authRoutes y accountRoutes son grupos de rutas, no funciones que se llamen manualmente. Sus controladores se detallan en la guía API.

### Organización de productos en el editor

### Funciones añadidas para beta cerrada

- `visitorSession` en worker/security.ts crea o verifica una cookie firmada de una hora. Sirve para separar navegadores del mismo Wi-Fi, no para conocer la identidad de sus visitantes. `rateLimit` cuenta por operación, visitante/usuario, IP y opcionalmente correo de login; rechaza al superar cualquiera de los límites aplicables.
- `passwordResetRoutes` en worker/passwordReset.ts solo admite superadmin autenticado. Verifica su contraseña actual, busca la cuenta dentro del negocio, guarda un hash nuevo, cierra sus sesiones y deja constancia sin contraseñas. `PasswordReset` en frontend/src/admin/PasswordReset.tsx muestra el formulario, confirma ambas contraseñas nuevas y maneja espera/errores.
- `verifyBetaAccess` en shared/betaAccess.ts comprueba el pase firmado emitido por Cloudflare Access. El middleware de functions/_middleware.ts impide mostrar la beta a quien no tenga un pase válido cuando BETA_CLOSED=true. No concede permisos administrativos: esos se comprueban por separado.
- scripts/benchmark-scrypt.mjs mide la derivación en este equipo; sus números no certifican rendimiento en Cloudflare. scripts/deploy-beta-pages.mjs prepara una carpeta temporal para Pages y exige configuración de Access y cambios guardados en Git antes de subir.

En Editor.tsx, **moveWithinCategory(items, id, neighborId)** recibe la lista completa y dos identificadores de productos. Comprueba que existan y pertenezcan a la misma categoría, intercambia sus posiciones en una copia ordenada y normaliza order. Mantiene los espacios de las otras categorías. No escribe en servidor. Editor agrupa los platos en secciones desplegables por categoría y usa este auxiliar para las flechas; añadir toma la categoría de ese grupo.
