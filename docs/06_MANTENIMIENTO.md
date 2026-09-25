# Mantenimiento y cómo aprender leyendo el código

[Volver al índice](README.md)

## Leer una función sin saber el lenguaje

Busca primero su nombre y el archivo en el catálogo. Lo que aparece entre paréntesis son entradas. `return` entrega un resultado; `if` comprueba una condición; `throw` interrumpe y comunica un error. `const` pone un nombre a un valor. Un objeto reúne propiedades entre llaves; una lista reúne elementos entre corchetes.

```ts
export function overlaps(start, end, otherStart, otherEnd) {
  return start < otherEnd && end > otherStart;
}
```

Ejemplo simplificado para lectura (el archivo real añade tipos). Pregunta si el comienzo de un intervalo es anterior al final del otro Y su final es posterior al comienzo del otro. `&&` significa que ambas condiciones deben cumplirse. El resultado es verdadero/falso. `export` permite usar esa función desde otros archivos.

En componentes verás etiquetas como `<button>` y `<Menu content={content} />`. La primera crea un botón real; la segunda llama a una pieza propia que construye una parte de pantalla. Las llaves intercalan datos dentro de esa presentación. TypeScript agrega tipos para advertir errores, pero el servidor igual debe validar entradas recibidas por Internet.

`async/await` permite esperar una respuesta sin fingir que ya llegó. `try/catch/finally` significa intentar, manejar el error y ejecutar la limpieza final en ambos casos. `{...content, name: nuevoNombre}` significa copiar propiedades y reemplazar name, sin borrar las demás.

`useState` guarda datos temporales de pantalla; `useEffect` reacciona a cambios; `useRef` conserva una referencia. Una función de flecha `x => x.active` toma un elemento y consulta si está activo. No es necesario aprender React entero para entender el propósito de cada módulo.

## Qué archivo consultar para cada cambio

Un precio, texto, foto, botón o color: primero el panel. Una nueva regla de reservas: shared/rules y sus pruebas, y después la API. Un nuevo campo: schema, editor, render público y compatibilidad con datos previos. Un nuevo permiso: reglas compartidas y permit del servidor; nunca solo ocultar botones. Una nueva tabla: nueva migración. Un nuevo proveedor de archivos: contrato StorageProvider y su implementación. Envío de WhatsApp: ReportDeliveryProvider con proveedor oficial y secretos fuera de Git.

CSS cambia distribución/apariencia; no impide accesos al servidor. Borrar el enlace a admin tampoco impide escribir `/admin` en la dirección: la autorización protege los datos.

## Rutina de trabajo

1. Respaldar datos antes de cambios de esquema; usar una base local de prueba.
2. Leer PROJECT_SPEC y la documentación de la función que cambiará.
3. Hacer el cambio más pequeño que resuelva el comportamiento deseado.
4. Ejecutar lint, typecheck, pruebas y build según README. Si cambia un flujo, probar también en navegador.
5. Actualizar manual/catálogo/API/datos cuando cambie lo que describen. Registrar el resultado en CHANGELOG.
6. Revisar archivos incluidos en Git. Nunca agregar secretos, bases ni respaldos privados.

No aplicar cambios remotos con --remote por costumbre. Los comandos de setup son locales; producción requiere decisiones y recursos propios de la cuenta.

## Qué comprueba cada prueba

`rules.test.ts`: capacidad, intervalos, permisos, fechas, URLs, validación e imágenes. `api.test.ts`: Worker sobre D1/R2 aislados, sesiones, contenido, reservas, permisos, reportes y archivos. `pages.test.ts`: metadatos, escape y cabeceras. `draft.test.ts`: detección de diferencias. `review.test.ts`: temas, contraste, validación adicional y resúmenes. `tests/e2e/flows.spec.ts`: navega como persona por carta y panel.

Las pruebas E2E usan el servidor local y crean datos temporales. No ejecutarlas contra producción ni mientras otra persona edita esa base. Pasar pruebas no demuestra ausencia total de errores, seguridad certificada ni tiempos de respuesta en teléfonos reales.

## Problemas frecuentes

**La carta no abre:** comprobar que frontend y Worker estén ejecutándose; setup debe haberse aplicado. Leer el aviso visible. Reintentar no crea la base si falta.

**No abre desde el teléfono:** misma Wi-Fi, IP actual del computador, puerto 5173 y permiso del firewall en red privada. localhost en el teléfono apunta al propio teléfono.

**No aparece un cambio:** comprobar Guardar, categoría activa, producto disponible si se ocultan agotados, bloque visible y fechas de promoción. Otra pestaña ya abierta puede necesitar recarga.

**No guarda colores:** revisar contraste de letras con página y tarjetas, y letras de botones con principal. Aplicar un preset como punto de partida.

**No acepta reserva:** comprobar sesión según política vigente, fecha/hora de Chile, anticipación, personas, reservas pendientes y mesas fuera de servicio. No se combinan mesas ni existe todavía calendario automático de cierres.

**Demasiados intentos:** esperar; otras personas en la misma Wi-Fi pueden compartir límite. No quitar protección para solucionar una prueba. Revisar límites con datos de uso real.

**Sesión vencida:** volver a ingresar. No subir contraseñas a GitHub para recordarlas; usar un gestor de contraseñas.

**No sube foto:** JPG/PNG/WebP, tamaño permitido y archivo realmente válido. La imagen externa también puede fallar si el proveedor bloquea su uso.

**Cambió otra persona:** preservar manualmente el borrador antes de recargar y volver a aplicar lo necesario. No hay fusión automática ni historial restaurable.

## Respaldos y entrega

La carpeta del proyecto contiene código y documentos. `.wrangler` contiene estado local que Git excluye; R2 remoto y D1 remoto son recursos separados. Para respaldo local consistente, detener primero el servidor, copiar la carpeta incluyendo ocultos y guardar la copia de forma privada. Para remoto seguir DEPLOYMENT y ensayar restauración; no asumir que copiar código copia datos.

No compartir el archivo de acceso local ni variables de entorno. `package-lock.json` sí se versiona para reproducir instalaciones. Las dependencias se vuelven a instalar; no hay que compartir node_modules.

## Límites de esta documentación

Explica el código propio y sus contratos, no el código interno de React, Hono, Cloudflare ni otras bibliotecas instaladas. Describe funciones sin nombre por su acción y componente, en lugar de repetir cientos de operaciones pequeñas. Los nombres y enlaces permiten contrastar cada explicación con la implementación. Cambios posteriores deben actualizar estas páginas; una propuesta no se considera disponible solo por figurar en PROJECT_SPEC.
