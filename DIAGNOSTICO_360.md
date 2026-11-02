# Diagnóstico 360° para crematorios de mascotas — Especificación

> **Estado: implementado (2026-11-01)**, incluida la landing pública (sección 12).
>
> Prompt/especificación para el agente de programación. Herramienta del **SuperAdmin** de Vinzer
> para evaluar crematorios prospecto, entregarles un informe PDF y convertirlos en clientes del SaaS.

## 1. Objetivo

1. **Aportar valor real**: que el dueño del crematorio vea con números qué tiene bien y qué le falta.
2. **Captación comercial**: cada debilidad se conecta con una función concreta de Vinzer y con el plan que la resuelve.

El informe debe ser **honesto**: incluye preguntas que Vinzer no resuelve (normativa, instalaciones). Así se ve
creíble y no como publicidad disfrazada.

## 2. Cómo se usa (flujo)

1. El SuperAdmin entra a **Admin → Comercial → «Diagnóstico 360°»** → «Nuevo diagnóstico».
2. Elige la **modalidad**: Rápido (10 preguntas, ~3 min), Estándar (15, ~5 min) o Completo (20, ~8 min).
3. Ingresa los datos del crematorio (sección 6). Puede llenarlo él mismo en una llamada o visita.
4. Responde las preguntas: una por pantalla o en lista. Cada pregunta tiene un botón **«?»** con su explicación.
   Se avanza con una barra de progreso y se puede volver atrás.
5. Al terminar ve el resultado en pantalla y genera el **PDF del informe**.
6. Desde el diagnóstico puede **enviar el PDF** por correo (`send_action_email`) o copiar un mensaje para WhatsApp (`wa.me`).
7. El crematorio también puede diagnosticarse solo en la landing pública `/diagnostico` (sección 12).

## 3. Categorías y pesos (suman 100 %)

| # | Categoría | Peso | Función de Vinzer relacionada |
|---|-----------|------|-------------------------------|
| C1 | Identidad y certificados | 8 % | Certificados con diseño propio, tarjetas de homenaje |
| C2 | Instalaciones y traslado | 8 % | — (no lo resuelve Vinzer) |
| C3 | Gestión y software | 15 % | Órdenes, clientes, mascotas, roles, respaldos en la nube |
| C4 | Operación y trazabilidad | 15 % | Flujo operativo, evidencias, seguimiento público para la familia |
| C5 | Normativa y seguridad | 10 % | — (no lo resuelve Vinzer) |
| C6 | Google y sitio web | 10 % | Catálogo de planes público, widget, invitación a reseña en Google |
| C7 | WhatsApp y atención | 8 % | Formulario público, avisos a la familia por WhatsApp/correo |
| C8 | Redes sociales y contenido | 6 % | Diseños para redes con IA |
| C9 | Planes, precios y servicios | 10 % | Planes, tramos de peso, catálogo compartible |
| C10 | Alianzas y fidelización | 10 % | Veterinarias aliadas y comisiones, encuesta, memoriales |

Pesos y nombres editables por el SuperAdmin. Al guardar se valida que sumen 100.

## 4. Puntaje

- Cada alternativa tiene un **% de cumplimiento** (100 / 60 / 25 / 0, editable).
- Algunas preguntas permiten **«No aplica»**. Esas respuestas se excluyen del cálculo.
- **% de categoría** = promedio de los % de sus preguntas respondidas.
- **% total** = Σ (peso categoría × % categoría) ÷ Σ (pesos de las categorías con respuestas).
  Así el resultado es comparable entre 10, 15 y 20 preguntas.
- Si hay menos del 70 % de preguntas aplicables, el informe dice «Diagnóstico parcial».

**Niveles** (textos editables):

| Rango | Nivel | Mensaje |
|-------|-------|---------|
| 0–39 % | Inicial | Tu crematorio tiene importantes oportunidades de organización y profesionalización. |
| 40–59 % | En desarrollo | Ya tienes prácticas implementadas, pero hay áreas clave que fortalecer. |
| 60–79 % | Bien encaminado | Tienes una base sólida; optimizar procesos te hará destacar. |
| 80–100 % | Alto nivel | Tu crematorio está profesionalizado; el siguiente paso es escalar. |

## 5. Banco de preguntas (20)

Columna **Modalidad**:
- **10**: estas preguntas están en las tres modalidades (una por categoría).
- **15**: se agregan desde Estándar.
- **20**: solo en Completo.

### C1 · Identidad y certificados

**P1 — ¿Cómo es el certificado de cremación que entregas?** · Modalidad 10
> **?** El certificado es lo que la familia guarda y muestra. Refleja tu seriedad y tu marca.

| Alternativa | % |
|---|---|
| Personalizado con mi logo, colores y datos de la mascota, generado automáticamente | 100 |
| Con mi logo, pero lo armo a mano cada vez (Word, Canva) | 60 |
| Genérico, sin mi marca | 25 |
| No entrego certificado | 0 |

Recomendación si < 60: *Entrega un certificado con tu identidad y los datos de la mascota, sin armarlo a mano.* → Vinzer: Certificados.

**P2 — ¿Tu marca (logo, colores, tipografía) se ve igual en todo lo que entregas?** · Modalidad 20
> **?** Una marca coherente en certificados, redes, web y urnas transmite confianza en un momento sensible.

| Alternativa | % |
|---|---|
| Sí, tengo logo, colores definidos y se usan igual en todo | 100 |
| Tengo logo, pero cada pieza se ve distinta | 60 |
| Tengo logo, sin colores ni estilo definidos | 25 |
| No tengo logo profesional | 0 |

### C2 · Instalaciones y traslado

**P3 — ¿Tienes un espacio para que la familia despida a su mascota?** · Modalidad 10
> **?** Un espacio privado y digno para la despedida es uno de los momentos que más recuerdan las familias.

| Alternativa | % |
|---|---|
| Sala privada acondicionada para la despedida | 100 |
| Un espacio adaptado, no exclusivo | 60 |
| Solo despedida en el domicilio o la veterinaria | 25 |
| No ofrezco instancia de despedida | 0 |

**P4 — ¿Cómo realizas el retiro de la mascota?** · Modalidad 20 · permite «No aplica» (la familia siempre la lleva)
> **?** El traslado es el primer contacto físico con la familia: el vehículo y el trato comunican respeto.

| Alternativa | % |
|---|---|
| Vehículo exclusivo, identificado y con camilla o contenedor adecuado | 100 |
| Vehículo exclusivo sin identificar | 60 |
| Vehículo particular | 25 |
| No ofrezco retiro y no tengo alternativa | 0 |

### C3 · Gestión y software

**P5 — ¿Dónde registras las órdenes de cremación?** · Modalidad 10
> **?** Un registro ordenado te permite saber en segundos qué servicio tiene cada mascota, cuánto se pagó y en qué etapa va.

| Alternativa | % |
|---|---|
| En un software de gestión para crematorios | 100 |
| En una planilla (Excel / Google Sheets) | 60 |
| En cuaderno, notas o conversaciones de WhatsApp | 25 |
| No llevo un registro formal | 0 |

Recomendación si < 60 → Vinzer: órdenes, clientes y mascotas en un solo lugar.

**P6 — ¿Dónde guardas las fotos de las mascotas y los documentos?** · Modalidad 15
> **?** Si se pierde el computador o el celular, ¿pierdes la historia de tus clientes? Un respaldo en la nube lo evita.

| Alternativa | % |
|---|---|
| En la nube, con respaldo automático y ordenado por cliente | 100 |
| En la nube (Drive, Dropbox), subidas a mano | 60 |
| En el computador o el celular | 25 |
| No las guardo | 0 |

### C4 · Operación y trazabilidad

**P7 — ¿La familia puede saber en qué etapa está el servicio?** · Modalidad 10
> **?** La incertidumbre genera ansiedad y llamadas. Informar cada etapa da tranquilidad y confianza.

| Alternativa | % |
|---|---|
| Sí, con un enlace de seguimiento en línea con etapas y fotos | 100 |
| Le avisamos manualmente por WhatsApp en cada etapa | 60 |
| Solo si la familia pregunta | 25 |
| No informamos hasta la entrega | 0 |

Recomendación → Vinzer: seguimiento público y avisos automáticos a la familia.

**P8 — ¿Cómo aseguras que cada mascota no se confunda durante el proceso?** · Modalidad 15
> **?** La trazabilidad garantiza que la familia recibe las cenizas de su mascota. Es la mayor preocupación del cliente.

| Alternativa | % |
|---|---|
| Código único por orden y registro de cada etapa con evidencia (foto, firma) | 100 |
| Placa o etiqueta física que acompaña a la mascota | 60 |
| Por el nombre, de memoria | 25 |
| No tengo un método definido | 0 |

### C5 · Normativa y seguridad

**P9 — ¿Tienes al día las autorizaciones de funcionamiento (sanitaria, municipal, horno)?** · Modalidad 10
> **?** Operar con permisos vigentes te protege legalmente y es un argumento de confianza frente a la competencia.

| Alternativa | % |
|---|---|
| Todas vigentes y archivadas | 100 |
| La mayoría, algunas en trámite | 60 |
| Solo algunas | 25 |
| No lo sé / ninguna | 0 |

**P10 — ¿Tienes protocolos escritos (manipulación, limpieza, seguridad del horno, emergencias)?** · Modalidad 20
> **?** Los protocolos hacen que el servicio sea igual de bueno sin importar quién lo realice.

| Alternativa | % |
|---|---|
| Escritos y el equipo está capacitado | 100 |
| Escritos, pero no siempre se aplican | 60 |
| Solo de palabra | 25 |
| No existen | 0 |

### C6 · Google y sitio web

**P11 — ¿Cómo está tu Perfil de Empresa en Google (ex Google My Business)?** · Modalidad 10
> **?** La mayoría de las familias busca «crematorio de mascotas cerca de mí». Un perfil completo y con reseñas te pone primero.

| Alternativa | % |
|---|---|
| Verificado, completo (fotos, horario, servicios) y respondo las reseñas | 100 |
| Verificado, pero incompleto o sin reseñas recientes | 60 |
| Existe, pero no lo administro | 25 |
| No tengo | 0 |

Recomendación → Vinzer: la encuesta post-servicio invita a dejar reseña en Google.

**P12 — ¿Tienes sitio web propio?** · Modalidad 15
> **?** Un sitio con tus planes y precios responde dudas antes de que te escriban y filtra consultas.

| Alternativa | % |
|---|---|
| Con dominio propio, planes, precios y formulario de solicitud | 100 |
| Web básica, sin planes ni formulario | 60 |
| Solo redes sociales | 25 |
| Nada | 0 |

### C7 · WhatsApp y atención

**P13 — ¿Qué WhatsApp usas para atender?** · Modalidad 10
> **?** WhatsApp Business permite catálogo, horario, respuestas rápidas y mensaje de ausencia: atención profesional las 24 h.

| Alternativa | % |
|---|---|
| Business configurado (catálogo, horario, respuestas rápidas, ausencia) | 100 |
| Business sin configurar | 60 |
| WhatsApp personal | 25 |
| No atiendo por WhatsApp | 0 |

**P14 — ¿Cuánto tardas en responder una consulta?** · Modalidad 20
> **?** Ante una pérdida, la familia contacta a varios crematorios: el primero que responde con claridad suele quedarse con el servicio.

| Alternativa | % |
|---|---|
| Menos de 15 minutos, también fuera de horario | 100 |
| Menos de 1 hora en horario de atención | 60 |
| El mismo día | 25 |
| Al día siguiente o más | 0 |

Recomendación → Vinzer: formulario público para que la familia registre los datos sin esperar.

### C8 · Redes sociales y contenido

**P15 — ¿Con qué frecuencia publicas en redes (Instagram, Facebook, TikTok)?** · Modalidad 10
> **?** Publicar con constancia te mantiene presente cuando una familia o una veterinaria necesita recomendarte.

| Alternativa | % |
|---|---|
| Semanalmente, con planificación | 100 |
| Cada 2 a 4 semanas | 60 |
| Muy esporádicamente | 25 |
| No tengo redes activas | 0 |

**P16 — ¿Qué tipo de contenido publicas?** · Modalidad 20
> **?** Homenajes (con permiso de la familia), contenido educativo y testimonios generan más confianza que solo promociones.

| Alternativa | % |
|---|---|
| Homenajes, contenido educativo y testimonios con diseño de mi marca | 100 |
| Principalmente promociones y precios | 60 |
| Contenido compartido de otros | 25 |
| No publico | 0 |

Recomendación → Vinzer: diseños para redes con IA a partir de la foto de la mascota.

### C9 · Planes, precios y servicios

**P17 — ¿Tus planes están definidos por escrito, con lo que incluye cada uno?** · Modalidad 10
> **?** Planes claros evitan malentendidos en un momento difícil y ayudan a elegir sin presión.

| Alternativa | % |
|---|---|
| Sí, publicados en un catálogo online que puedo compartir | 100 |
| Definidos, pero los explico por chat o teléfono | 60 |
| El precio depende de cada caso | 25 |
| No tengo planes definidos | 0 |

Recomendación → Vinzer: catálogo de planes compartible con enlace.

**P18 — ¿Cómo calculas el precio según el peso de la mascota?** · Modalidad 15
> **?** Los tramos de peso publicados hacen el precio transparente y evitan cobros discutidos.

| Alternativa | % |
|---|---|
| Tramos de peso definidos y visibles para la familia | 100 |
| Tramos definidos, pero solo internos | 60 |
| Precio único para todos los tamaños | 25 |
| Caso a caso, sin criterio fijo | 0 |

### C10 · Alianzas y fidelización

**P19 — ¿Trabajas con veterinarias aliadas que te deriven casos?** · Modalidad 10
> **?** Las veterinarias son la principal fuente de derivación. Un convenio formal con comisión las motiva a recomendarte.

| Alternativa | % |
|---|---|
| Sí, con convenio, comisión y registro de cada derivación | 100 |
| Algunas me derivan, sin convenio formal | 60 |
| Contacto informal ocasional | 25 |
| Ninguna | 0 |

Recomendación → Vinzer: veterinarias aliadas, enlaces de derivación y comisiones.

**P20 — ¿Qué haces después de entregar las cenizas?** · Modalidad 15
> **?** El acompañamiento posterior genera recomendaciones, reseñas y clientes que vuelven.

| Alternativa | % |
|---|---|
| Mensaje de seguimiento, encuesta, invitación a reseña y memorial digital | 100 |
| Solo un mensaje de agradecimiento | 60 |
| A veces escribimos | 25 |
| Nada | 0 |

Recomendación → Vinzer: encuesta de satisfacción, memoriales y tarjetas de homenaje.

**Resumen de modalidades**
- **10**: P1, P3, P5, P7, P9, P11, P13, P15, P17, P19.
- **15**: las 10 anteriores + P6, P8, P12, P18, P20.
- **20**: todas.

## 6. Datos del crematorio (al crear el diagnóstico)

- **Obligatorios**: nombre del crematorio, ciudad/región, persona de contacto.
- **Opcionales**: correo, WhatsApp, sitio web o Instagram, cremaciones aproximadas al mes.
- **Consentimiento**: casilla para recibir comunicaciones comerciales (obligatoria para enviar el informe por
  correo en la fase 2).
- Si el correo coincide con un crematorio ya registrado en Vinzer, mostrarlo vinculado.

## 7. Informe PDF

Se genera en el navegador con `@react-pdf/renderer` (`components/admin/diagnostics/DiagnosticPDF.tsx`), igual que los recibos. No se guarda: se descarga o se adjunta al correo (`POST /{id}/send`).

1. **Portada**: logo de Vinzer, «Diagnóstico 360°», nombre del crematorio, fecha, modalidad.
2. **Resultado general**: % total grande, nivel y su mensaje, gráfico de barras o radar por categoría.
3. **Fortalezas**: las 3 categorías con mayor %.
4. **Oportunidades de mejora**: las 3 categorías con menor %, con la recomendación de cada pregunta bajo 60 %.
5. **Detalle por pregunta**: pregunta, respuesta elegida, % (con semáforo verde, amarillo o rojo).
6. **Cómo te ayuda Vinzer**: solo las funciones ligadas a sus debilidades (no un listado genérico), más el
   **plan sugerido** (sección 8) y su precio actual leído de `SubscriptionPlan`.
7. **Siguiente paso**: botón/enlace a `vinzer.cl/crear-cuenta` (FREE) o WhatsApp de ventas, y un QR.

No se incluyen precios inventados: todo se lee de la base de datos.

## 8. Plan sugerido (reglas editables)

- **C3 o C4 < 60 %** y no necesita certificados con su marca → **Track** (operaciones).
- **C1 < 60 %**, o necesita certificados, configuración o veterinarias → **NORMAL**.
- **Más de 40 cremaciones al mes**, o quiere widget en su web o exportar datos → **PRO**.
- **Más de 60 cremaciones al mes**, o varias sedes → **ULTRA**.
- Si el puntaje total es < 40 %: además sugerir **empezar gratis (FREE)**.

## 9. Administración (SuperAdmin)

Página **Admin → Comercial → «Diagnóstico 360°»**, con pestañas:

- **Diagnósticos**: lista con crematorio, ciudad, modalidad, % total, nivel, fecha y estado comercial
  (nuevo / contactado / demo / cliente / descartado). Filtros por fecha, nivel, ciudad y estado.
  Acciones: ver, descargar PDF, enviar por correo, WhatsApp, eliminar.
- **Preguntas**: editar el banco: texto, ayuda «?», categoría, alternativas con su %, permite «No aplica»,
  modalidades (10/15/20), recomendación, función de Vinzer, orden, activa/inactiva.
  Validar que cada modalidad tenga exactamente 10, 15 o 20 preguntas activas.
- **Configuración**: categorías y pesos (suman 100), niveles y textos, reglas de plan sugerido.
- **Resumen**: promedio por categoría de todos los diagnósticos (qué es lo más débil en el mercado),
  distribución por nivel y conversión diagnóstico → crematorio registrado.

## 10. Datos (backend)

Tablas globales del SuperAdmin (sin `tenant_id`, por lo que no llevan política RLS; solo `get_current_creator`):

- `sys_diagnostic_categories` (clave, nombre, peso, orden).
- `sys_diagnostic_questions` (categoría, texto, ayuda, alternativas JSON `[{texto, pct}]`, permite_na,
  modalidades JSON, recomendación, función Vinzer, orden, activa).
- `sys_diagnostics` (datos del crematorio, consentimiento, modalidad, **respuestas con copia del texto
  y del %** para que editar el banco no cambie informes antiguos, % por categoría, % total, nivel, plan sugerido,
  URL del PDF, estado comercial, `tenant_id` vinculado opcional, creado por, fechas).
- Seed inicial con las 20 preguntas y los pesos de este documento (migración `a4c6e8f0b257`).
- API: `/api/internal/creator/diagnostics/*`.
- Actualizar `CLAUDE.md` y tests (cálculo con «No aplica», solo SuperAdmin, snapshot de respuestas).

## 11. Fuera de alcance

- Envío automático de seguimiento por correo a los 3 y 7 días.
- Comparar con el promedio del mercado («estás sobre el 62 % de los crematorios evaluados»).

## 12. Landing pública `/diagnostico` (implementada)

- Una sola página (`vinzer.cl/diagnostico`) para tráfico de Google, Instagram y TikTok; medir el origen con `?utm_source=`.
- Pide **solo nombre del crematorio y correo** (reCAPTCHA) y **cuántas cremaciones hace al mes** (rangos según el tope de órdenes de cada plan), y el crematorio **elige su diagnóstico**: Rápido (10), Estándar (15) o Completo (20), cada uno con su descripción; viene marcada la «Modalidad marcada en la web» de Configuración.
- SEO: enlazada desde el menú («Diagnóstico gratis») y el footer de vinzer.cl; bajo el formulario hay texto visible (las 10 áreas, cómo funciona, preguntas frecuentes) y JSON-LD `FAQPage`.
- Al terminar va a su informe privado `/diagnostico/informe/<token>`: resultado, plan sugerido con el **descuento de lanzamiento** (Configuración → «Descuento ofrecido», hoy 45 %, y su texto), botones de WhatsApp y descarga del PDF.
- Recibe por correo el enlace a su informe (no un PDF adjunto). Vinzer recibe correo + notificación en el admin; el diagnóstico aparece en la lista con origen **Web** (o «Sin terminar» si dejó el correo y no completó).
- **Plan recomendado (uno solo):** lo que necesita según sus respuestas (NORMAL o Track) sube al plan más chico cuyo tope de órdenes
  mensuales cubre su volumen (p. ej. 41–60 → PRO). Si subió por volumen, el informe ofrece «¿Prefieres partir más simple? Pregúntanos por <plan>».
