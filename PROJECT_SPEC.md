# Cocinería Mary — especificación y decisiones

## Ampliación: vista previa de edición

El panel incorpora una vista móvil del borrador en un marco separado, con resumen de campos modificados y resaltado de la sección activa. Se reutiliza la interfaz pública; los cambios solo se publican al guardar. El borrador se transmite exclusivamente en memoria entre marcos del mismo origen, sin almacenamiento adicional ni eventos de analytics. Los formularios de la vista previa no envían solicitudes. En teléfono el cuadro se puede plegar. La política de embedding permite únicamente la ruta de preview dentro del propio sitio.

## Inspección (2026-09-25)

Repositorio original: Xupaya81/Cocineria_mary, rama main. README mínimo, licencia MIT, app.py y frontend/index.html vacíos; no hay aplicación ni dependencias previas. Se conserva la licencia y app.py. Copia de trabajo en outputs/Cocineria_mary. Node 22, npm, Git y Cursor disponibles. No hay credenciales Cloudflare configuradas por este proyecto.

## Producto solicitado

Carta móvil intuitiva para Cocinería Mary y base reutilizable multi-negocio. Portada con identidad editable, Ver Carta y botones genéricos (texto, icono, URL, orden, visibilidad, estilo, acción). Bloques ordenables: hero, botones, carta, promoción, recomendaciones, mapa, feedback y footer. Editor de textos, imágenes, colores, fondo y tipografía mediante configuración estructurada, sin coordenadas CSS almacenadas.

Categorías y productos configurables: nombre, descripción, precio, imagen, disponibilidad, etiquetas y orden; agotados ocultables. Un solo espacio patrocinado con vigencia. Guía /recomendados y páginas individuales con catálogo esencial, contacto, botones reutilizables y enlaces Maps. Dónde comer deshabilitado por defecto.

Administración separada y responsive: configuración, bloques, botones, categorías, productos, promociones, recomendados, mesas, reservas, feedback y estadísticas. Roles superadmin, propietario, personal con autorización del servidor. Mesas con capacidad, ocupación, estado y QR /m/:id. Reservas con fecha/hora, personas, nombre, teléfono, mesa opcional y estados pendiente/confirmada/cancelada/finalizada; prevenir exceso de capacidad y solapamientos. Feedback privado de 1–5 estrellas con comentario opcional y protección de abuso.

Analytics propio sin identificar personas: visitas, impresiones, clics por destino y accesos desde QR de mesa. Nunca llamar mensajes enviados a clics de WhatsApp. Sesión anónima efímera para deduplicar. Reportes día/semana/mes y adaptador ReportDeliveryProvider de prueba, sin envío no oficial. StorageProvider con R2 y posibilidad futura de Drive, sin OAuth en esta beta. QR estándar generado localmente con biblioteca abierta.

## Decisiones técnicas

- React + TypeScript estricto + Vite; API Hono + Zod, Worker, D1, R2. Cloudflare Pages como objetivo explícito de hosting; no se utilizará Sites como alojamiento alternativo.
- Una instalación inicial con businessId en registros y sesiones. Contenido editorial validado como documento JSON versionado por negocio; operaciones de reservas, mesas, usuarios, métricas, feedback y auditoría en tablas propias. Evita un CMS sobredimensionado y permite migración futura.
- Mismo origen /api mediante proxy Pages en producción y proxy Vite local. Cookies HttpOnly, Secure en HTTPS y SameSite Strict, sesiones de 8 horas, comprobación Origin en escrituras y token CSRF administrativo. Sin CORS abierto.
- Contraseñas scrypt mediante implementación mantenida compatible con Workers (parámetros documentados); secretos fuera de Git. Usuarios locales creados por utilidad, sin contraseña universal en seed.
- Reservas de 90 minutos en zona America/Santiago. Restricciones atómicas en SQLite además de validación de servicio. Disponibilidad separada de React.
- Edición mediante formularios y botones subir/bajar; no se incorpora drag-and-drop en la primera versión.
- Precios de ejemplo explícitos; contactos y dirección reales pendientes, no inventados. Recursos gráficos originales y placeholders identificados.
- Validación de servidor, SQL preparado, límites de cuerpo, rate limits persistentes, Turnstile opcional local y obligatorio para formularios públicos en producción, validación binaria de imágenes, CSP y audit log.
- Pruebas unitarias y de integración; prueba de flujos reales con navegador. Documentar lo que no se pueda verificar sin cuenta externa.

## Secuencia / aceptación

### Fase beta cerrada solicitada

Preparar una instalación remota separada y privada para Piter/equipo, sin lanzamiento público ni compras. Rate limiting combinado para Wi-Fi compartida; reset manual por superadmin con reautenticación, auditoría y cierre de sesiones. Conservar scrypt y medirlo antes de decidir plan. Bloquear beta con Cloudflare Access validado en Pages; usar dominio temporal y Worker privado mediante service binding. D1 nueva con las tres migraciones y seed ficticio, R2 vacío inicialmente; no importar estado local sin revisión previa. Respaldar/verificar D1 e inventariar R2 antes de crear recursos. Drive, pagos, WhatsApp Business, portal de anunciantes y administración central multi-restaurante quedan fuera. Configuración local preservada.

1. Base y tooling; 2. carta pública funcional y seed; 3. API/modelos; 4. autenticación/admin; 5. editor; 6. mesas/reservas; 7. guía local; 8. métricas; 9. feedback; 10. reportes; 11. pruebas y correcciones; 12. revisión móvil/accesibilidad/seguridad; 13. despliegue documentado.

Primera entrega: abrir carta desde teléfono, categorías, productos, botones dinámicos, promoción y guía; frontend/API locales con seed y estructura de administración. Continuar con administración al verificarla. No comprar, publicar secretos ni destruir archivos existentes. Credenciales, dominio y datos reales serán configurados por el propietario antes de publicación.

## Decisiones de revisión — 2026-09-25

- Tipografía separada para títulos y cuerpo con seis familias locales, sin fuentes externas ni editor arbitrario de CSS. Colores de títulos, cuerpo, texto secundario, botones, fondos y tarjetas; presets claro/oscuro. Contraste comprobado en servidor y cliente. Valores predeterminados para contenido previo.
- Página y vista previa usan el mismo filtrado de publicación y el mismo módulo visual. Formularios y analytics permanecen inactivos dentro del preview.
- Reserva pendiente → confirmada/cancelada; confirmada → cancelada/finalizada (solo desde su inicio). Cancelada y finalizada no se reabren. Actualización concurrente protegida por estado previo.
- Reportes de clics agrupan canales sin afirmar mensajes enviados. La operación es beta local; límites y pendientes documentados en REPORTE_WEB y SECURITY.

## Cambio solicitado: acceso común y reservas con cuenta

La petición posterior reemplaza la reserva anónima: la carta y el feedback siguen públicos, reservar exige sesión. Pantalla /cuenta con correo/contraseña, registro público de clientes y Mis reservas. Las credenciales administrativas existentes sirven en el mismo acceso; solo roles del equipo ven Abrir administración. Las rutas administrativas siguen autorizadas en backend, independientemente de su visibilidad.

Clientes y sus sesiones se almacenan separados del equipo para conservar restricciones de roles existentes sin reconstruir tablas de usuarios. Un nuevo account_id vincula reservas a la sesión real; no se reasignan datos históricos por similitud. Autoregistro no permite roles. Registro con Turnstile en producción y rate limiting; sin envío/verificación de correo ni recuperación automática en esta beta. No se contrató proveedor externo.
