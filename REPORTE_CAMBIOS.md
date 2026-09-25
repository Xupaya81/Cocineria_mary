# Reporte de cambios de esta revisión

Fecha: 25 de septiembre de 2026. Se trabajó sobre la aplicación existente, conservando contenido y estructura.

## Personalización

- Nueva sección Diseño con seis familias locales para títulos y textos, seleccionadas de forma independiente.
- Colores editables para letras, títulos, texto secundario, texto de botones, identidad y fondos. Tres combinaciones iniciales, incluida una oscura.
- Variables visuales compartidas entre página pública y vista previa. Se eliminaron colores y tipografías fijos de los elementos públicos principales.
- Valores predeterminados compatibles con documentos antiguos: no hace falta borrar ni volver a cargar la base.
- Validación de contraste tanto en panel como en servidor; impide guardar texto ilegible.
- Encabezados editables de portada, carta y recomendados, más despedida del pie de página.
- Portada móvil reorganizada para evitar que una fuente ancha o un nombre largo invadan la imagen.

## Correcciones de lógica

- El guardado conserva ediciones que lleguen durante una solicitud. Se bloquean controles durante el envío y se conserva la protección por versión frente a otro administrador.
- Botón Descartar con confirmación, conservando la versión guardada.
- Las subidas de imágenes usan la referencia más reciente del formulario para evitar sobrescribir otras ediciones al terminar; límite previo de tamaño en cliente.
- Errores de cierre de sesión visibles, sin dejar una promesa sin manejar.
- Filtro público compartido con la vista previa; excluye botones desactivados de negocios recomendados.
- Métricas del restaurante usan businessId, y los destinos de eventos admiten identificadores compuestos largos sin ambigüedad.
- Corrección del registro de ubicación de negocios ocultos por categoría.
- Resumen de reportes suma métricas equivalentes de distintos botones. Se evita que una respuesta lenta sustituya el reporte de un filtro más reciente.
- Teléfono de reserva validado por cantidad real de dígitos; un campo formado por espacios y paréntesis ya no es válido.
- Horas inexistentes por cambio horario devuelven un error comprensible.
- Transiciones de reservas verificadas en servidor y reflejadas en panel. Control concurrente y auditoría solo de cambios efectivos.
- QR usa diálogo nativo: foco contenido, cierre por Escape y retorno de foco del navegador.
- Creación remota de administrador selecciona explícitamente el entorno de producción.

## Mantenimiento y documentación

Campos reutilizables extraídos del editor; módulo de temas compartido; código formateado. README completo para ejecutar desde cero, documentación de despliegue y seguridad, y reportes de estado y cambios. Actualizados PROJECT_SPEC y CHANGELOG.

## Verificación

42 pruebas unitarias/de integración y 6 pruebas de navegador aprobadas. Lint, TypeScript y build correctos. npm audit informó cero vulnerabilidades conocidas. Pruebas nuevas cubren temas/contraste, guardado real de fuentes y colores, reservas y auditoría, teléfonos, agregación de métricas, filtrado y borradores.

Los temas se probaron sin dejar aplicado un cambio visual al contenido publicado del restaurante. La elección final queda disponible en Diseño. La revisión no certifica todas las combinaciones posibles ni reemplaza la validación en infraestructura de producción.

## Entrega posterior

Documentación pedagógica en docs y nueva función de cuentas: login común, registro de clientes, reservas autenticadas y acceso administrativo por rol. Ver CHANGELOG y el manual para el comportamiento vigente; este reporte conserva el detalle de la revisión anterior.
