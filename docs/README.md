# Empieza aquí: guía de Cocinería Mary

Esta documentación explica el proyecto sin dar por hecho que sabes programar. Puedes usar la web desde el panel sin modificar su código. El código es el conjunto de instrucciones que hace funcionar ese panel y la página del restaurante.

## Orden de lectura

1. [Manual de uso](01_MANUAL_DE_USO.md): cómo administrar el restaurante y qué ocurre al pulsar cada control.
2. [Cómo funciona por dentro](02_COMO_FUNCIONA.md): recorrido de una visita, una edición, una reserva y una imagen.
3. [Catálogo de funciones](03_FUNCIONES_DEL_CODIGO.md): qué recibe, qué hace y qué entrega cada función propia con nombre, incluyendo auxiliares.
4. [Datos y reglas](04_DATOS_Y_REGLAS.md): significado de los campos guardados y restricciones que los protegen.
5. [Peticiones al servidor](05_API_EXPLICADA.md): todas las puertas de entrada de la API y quién puede usarlas.
6. [Mantenimiento y aprendizaje](06_MANTENIMIENTO.md): cómo leer el código, verificar cambios y resolver problemas frecuentes.

Para instalar desde cero: [README](../README.md). Para publicar: [DEPLOYMENT](../DEPLOYMENT.md). Para conocer protecciones y limitaciones: [SECURITY](../SECURITY.md). Para el alcance inicial: [PROJECT_SPEC](../PROJECT_SPEC.md). El estado de la beta y la revisión anterior están en [REPORTE_WEB](../REPORTE_WEB.md) y [REPORTE_CAMBIOS](../REPORTE_CAMBIOS.md). [CHANGELOG](../CHANGELOG.md) registra lo realizado.

## Un ejemplo sin programación

Quieres cambiar el precio de una empanada. Abres Productos, eliges el plato, cambias Precio y observas el borrador. Al guardar, el navegador envía los datos al servidor. El servidor comprueba que tienes permiso y que el precio es válido. Después guarda el contenido y responde. La siguiente visita a la carta carga el nuevo precio.

Hay tres lugares distintos: el borrador que estás editando, los datos guardados y los archivos del programa. Cambiar un precio modifica datos; no reescribe el programa ni crea un cambio en GitHub.

## Palabras que encontrarás

- **Función:** receta de instrucciones con un nombre. Puede recibir ingredientes (entradas) y devolver un resultado.
- **Componente:** función que construye una parte visible, como un formulario o tarjeta.
- **Frontend:** parte que se ejecuta en el navegador y dibuja las pantallas.
- **Backend o servidor:** parte que valida permisos, aplica reglas y guarda datos.
- **API:** canal de comunicación entre navegador y servidor.
- **Base de datos:** archivo organizado de información persistente. Aquí usamos D1.
- **Almacenamiento R2:** lugar para las imágenes; es distinto de la base de datos.
- **Estado:** información temporal de una pantalla, por ejemplo la categoría seleccionada.
- **JSON:** forma de escribir datos con nombres y valores; no es una página web.
- **ID:** identificador interno estable. Dos platos pueden llamarse parecido, pero deben tener IDs distintos.
- **URL/ruta:** dirección de una página o recurso. `/reservas` es una ruta del sitio.
- **Validación:** comprobación de que los datos cumplen las reglas antes de usarlos.
- **Sesión:** autorización temporal para permanecer dentro del panel después del login.
- **Migración:** instrucción versionada para crear o cambiar la estructura de la base.
- **Seed:** datos ficticios iniciales para probar; no son una copia de la información real del restaurante.
- **Build:** preparación del código para servirlo en producción.
- **Git/GitHub:** historial y copia del código. No guardan automáticamente lo que editas en la administración.

La documentación describe la implementación actual. No promete funciones futuras como envío automático de WhatsApp, Google Drive, pagos o administración central de cientos de restaurantes.
