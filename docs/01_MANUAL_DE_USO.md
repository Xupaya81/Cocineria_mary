# Manual de uso de la web y el panel

[Volver al índice](README.md)

## Visitantes

La portada presenta nombre, descripción, imagen e información básica. Ver Carta lleva a los productos. Las categorías filtran la lista; la búsqueda encuentra coincidencias en nombre y descripción. Un agotado aparece marcado o se oculta según la configuración. No existe carrito ni pedido online en esta versión.

Los botones abren las direcciones configuradas. El patrocinio se identifica como tal. Recomendados muestra una guía y cada negocio tiene su página con servicios, contactos y ubicación. El mapa utiliza el texto de ubicación; conviene comprobar que coincida con el enlace de Google Maps.

Después de iniciar sesión, en Reservas se envía una solicitud, no una confirmación automática. Una opinión de 1 a 5 estrellas se entrega de forma privada al restaurante. Las opiniones no requieren cuenta; las reservas sí.

## Entrar y entender el guardado

Pulsar Iniciar sesión en la carta o abrir `/cuenta`. Clientes pueden registrarse con correo y contraseña de al menos 14 caracteres. Tras entrar ven Mis reservas. Las cuentas del equipo muestran además Abrir administración según su rol. `/admin` sigue admitiendo acceso directo protegido. Las credenciales administrativas existentes se conservan. No hay una contraseña universal en el código. Si la sesión vence, volver a ingresar; el borrador no se recupera automáticamente tras cerrar o recargar.

General, Diseño, Bloques, Botones, Categorías, Productos, Promoción y Recomendados comparten un mismo borrador. Puedes pasar de una sección a otra sin perderlo mientras el panel permanezca abierto. Guardar cambios envía todo ese borrador, no solo la sección visible.

La vista previa muestra cómo quedaría el contenido y resume diferencias. Puedes ocultarla y volver a abrirla. Permite navegar páginas internas de muestra, pero bloquea enlaces externos y envíos. No suma visitas ni clics. Si un bloque está oculto, puede aparecer un aviso para activarlo. El borrador vive en la memoria del navegador, no en GitHub.

Descartar pide confirmación y vuelve a la versión cargada. Si otra persona guardó antes, aparece un conflicto: copia lo que necesites conservar antes de recargar; no existe combinación automática de borradores. Las imágenes subidas ya se guardaron como archivos aunque descartes el texto que las usaba.

Mesas, cambios de estado de reservas y creación de usuarios se envían inmediatamente al realizar la acción correspondiente. No dependen de Guardar cambios del editor de contenido.

## General

Modificar nombre, frase de bienvenida, descripción, dirección, horario, Maps, logo y portada. Puedes pegar una dirección de imagen o subir JPG, PNG o WebP desde teléfono/computador. El navegador reduce la imagen antes de enviarla. Si la selección supera 20 MB se rechaza; el servidor admite hasta 5 MB después de procesarla. No se admiten SVG subidos.

El aviso de demostración recuerda que la información es ficticia. Ocultar productos agotados decide si desaparecen o siguen visibles con etiqueta. Habilitar Dónde comer permite mostrar negocios de esa categoría; no agrega restaurantes automáticamente.

## Diseño

Elegir una familia para títulos y otra para textos entre Georgia, Arial, Trebuchet, Verdana, Palatino y Courier. El dispositivo puede utilizar una fuente alternativa equivalente si no tiene la primera disponible. No se descargan fuentes de terceros.

Editar color de títulos, cuerpo, texto secundario y letras de botones. Cambiar color principal, acento, fondo de página y tarjetas. El nombre Mary destacado usa el acento; los demás títulos usan el color de títulos. Las ilustraciones conservan sus propios colores.

Los temas Mary natural, Mar y arena y Noche cálida cambian varias opciones juntas dentro del borrador. No publican por sí solos. Si al guardar aparece un error de contraste, elige letras más oscuras sobre fondo claro o más claras sobre fondo oscuro. Un tema inicial válido sirve como punto de partida.

## Bloques y botones

Las flechas Subir/Bajar reorganizan las secciones. La casilla de visibilidad controla su aparición en la portada. Se pueden editar el encabezado de bienvenida, título de carta, título de recomendados y despedida. Dejar esos textos vacíos recupera el texto predeterminado. Ocultar un bloque no elimina sus datos ni necesariamente deshabilita su página independiente.

Un botón tiene texto, icono, enlace, orden, visibilidad, estilo y tipo de clic. El icono es visual; el tipo de clic determina cómo se cuenta en estadísticas. Añadir, mover o eliminar queda pendiente hasta guardar. WhatsApp exige un enlace oficial. No usar números ficticios como contacto real.

## Categorías y productos

Crear primero una categoría, después sus productos. No se permite borrar una categoría que todavía tenga platos; reasignarlos o quitarlos antes. Ocultar una categoría oculta también sus productos en la respuesta pública.

Cada producto tiene nombre, descripción, precio entero en pesos chilenos, imagen, categoría, disponibilidad, etiquetas y orden. Las etiquetas admitidas son destacado, recomendación, nuevo y vegetariano. En la tarjeta actual se muestra la primera etiqueta; no son una certificación alimentaria ni una sección automática de ofertas. Las flechas cambian el orden, no el precio ni la categoría.

## Promoción y recomendados

Solo hay un espacio de promoción principal. Configurar imagen, nombre, texto, botón, enlace, fechas y estado activo. Debe estar activa y dentro de su intervalo de fechas de Chile para mostrarse. Las fechas inicial y final están incluidas. Activar el anuncio no activa automáticamente un negocio recomendado al que apunte.

Un recomendado tiene nombre, categoría, descripción, imagen, ubicación, Maps, un pequeño catálogo y botones propios. La ruta es el nombre corto de su dirección, por ejemplo `cabanas-mar-azul`. Cambiarla cambia el enlace compartido; no hay redirección automática desde la ruta antigua. Guardar como visible publica el perfil si su categoría está habilitada.

No se procesan pagos a anunciantes. Se puede filtrar su actividad en Estadísticas y descargar el reporte para compartir manualmente; no tienen un portal propio.

## Mesas y reservas

Mesas muestra estado, personas y capacidad. Elegir estado lo guarda inmediatamente; cambiar nombre/capacidad/personas requiere Actualizar. Disponible pone la ocupación actual en cero. Añadir mesa crea un registro inmediato. Ver QR abre un código para la dirección actual del sitio: el QR local no sirve como QR definitivo impreso.

Ocupación actual y reservas futuras son conceptos separados. La disponibilidad de agenda mira capacidad, fuera de servicio y reservas superpuestas; no deduce la duración de una ocupación manual ni actualiza los estados físicos automáticamente.

Las solicitudes pendientes y confirmadas bloquean 90 minutos. Se requiere al menos 15 minutos de anticipación y hasta 90 días. El sistema elige una mesa suficiente, priorizando menor capacidad; no combina mesas. El formulario público no permite elegir una mesa específica aunque la API acepta ese dato.

Pendiente puede pasar a confirmada o cancelada. Confirmada puede pasar a cancelada o, cuando haya comenzado, finalizada. Los estados terminales no se reabren. Cancelar solicitudes descartadas libera su horario. El panel muestra como máximo las 300 reservas más recientes por fecha de inicio; no incluye paginación ni edición de fecha/nombre/teléfono.

## Opiniones, estadísticas, auditoría y usuarios

Opiniones muestra hasta 200 registros recientes, con estrellas, comentario y fecha. No se publican ni se responden automáticamente.

Estadísticas permite Hoy, Esta semana y Este mes, en horario de Chile continental, y filtrar un negocio. Cuenta eventos, no personas únicas. Repetir el mismo evento durante la misma ventana de sesión puede no aumentar el total. Un clic de WhatsApp no prueba que se haya enviado un mensaje. Descargar reporte genera un archivo de texto; no lo manda a nadie.

Auditoría muestra hasta 100 acciones recientes. Usa nombres internos como `content.saved` (contenido guardado), `price.changed` (cambio de precio dentro del detalle) y `reservation.cancelada` (reserva cancelada). No es un historial restaurable de versiones.

Usuarios permite crear una cuenta con contraseña de mínimo 14 caracteres. Solo superadmin puede hacerlo. Propietario gestiona contenido, operaciones y reportes; personal gestiona mesas, reservas y opiniones. No hay aún botones para eliminar usuarios, recuperar contraseñas ni cerrar individualmente sesiones ajenas.

## Cuentas de clientes

El registro no permite elegir rol ni convertirse en administrador. No envía correo de verificación: conocer una dirección de correo no demuestra ser su dueño. Mis reservas muestra hasta 100 solicitudes realizadas con esa cuenta; las reservas previas a esta función permanecen en administración y no se asignan por coincidencia de nombre/teléfono. El personal también puede reservar con su sesión. No hay recuperación automática de contraseña, eliminación de cuenta desde pantalla ni cancelación por el cliente en esta beta. Las cuentas se conservan hasta que se gestione su eliminación; las reservas mantienen su política de 90 días desde el final.

### Productos organizados por categoría

En Productos aparecen primero las categorías plegadas y su número de platos. Pulsa una categoría para desplegar sus productos; puedes abrir varias. Las categorías inactivas se identifican como ocultas en la carta y siguen siendo editables. Añadir producto lo coloca en la categoría abierta. Las flechas de un plato lo mueven solo dentro de su categoría. Si cambias su categoría desde el formulario, aparecerá en el grupo de destino. Estos cambios siguen siendo borradores hasta Guardar cambios.
