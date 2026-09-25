# Reporte de la web — Cocinería Mary

Fecha: 25 de septiembre de 2026. Estado: beta funcional local. Este informe describe lo comprobado; no equivale a una certificación ni a un despliegue productivo.

## Qué puede hacer hoy

La web presenta el restaurante, carta con búsqueda y categorías, productos disponibles/agotados, enlaces configurables, un espacio patrocinado y guía de negocios con páginas individuales. Incluye formularios de reservas y opiniones privadas. Está adaptada a teléfono y escritorio.

La administración dispone de autenticación y roles, edición de contenido, productos, categorías, botones, promoción y negocios recomendados. Permite subir imágenes, organizar bloques, gestionar mesas, generar QR, revisar reservas, opiniones, estadísticas y auditoría. El superadministrador puede crear usuarios.

La personalización incluye seis familias de fuentes para títulos y textos por separado, color de títulos, texto, texto secundario y letras de botones, color principal y acento, fondo de página y tarjetas. Hay tres temas iniciales: Mary natural, Mar y arena y Noche cálida. Se conservan logo, portada, imágenes, textos, orden y visibilidad configurables. Algunos encabezados de bloques también pueden editarse. No es un editor de posiciones libres ni admite fuentes subidas por el usuario.

La vista previa muestra un borrador móvil, resalta la sección seleccionada y enumera cambios sin publicarlos ni registrar eventos. Guardar publica; descartar vuelve al contenido cargado. Los archivos de imagen se almacenan al subirlos aunque después se descarte el borrador.

## Reservas, métricas y privacidad

Reservas con duración fija de 90 minutos, capacidad validada y restricciones de base de datos contra solapamientos. Pendientes requieren confirmación; canceladas/finalizadas son terminales. No existe todavía calendario estructurado de horarios, cierres ni confirmación automática por mensajes.

Las estadísticas registran eventos deduplicados por sesión/ventana de 30 minutos, visitas, anuncios, enlaces y accesos QR. Los clics a WhatsApp no se presentan como mensajes enviados. Reportes diarios, semanales y mensuales visibles y descargables. La entrega automática por WhatsApp es un adaptador de prueba sin envío.

Analytics no identifica personas, pero las reservas sí almacenan nombre y teléfono. Los comentarios no se publican. Los límites por IP pueden afectar a varios clientes bajo la misma Wi-Fi; deben calibrarse durante la beta. Un escaneo se mide como acceso a la URL de mesa, no como prueba física de lectura del QR.

## Calidad comprobada

- 42 pruebas unitarias/de integración aprobadas: permisos, validación, reservas, contraste, estadísticas, D1, R2, sesiones y Pages.
- 6 recorridos de navegador aprobados: carta móvil, búsqueda/categorías, recomendado, feedback/reserva, administración/guardado/restauración, QR/reportes/logout, escritorio, vista previa y diseño.
- Lint, TypeScript estricto y compilación de producción correctos.
- Auditoría npm: cero vulnerabilidades conocidas en el momento de la consulta.
- Revisión visual móvil y escritorio; corregida superposición del título con la imagen al cambiar fuentes.
- Paquete público principal: aproximadamente 79,22 kB gzip; CSS 6,53 kB gzip. Administración y QR se cargan por separado. Estos tamaños no son una puntuación Lighthouse.

Las pruebas de navegador se ejecutaron en Edge con tamaños de pantalla simulados; no sustituyen pruebas en dispositivos iOS/Android físicos. No se midieron Lighthouse ni rendimiento de Workers en producción.

## Qué falta antes de abrir al público

1. Configurar cuenta y recursos Cloudflare, dominio, secretos, Turnstile, usuario de producción y verificar HTTPS. Instrucciones en DEPLOYMENT.md.
2. Reemplazar platos/precios/contactos/horarios/dirección e imágenes de ejemplo por datos aprobados del restaurante. Revisar cada enlace antes de retirar el aviso demo.
3. Medir el costo de CPU del login seguro en el plan real de Workers. La configuración scrypt podría exceder el plan gratuito; no se garantiza costo cero.
4. Respaldar D1/R2, ensayar restauración, definir atención de reservas y aviso de privacidad, y probar con clientes/dispositivos reales.
5. Comprobar metadatos al compartir y Lighthouse bajo HTTPS. Usar imágenes JPG/WebP reales para vistas sociales, no depender de los SVG de muestra.

Mejoras futuras: recuperación de contraseña y gestión/revocación de usuarios, calendario de cierres, limpieza de imágenes huérfanas, protección antifraude publicitario más avanzada, acceso separado de anunciantes a reportes, Google Drive y entrega oficial WhatsApp Business. La base tiene businessId, pero la gestión central de múltiples restaurantes y dominios aún no está construida.

No se publicaron cambios en GitHub ni se desplegó la web. No se contrataron servicios.

## Actualización posterior: documentación y cuentas

Se agregó documentación completa para principiantes en docs/README.md y acceso común en /cuenta. Registro de clientes y consulta de reservas propias; solo sesiones válidas pueden reservar. El enlace administrativo aparece únicamente para el equipo dentro de Mi cuenta. Permanecen pendientes verificación de correo, recuperación y eliminación autoservicio de cuentas. Las cuentas administrativas existentes y reservas históricas se conservan. Los tamaños y conteos anteriores corresponden a la revisión anterior; el CHANGELOG registra la verificación más reciente.
