# Cambios

## Publicación del código en GitHub — 2026-09-25

- Configurada identidad local de Git facilitada por el propietario. Desarrollo y preparación beta publicados en origin/main, commit e96ecf57bd209ae5558c4856303c5394d3839a98.
- Respaldos, bases locales, credenciales, dependencias y builds permanecen excluidos. Despliegue en Cloudflare pendiente de autenticación y configuración de acceso.

## Preparación de beta Cloudflare — 2026-09-25

- Revisados 82 archivos nuevos y 3 modificados; excluidos datos locales, credenciales, dependencias, builds y temporales. Añadidas exclusiones para bases y claves privadas.
- Nueva estrategia de rate limiting por sesión anónima firmada, usuario, cuenta de login y operación, con techo adicional por IP compartida.
- Restablecimiento de contraseña por superadmin reautenticado, auditoría y revocación de sesiones; formulario móvil y pruebas de autorización.
- Plantillas beta separadas para Worker/D1/R2 y Pages; Access con verificación JWT, bloqueo de acceso inválido y noindex. Sin recursos remotos creados.
- Respaldo local D1 restaurado y comparado por contenido de todas las tablas; integridad correcta. Inventario R2 y copia de logo verificada por SHA-256.
- Scripts de seed sin aplicación, administrador remoto beta, despliegue Pages y benchmark scrypt. Parámetros criptográficos sin cambios.
- 47 pruebas unitarias/integración, un recorrido nuevo de navegador de reset/login, lint, typecheck, build, Pages Functions y Worker dry-run aprobados.
- Commit bloqueado por falta de identidad Git. Cloudflare sin autenticar: la autorización OAuth caducó. Despliegue y pruebas reales pendientes, detallados en REPORTE_BETA_CLOUDFLARE.md y DEPLOYMENT_BETA.md.

## 2026-09-25

- Añadida vista previa móvil en vivo del borrador administrativo, resaltado de sección y resumen de cambios pendientes. Se puede ocultar y no publica ni registra eventos.
- Vista previa verificada en escritorio y móvil: cambios/reversión, plegado, separación del contenido público y bloqueo de envío de formularios. 30 pruebas unitarias/integración y 5 recorridos de navegador aprobados; typecheck, lint y build correctos. Ajuste visual final comprobado con la prueba específica de preview.
- Inspeccionado y clonado repositorio existente; archivos de aplicación vacíos.
- Registrados alcance y decisiones en PROJECT_SPEC.md antes de implementar.
- Implementados React/Vite, Worker Hono, migración D1, seed idempotente y almacenamiento R2.
- Carta pública con categorías, búsqueda, botones genéricos, promoción, guía local y arte SVG original.
- Administración con roles, sesiones, CSRF, editor de contenido/bloques, imágenes optimizadas, mesas y QR.
- Reservas de 90 minutos protegidas atómicamente contra solapamiento, feedback privado y límites de solicitudes.
- Analytics deduplicado, reportes descargables y adaptador de entrega sin envío.
- Primera compilación de producción y carga de API verificadas; revisión visual detectó y corrigió un SVG de portada inválido.
- Añadidas pruebas de reglas e integración con Workers/D1/R2; verificación final en curso.

## Revisión integral y personalización — 2026-09-25

- Nueva sección Diseño: seis fuentes para títulos/cuerpo, colores de letras/botones/fondos, tres temas y validación compartida de contraste.
- Ajustada portada móvil para tipografías anchas; títulos de bloques editables.
- Corregidos guardado concurrente, callback de subida, filtros públicos/preview, identificadores de métricas, agregación y carreras de reportes.
- Mejoradas validación de teléfono/horario y transiciones de reservas con auditoría condicional; diálogo QR accesible.
- Añadidos README, DEPLOYMENT, SECURITY y reportes de web/cambios; corregido entorno de creación remota de administrador.
- Resultado final: 42 pruebas unitarias/integración y 6 pruebas de navegador aprobadas; lint, typecheck/build correctos; npm audit sin vulnerabilidades conocidas. Sin despliegue externo ni publicación GitHub.

## Documentación pedagógica y acceso común — 2026-09-25

- Añadida guía en docs con manual de uso, recorridos, catálogo de funciones propias, datos/reglas, API y mantenimiento para lectores sin experiencia.
- Retirado enlace de administración de la carta; añadido Iniciar sesión / Mi cuenta y acceso de equipo según permisos.
- Registro público exclusivamente de clientes, sesiones seguras, Mis reservas filtradas por cuenta/negocio y reserva obligatoriamente autenticada con CSRF.
- Migración 0003 agrega clientes/sesiones y propietario de nuevas reservas sin borrar datos ni cambiar credenciales administrativas. Las reservas antiguas permanecen en el panel.
- Documentados límites de correo sin verificar, recuperación de acceso pendiente y conservación de cuentas.
- Verificación de esta entrega: 43 pruebas unitarias/integración y 7 recorridos de navegador aprobados; lint, TypeScript y build correctos. Corregida regla móvil que ocultaba Iniciar sesión. Documentación revisada contra 94 funciones/métodos con nombre y 63 enlaces locales, sin referencias faltantes en esa comprobación.

## Productos agrupados — 2026-09-25

- Productos muestra categorías plegadas con cantidad de platos y aviso de categoría oculta.
- Cada grupo permite editar/agregar productos y ordenar solo los de su categoría; cambiar categoría mueve el borrador al grupo correspondiente.
- Actualizados manual y catálogo de funciones; se mantiene guardado explícito y vista previa.
- Verificados apertura de categorías, alta en la categoría elegida, traslado de producto y descarte sin publicar en navegador móvil. Los otros siete recorridos también pasaron; build, TypeScript y lint correctos.
- Corregido encabezado administrativo: muestra logo y nombre guardados del negocio, con consulta pública para cuentas de personal; conserva logo de ejemplo solo como alternativa si no hay uno configurado.
