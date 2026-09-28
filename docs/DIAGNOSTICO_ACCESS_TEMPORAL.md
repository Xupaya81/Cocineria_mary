# Diagnóstico temporal de Access

Ruta: GET `/__beta/access-diagnostic`. Solo disponible cuando BETA_CLOSED es exactamente "true"; fuera de beta devuelve 404 y otros métodos devuelven 405. No se desplegó durante su implementación.

Después de un despliegue autorizado, abrir esta ruta en el dominio de la beta tras pasar Cloudflare Access. La política externa de Access sigue siendo la primera barrera. Únicamente esta ruta exacta devuelve metadatos antes de que la segunda barrera rechace el JWT. No ejecuta next(), no sirve assets ni contenido de la aplicación. El resto de rutas conserva la validación existente.

La respuesta contiene:

- hasAssertion: presencia del header Cf-Access-Jwt-Assertion, sin su valor.
- decoded: alg, iss, aud y los booleanos hasExp/hasIat/hasSub. No incluye fechas ni valor de sub. Si el token no se puede decodificar, decoded es null. Decodificar no demuestra autenticidad.
- expectedIssuer y expectedAudience: valores públicos esperados según la configuración.
- verification: ok o failed, obtenidos usando la misma rutina JOSE que verifyBetaAccess, con los mismos requisitos criptográficos.
- error: null cuando pasa, o nombre de clase JOSE y mensaje seguro cuando falla. Errores previos a JOSE (configuración/header ausente) se identifican como Error.

No se serializa el objeto de excepción: los errores JWT de JOSE pueden contener el payload completo dentro de payload/cause. Se conservan únicamente mensajes conocidos que no contienen valores del token; mensajes desconocidos se reemplazan por una explicación redactada. Tampoco se imprimen en logs. Los metadatos manipulados se limitan a algoritmos reconocidos, emisores Cloudflare Access y audiencias hexadecimales; valores inesperados se muestran como [redacted], nunca se reflejan libremente. Las respuestas usan private/no-store, noindex y nosniff, sin cookies ni cabeceras entrantes.

Interpretación habitual:

- hasAssertion=false: la petición no recibió el header esperado.
- JWTClaimValidationFailed y unexpected "aud"/"iss": el token firmado no coincide con la audiencia/emisor configurados.
- JWTExpired: el JWT está vencido.
- JWSSignatureVerificationFailed: la firma no pasa la comprobación.
- Errores JWKS: revisar disponibilidad y selección de claves públicas del equipo.

Estos resultados no autorizan a relajar la validación. No cambiar AUD, Team Domain ni BETA_CLOSED automáticamente.

## Retirada obligatoria al terminar

Eliminar la importación y la excepción de ruta de functions/_middleware.ts, y retirar shared/accessDiagnostic.ts y sus pruebas específicas cuando ya no sean necesarios. verifyBetaAccessOrThrow puede permanecer como auxiliar compartido; no eliminar la validación JOSE. Confirmar que el antiguo endpoint deja de devolver diagnóstico después del siguiente despliegue autorizado. La ruta no tiene una fecha de caducidad automática: su retirada requiere un cambio explícito.
