# Análisis de Memoriales — Diseño, Personalización y Venta Emocional

> Fecha: 2026-10-03 · Alcance: `admin.vinzer.cl/dashboard/memorials` (SuperAdmin), página pública del memorial (`memorial.vinzer.cl/memorials/v/...`), los 8 altares (layouts) y el panel de gestión familiar.
> Método: lectura del código + revisión en vivo del memorial "Pelusa" (Vincer Pet) en producción, solo lectura (no se guardó ningún cambio).

---

## 0. Resumen ejecutivo

El producto tiene una base visual **muy buena**: 8 altares con identidad propia, buena tipografía (Cinzel / Cormorant / Quicksand), velas animadas y tarjeta para redes sociales. Lo que hoy frena tanto la experiencia como la venta son **errores de fondo**, no falta de diseño:

1. **La "Personalización del Diseño" del admin no funciona como se espera.** El *Tema de Color* se ignora casi siempre (el color de fondo `#ffffff` lo pisa), *Flores* no hace nada, y al guardar se **borra el fondo (portada) que eligió la familia**.
2. **En temas oscuros, la mitad inferior de la página no se puede leer**: el formulario "Honra su Memoria" y las dedicatorias quedan en texto blanco sobre fondo blanco (lo confirmé en vivo).
3. **Se promete algo que no se entrega**: el plan Eterno promete "hasta 25 fotos" y la página muestra máximo 5. Las "velas" que se venden no se cuentan en ningún lado. Además, el modal de renovación vende planes antiguos en CLP (Huella/Vínculo) con un `productId` de relleno.
4. **El texto de despedida por defecto es publicidad**: si la familia no escribió nada, el epitafio dice *"En Vínculo Cercano hemos creado este santuario digital…"*. En un memorial de duelo, eso rompe el momento emocional.
5. **Compartir por WhatsApp sale genérico**: la pestaña y la vista previa dicen *"Vinzer | Plataforma de Confianza y Trazabilidad para Crematorios"*, sin nombre ni foto de la mascota. Compartir es el principal canal de crecimiento del memorial y hoy se está perdiendo.

---

## 1. ¿Funciona la "Personalización del Diseño"? — Diagnóstico

Respuesta corta: **parcialmente**. El selector de *Layout* funciona. *Tema*, *Partículas* y *Color de fondo* tienen errores que se combinan entre sí.

| # | Control | Qué esperas | Qué pasa realmente | Gravedad | Dónde |
|---|---------|-------------|--------------------|----------|-------|
| P1 | **Tema de Color** (esmeralda, dorado, rosado…) | Cambia la paleta del memorial | El admin siempre envía `color_fondo` (por defecto `#ffffff`). La página pública, cuando hay `color_fondo`, **reemplaza el tema por "claro" u "oscuro"** según el brillo del color. Resultado: elegir "Esmeralda" o "Dorado" no tiene ningún efecto. Lo confirmé en vivo: Pelusa tiene "OSCURO" seleccionado y se ve claro. | 🔴 Alta | `MemorialClientPage.tsx:221-227`, `admin/.../memorials/page.tsx:78,129,185` |
| P2 | **Guardar desde el admin** | Solo cambia lo que edité | `PATCH` reemplaza el objeto `diseno` completo (`memorial.diseno = update_data.diseno`). Se **pierden `portada_url`** (el fondo que eligió la familia) y cualquier otra clave. | 🔴 Alta | `creator/memorials/router.py:106-107` |
| P3 | **Partícula "Flores"** | Pétalos cayendo | No existe un componente para flores: solo se renderizan `nieve` y `estrellas`. "Flores" (que además es el **valor por defecto**) = sin efecto. La familia tiene "Ninguna / Nieve / Estrellas" y el admin "Nieve / Estrellas / Flores": las dos listas no coinciden. | 🟠 Media | `MemorialClientPage.tsx:340-348`, `gestion/page.tsx:884-886` |
| P4 | **Color de fondo** | Un fondo propio | No se puede dejar "vacío" desde la UI (siempre trae `#ffffff`), así que los fondos característicos de cada altar **nunca aparecen**: el degradé cálido del Altar, el cielo de Cielo, la pared de museo de Galería y el cielo nocturno de **Constelación (queda blanco)**. | 🔴 Alta | Layouts: `!memorial?.diseno?.color_fondo` |
| P5 | Fondo por defecto de los layouts | Se ve el fondo del altar cuando no hay color | Además de P4, la condición compara `themeConfig.bg.includes('faf9f6')`, pero el tema claro usa `#FDFBF7`. Esa rama **nunca se cumple** (código muerto). | 🟠 Media | `AltarLayout.tsx:48`, `CieloLayout.tsx:13`, `GaleriaLayout.tsx:22` |
| P6 | **Portada (galería)** elegida en el admin | Esa foto es la principal | La página elige una foto **al azar** en cada carga (`randomMainImage`) e ignora `main_image_url`. Además, el azar en el render provoca desajustes de hidratación con SSR. | 🟠 Media | `MemorialClientPage.tsx:368-374` |
| P7 | **Vista previa en vivo** | Ver los cambios al instante | Funciona, pero recarga el iframe completo con cada clic y con cada tecla del campo de color. Si el memorial está vencido, el modal de expiración tapa la vista previa. No hay forma de previsualizar "sin color de fondo". | 🟡 Baja | `page.tsx:611,618` |
| P8 | Tema de la familia vs. el admin | Mismo resultado | La familia guarda `diseno` **sin** `color_fondo`, así que para ella el tema sí funciona. Si después el admin guarda, se vuelve a poner `#ffffff` y el tema deja de verse. El comportamiento depende de quién guardó por última vez. | 🟠 Media | `gestion/page.tsx:213-221` |

### Corrección propuesta (pequeña y de alto impacto)
- En el admin, agregar la opción **"Sin color personalizado"** (es decir, `color_fondo` vacío por defecto) y enviar `null` cuando no se use.
- En `temaActual`, **dar prioridad al tema** y usar `color_fondo` solo como fondo, sin convertir el tema a claro/oscuro.
- En el backend (`PATCH` del creator), **combinar** `diseno` (`{**memorial.diseno, **update_data.diseno}`) en lugar de reemplazarlo.
- Crear el componente `FloatingPetals` (o quitar "Flores") y unificar la lista de partículas: `ninguna | nieve | estrellas | flores`.
- Respetar `main_image_url` como foto principal y dejar el azar solo cuando no haya una elegida.

---

## 2. Bugs visuales confirmados en producción

| # | Problema | Evidencia | Arreglo |
|---|----------|-----------|---------|
| V1 | **Sección de dedicatorias y formulario ilegibles en temas oscuros.** El contenedor tiene un degradé claro fijo (`from-[#FDFBF7] … to-[#E1E7EE]`), pero el texto hereda el blanco del tema oscuro. | En vivo con fondo `#101828`, "Honra su Memoria" y los campos se ven blanco sobre blanco. | Que el fondo de esa sección use el tema (`themeConfig.bg`, o un degradé derivado del `color_fondo`), o forzar texto oscuro dentro de ella. `MemorialClientPage.tsx:728` |
| V2 | **Corte brusco** entre el altar (por ejemplo, la portada de atardecer) y la sección clara de dedicatorias. | Línea horizontal dura en Galería y Cinemático. | Transición en degradé de unos 200 px, desde el color del altar hacia el de la sección. |
| V3 | **Texto fantasma arriba a la izquierda** ("Pelusa" gigante, semitransparente). | Visible en vivo. Es el contenedor de exportación de `SocialShareCard` (`position: fixed; opacity: 0.01; top:0; left:0`). Se monta **una vez por cada grupo de botones** y además agrega un segundo `<h1>`. | Montarlo solo cuando el modal esté abierto, fuera de pantalla (`left: -10000px`). `SocialShareCard.tsx:225-238` |
| V4 | **Contraste bajo en Constelación y Cielo sobre portada oscura.** El nombre se ve índigo oscuro y el texto azul oscuro sobre el cielo nocturno. | En vivo. | La detección `isDarkTheme` debe considerar la portada y su `theme_config`, no solo `themeConfig.text`. |
| V5 | **Fotos duplicadas.** Galería y Cinemático ya muestran la galería, y el feed universal vuelve a mezclar las mismas fotos con las dedicatorias. | En vivo (Galería). | Si el layout ya muestra la galería, el feed debe mostrar solo dedicatorias. |
| V6 | **Título y meta de la página.** `<title>` = "Vinzer \| Plataforma de Confianza y Trazabilidad para Crematorios"; no hay `og:title` ni `og:image`. | En vivo, `document.title`. | Convertir `page.tsx` en Server Component con `generateMetadata`: "En memoria de Pelusa 🕊️", la foto como `og:image` y la dedicatoria como descripción. |
| V7 | **Footers triples**: "© 2026 {tenant}" dentro del layout + "Una cortesía de" + footer Vinzer. | En vivo. | Dejar solo uno sobrio. |
| V8 | Fechas "… — …" cuando no hay fechas (Cielo, Editorial, Cinemático, Constelación, Galería). | Código. | Ocultar el bloque si faltan ambas fechas. |
| V9 | En Editorial, la capitular por defecto es "E" + el texto de reemplazo completo, que queda como "ETu espíritu…" / "EEntendemos…". | `EditorialLayout.tsx:79-82` | Calcular la capitular sobre el texto final. |
| V10 | Cielo: `Math.random()` en el render reubica las estrellas con cada clic del beso, y hay una imagen externa inútil (`transparenttextures.com`). | `CieloLayout.tsx:27-40,48` | `useMemo` para las estrellas y quitar el `<img>`. |

---

## 3. Psicología de venta emocional — qué está bien y qué falta

> Un memorial de mascota no se vende por sus funciones; se vende por **tres emociones**: *"no quiero que lo olviden"* (permanencia), *"quiero que otros lo vean y lo quieran"* (validación social) y *"quiero hacer algo por él"* (ritual/acción). Cada pantalla debería alimentar una de esas tres.

### 3.1 Lo que ya funciona
- **Rituales simbólicos**: encender la vela, el "saludo al cielo", depositar una flor, encender una estrella. Dan a quien está en duelo algo que *hacer*, y eso es muy potente.
- **Moderación familiar** de las dedicatorias: genera seguridad ("es un lugar de paz").
- **Tarjeta para historias de Instagram**: es el motor viral correcto.
- **Plan Eterno destacado como "Recomendado"**: bien anclado frente al anual.

### 3.2 Lo que rompe la emoción (corregir primero)
| # | Problema | Por qué duele | Propuesta |
|---|----------|---------------|-----------|
| E1 | **Epitafio por defecto = texto corporativo** ("En Vínculo Cercano hemos creado este santuario…"). | La familia abre el link y lo primero que lee es publicidad en lugar de palabras sobre su mascota. | Usar un banco de frases de consuelo por especie, rotando entre ellas: *"Corriste libre, dejaste huellas para siempre"*, *"Tu lugar en el sillón sigue tibio"*, etc. Nunca usar `philosophy_text`. |
| E2 | **Mensaje de relleno** ("Estamos preparando un lugar especial para recordar a Pelusa") publicado como epitafio. | Se lee como "en construcción" en el momento más sensible. | Si el mensaje es el de relleno, mostrar una frase del banco + un aviso **solo para la familia** ("Escribe tus palabras para Pelusa"). |
| E3 | **Los rituales no dejan huella**: la vela, el beso y la estrella son estado local que desaparece al recargar. No hay contador. | Se pierde la prueba social más fuerte: *"47 personas encendieron una vela por Pelusa"*. Además, el plan vende "velas" que no existen como dato. | Endpoint `POST /memorials/{uuid}/rituals` (vela / flor / estrella) con contador público y rate-limit por IP. Mostrarlo bajo la foto: "🕯️ 47 velas encendidas". Ya existe `MemorialReactions.tsx` (sin usar, con localStorage): conectarlo al backend. |
| E4 | **Vela del Altar encendida desde el inicio** y el botón no hace nada (`setLit(true)` cuando ya está en `true`). | Le quita al visitante el gesto de encenderla él mismo, que es el momento de mayor carga emocional. | Que empiece apagada con el texto "Toca para encender su vela", la llama aparezca lentamente, se escuche un sonido suave opcional y se sume +1 al contador. |
| E5 | **Promesa de fotos incumplida**: Eterno promete 25, la página corta a 5 (`.slice(0, 5)`); en gestión, Mensual/Anual/Eterno caen al valor por defecto (3 fotos, 21 dedicatorias). | Riesgo de reclamos y reembolsos, y de pérdida de confianza en un cliente que pagó USD 110. | Tomar los límites siempre de `rec_plans.features` (el backend ya los expone como `dedication_limit`; falta `img_limit`). Quitar los mapas de nombres antiguos en el frontend. |
| E6 | **Eterno bloquea los altares premium**: en gestión, `planRanks` solo conoce FREE/NORMAL/PRO/ULTRA (+ alias). "ETERNO" queda en rango 0 y Cinemático, Constelación y Galería aparecen con candado. | El cliente que más pagó ve candados. | Agregar `mensual:1, anual:2, eterno:3` (o mejor: que el backend entregue `allowed_layouts`). `gestion/page.tsx:663` |
| E7 | **El modal de renovación vende otros planes y precios** (Huella $5.990 / Vínculo $14.990 CLP con `PLACEHOLDER_HUELLA_ID`) mientras la landing vende USD 10/70/110 por WhatsApp. | Es el momento de mayor intención de compra y el mensaje es incoherente; con el placeholder, el checkout puede fallar. | Reutilizar los datos de `lib/memorialLanding.ts` en `ExpirationModal`, con CTA a WhatsApp prellenado: "Hola, quiero renovar el memorial de Pelusa (ID…)". |
| E8 | Al llegar al límite de dedicatorias aparece "ha alcanzado su capacidad máxima". | Se lee como un rechazo hacia quien quería escribir. | Para el visitante: "Gracias por tu cariño. Puedes encender una vela 🕯️". Para la familia (en gestión): "12 personas quisieron escribir y no pudieron → amplía a Eterno". **Esto convierte el límite en un argumento de upsell.** |

### 3.3 Estrategias de venta nuevas (por impacto / esfuerzo)
1. **Vista previa compartible = carnada viral** (alto / bajo). Con V6 resuelto, cada link compartido en WhatsApp muestra la foto y "En memoria de Pelusa". Cada visitante ve al pie, de forma discreta: *"¿Quieres un memorial así para tu compañero? — memorial.vinzer.cl"*. Hoy el footer dice "Una cortesía de Vincer Pet" sin CTA.
2. **Fechas que traen de vuelta** (alto / medio). Recordatorio por email/WhatsApp a la familia en el **aniversario de partida** y el **cumpleaños**: "Hoy hace 1 año… comparte su memorial". Es el mejor momento para renovar (Mensual → Anual/Eterno) y para que lleguen nuevas visitas.
3. **Upgrade contextual dentro de gestión** (alto / bajo). Mostrar los altares premium con vista previa real de *su* mascota y un candado suave: *"Así se vería Pelusa en Constelación"* → botón de WhatsApp. Mostrar la foto de la mascota dentro del altar bloqueado convierte mucho mejor que un candado sobre un ícono.
4. **Escasez honesta en Mensual** (medio / bajo). En gestión: "Tu memorial está activo hasta el 22/06/2027 · Pásate a Eterno y nunca vencerá". Aversión a la pérdida, sin presión agresiva.
5. **Libro de condolencias descargable (PDF)** con dedicatorias y fotos (medio / medio). Es un objeto que se puede imprimir y regalar, y funciona como add-on o como beneficio exclusivo de Eterno.
6. **QR para la urna / placa** (alto / bajo). El crematorio entrega una tarjeta con QR al memorial junto con las cenizas. Conecta lo físico con lo digital y genera visitas recurrentes.
7. **"Una cortesía de [crematorio]"** con logo y CTA del crematorio: es valor B2B. Úsalo en la venta al tenant ("tus clientes comparten tu marca en cada memorial").

### 3.4 Reglas de tono para todo el flujo
- No usar palabras técnicas visibles para la familia: *ACTIVE, EXPIRED, límite, capacidad máxima, plan*. Preferir *luz, espacio, cariño, permanencia*.
- No usar mayúsculas con tracking extremo en mensajes emocionales (se leen fríos). Reservarlas para etiquetas pequeñas.
- Los CTAs de compra siempre deben estar en el **panel de la familia**, nunca dentro del altar que ven los visitantes (salvo el pie discreto del punto 1).
- Animaciones lentas (≥ 1 s) y respetar `prefers-reduced-motion`: hoy hay Ken Burns, estrellas, nubes y partículas animándose todo el tiempo, lo que satura y gasta batería en el celular.

---

## 4. Admin `/dashboard/memorials` — mejoras de UX y operación

| # | Mejora | Detalle |
|---|--------|---------|
| A1 | **Planes nuevos sin color/badge** | Los colores del badge solo conocen `ultra/paraiso/pro/vinculo/normal/huella`. Agregar `mensual/anual/eterno`. |
| A2 | **Foto en la tabla** | Hoy se muestran iniciales ("PE"); `pet_image_url` ya viene en la respuesta. |
| A3 | **KPIs arriba** | Activos · Vencen en 30 días · Vencidos · Visitas/velas del mes. "Vencen en 30 días" es tu lista de llamadas de renovación. |
| A4 | **Filtros** | Por plan, estado, tenant y "vence pronto". La búsqueda no codifica la URL (`?search=${searchTerm}` → usar `encodeURIComponent`). |
| A5 | **Estados en español** | ACTIVE/PENDING/ARCHIVED/EXPIRED → Activo/Pendiente/Archivado/Vencido. |
| A6 | **Asignar plan ↔ vencimiento** | Al elegir Mensual/Anual, sugerir automáticamente la fecha (+1 mes / +12 meses). Eterno ya limpia `valid_until` en el backend; reflejarlo en la UI (deshabilitar el campo y mostrar "Para siempre"). |
| A7 | **Personalización con previews visuales** | Cambiar los botones de texto (`CINEMATICO`, `SAFIRO`) por miniaturas de cada altar y muestras de color. Corregir "safiro" → "zafiro" y "orange" → "naranja"; agregar tildes (Cinemático, Constelación, Galería). |
| A8 | **Dedicatoria con contador** | El backend acepta máx. 500 caracteres al editar desde la familia, pero el textarea del admin no tiene límite. Unificar en 500 con contador. |
| A9 | **Portada: mostrar todas las fotos** | El selector solo muestra 4 (`slice(0,4)`). |
| A10 | **Copiar link / PIN / mensaje de WhatsApp** | Un botón "Enviar a la familia" que copie: link del memorial + link de gestión + PIN. |
| A11 | **Paginación** | La lista carga todos los memoriales; con volumen se volverá lenta. |
| A12 | **Slug del link** | `pet_name.toLowerCase().replace(/\s+/g,'-')` no normaliza tildes ni "ñ". Usar un `slugify` compartido. |

### Backend relacionado
- `_apply_memorial_limit` asigna `memorial.diseno = diseno_copy` sobre un objeto ORM conectado a la sesión. El comentario dice que "no persiste", pero SQLAlchemy lo marca como modificado: si esa sesión hace commit (en una ruta de escritura), `theme_config` se guarda en la DB. Mejor serializar una copia en la respuesta. (`memorials/router.py:240-254`)
- `print(f"[LIMIT DEBUG] ...")` en producción → usar `logger.debug`.
- El rate-limit de `PATCH /manage` usa `request.client.host`, que detrás del proxy es la IP del proxy, así que todos comparten el mismo límite. Usar `app/core/client_ip.py`.

---

## 5. Plan de trabajo por fases

### Fase 1 — Arreglos que rompen confianza (1–2 días)
> ✅ Implementada el 2026-10-03 (pendiente de desplegar). Decisión tomada: Mensual desbloquea los altares PRO; Anual y Eterno, todos.

- [x] P1/P4/P8: el tema manda; `color_fondo` es opcional (vacío por defecto) en el admin y en el tenant (`MemorialSetupModal`).
- [x] P2: `PATCH` del creator combina `diseno` en vez de reemplazarlo.
- [x] V1: la sección de dedicatorias y el formulario respetan el tema (legibles en oscuro).
- [x] V3: el contenedor de exportación de la tarjeta social se monta solo con el modal abierto (queda tapado por el overlay).
- [x] E1/E2: banco de epitafios por defecto; eliminar `philosophy_text` como respaldo.
- [x] E5/E6: límites de fotos, dedicatorias y altares desde `rec_plans.features`; reconocer mensual/anual/eterno.
- [x] E7: `ExpirationModal` con los planes actuales (USD 10/70/110) y CTA de WhatsApp.
- [x] V6: `generateMetadata` (título, `og:image` con la foto, descripción).

### Fase 2 — Revisión de diseño altar por altar (ver sección 6)
Un altar por sesión de revisión, con la misma lista de verificación para cada uno.

> ✅ Implementada el 2026-10-03 (pendiente de desplegar). Hecho:
> - **Común:** fechas que se ocultan si faltan (formato UTC estable + "N años de amor"); nombre que se achica según el largo; velo oscuro y texto claro sobre portadas (Altar, Cielo, Galería, Constelación); `MotionConfig reducedMotion="user"`; transición suave altar → dedicatorias (V2); el feed no repite fotos en los altares que ya muestran galería (V5); sin footers "©" duplicados (V7); sin `t.philosophy_text` en los layouts.
> - **Constelación:** estrellas deterministas animadas con CSS (antes 90 nodos con `Math.random()`), velo sobre la portada, fechas + años de amor.
> - **Altar:** la vela empieza apagada con "Toca para encender su luz"; fechas bajo el nombre; panel oscuro sobre portada/tema oscuro; sin el resplandor crema que "lavaba" el panel sobre fondos oscuros.
> - **Cielo:** se agregaron Compartir/Descargar; destellos estables; título en peso normal y adaptable; padding móvil; "Ángel guardián" traducido; sin imagen externa.
> - **Cinemático:** título blanco sobre un velo tipo póster; epitafio y galería con el fondo real de la página (antes crema/negro fijos); fotos a color en móvil.
> - **Galería:** foco de luz visible sobre fondos de color; placa adaptable; "N años de amor" en la cédula; etiquetas con más contraste.
> - **Carta:** panel de foto con el tono del tema; "Para ti, {nombre}:" + firma "Con amor, tu familia" con sello de cera; sin botón duplicado.
> - **Editorial:** "Edición especial · {año}" en vez de "Memorial Issue • Vol. IV"; texto a la izquierda en móvil; capitular correcta; texto blanco sobre portada (antes oscuro sobre el panel oscuro con tema claro).
> - **Normal:** sin navegación rota; fecha completa + años de amor.
>
> Lo que necesitaba backend (contadores, estrellas con nombre, cédulas) se hizo en la Fase 3.

### Fase 3 — Rituales persistentes y prueba social (3–5 días)
> ✅ Implementada el 2026-10-03 (pendiente de desplegar; **requiere aplicar la migración `a1c3e5f7b902`**).

- [x] Endpoint de rituales: `POST /api/internal/memorials/{uuid}/rituals` (`vela | flor | estrella | beso`, nombre opcional solo para estrellas). Tabla `rec_rituals` con IP en hash SHA-256, borrado en cascada, 20/min por IP (SlowAPI) y tope de 30 por hora por memorial e IP. Solo memoriales públicos, activos y vigentes.
- [x] La respuesta pública trae `ritual_counts` y `lit_stars` (últimas 60 estrellas). El frontend suma el +1 al instante (optimista) y se reconcilia con el servidor; en la vista previa del admin no registra nada.
- [x] Prueba social en todos los altares: "N gestos de cariño para {nombre}" + chips 🕯️🌹⭐💙 sobre las dedicatorias (`RitualSummary`).
- [x] Contador junto a cada ritual: vela (Altar, Normal), flor (Editorial y nueva "Dejar una flor al pie de la obra" en Galería), beso (Cielo y botón "Un saludo al cielo" de todos los altares), estrella (Constelación).
- [x] Constelación: nombre opcional al encender una estrella; cada estrella queda en el cielo en una posición estable y al tocarla muestra "Encendida por …".
- [x] Galería: cédula editable por foto desde la gestión familiar (`diseno.captions`, máx. 60 caracteres y 30 fotos, saneadas en el backend).
- [x] `MemorialReactions` y `MemorialCandle` eliminados (no se usaban).
- [x] P3: partícula "Flores" implementada (`FloatingPetals`) y disponible en admin, gestión familiar y crematorio.

### Fase 4 — Motor de venta (continuo)
- [ ] CTA discreto al pie para visitantes ("Crea un memorial para tu compañero").
- [ ] Upgrade contextual en gestión con vista previa real de la mascota en los altares premium.
- [ ] Recordatorios de aniversario/cumpleaños + renovación.
- [ ] KPIs y filtros "vence pronto" en el admin (A3/A4).
- [ ] QR para urna/placa y libro de condolencias en PDF.

---

## 6. Fase 2 — Revisión de diseño por altar

### Lista de verificación común (aplicar a cada altar)
1. **Primer impacto (0–3 s)**: ¿se ve primero la mascota, su nombre y algo de calidez? ¿Hay un único punto focal?
2. **Legibilidad**: contraste AA (4.5:1 en texto, 3:1 en títulos grandes) en tema claro, oscuro, cada tema de color y **con portada**.
3. **Móvil (375 px)**: el nombre largo ("Copito de Nieve", "Señor Bigotes") no se desborda; padding razonable; botones ≥ 44 px.
4. **Sin datos**: sin foto, sin fechas, sin mensaje y con 1 sola foto. ¿Queda digno?
5. **Ritual**: ¿el altar tiene un gesto propio? ¿Se puede repetir? ¿Deja un rastro visible?
6. **Transición** hacia la sección de dedicatorias (sin corte brusco).
7. **Respeto a la personalización**: tema, partículas, color de fondo y portada.
8. **Movimiento**: respeta `prefers-reduced-motion`; sin animaciones que distraigan del texto.
9. **Tarjeta social**: que la versión descargable se parezca al altar.
10. **Rendimiento**: LCP de la foto principal (`priority`), sin `<img>` externos inútiles y sin `Math.random()` en el render.

---

### 6.1 Normal — "Clásico y elegante" (plan FREE)
`components/memorial/layouts/NormalLayout.tsx`
- **Concepto**: retrato enmarcado en lienzo + texto a la derecha. Sobrio y correcto.
- **Hallazgos**
  - La navegación (Inicio/Tributo/Galería/Dedicatoria) apunta a `#tribute-section` y `#gallery-section`, que **no existen** → los botones no hacen nada. "Dedicatoria" y "Tributo" se traducen igual en inglés ("Tribute").
  - Solo muestra años, y "1234 — …." termina con un punto suelto.
  - El nombre en `lg:text-8xl` puede desbordarse con nombres largos.
  - Vela: empieza apagada ✅, pero no persiste (E3).
  - Tiene un botón "volver arriba" propio, además del scroll del padre (listener duplicado).
- **Propuesta de diseño**: quitar la navegación (o implementar las anclas); mostrar fecha completa "12 mar 2014 – 3 jun 2026" y, debajo, "12 años de amor" (cifra emocional); título con `clamp()`.

### 6.2 Altar — "Altar solemne" (plan FREE)
`components/memorial/layouts/AltarLayout.tsx`
- **Concepto**: panel de vidrio esmerilado, foto en arco dorado y vela tipo pilar. **Es el más emotivo del catálogo.**
- **Hallazgos**
  - La vela está **encendida desde el inicio** y el botón no hace nada (E4).
  - El degradé cálido base nunca aparece (P4/P5): sobre `#ffffff` el vidrio blanco pierde profundidad.
  - No muestra fechas.
  - El footer "© año tenant" se duplica con el footer global.
- **Propuesta de diseño**: vela apagada con el texto "Toca para encender su luz" → llama + halo + contador "🕯️ 47"; fechas bajo el nombre en Cormorant itálica; respetar el degradé cálido cuando no hay color. Es el candidato a **altar insignia** para las fotos de la landing.

### 6.3 Editorial — "Estilo revista" (plan PRO)
`components/memorial/layouts/EditorialLayout.tsx`
- **Concepto**: revista con capitular dorada y fecha en Pinyon Script.
- **Hallazgos**
  - "Memorial Issue • Vol. IV" está fijo en inglés y no significa nada para la familia.
  - Capitular defectuosa con el texto por defecto (V9).
  - `text-justify` + itálica en móvil = ríos de espacio en blanco.
  - "Depositar una flor" funciona una sola vez por visita y no se cuenta.
  - Sin portada, el texto usa `themeConfig.text`, pero el marco del arco es negro fijo.
- **Propuesta de diseño**: sustituir "Vol. IV" por "Edición especial · {año de partida}" o por la especie; `text-left` en móvil; flor persistente con contador "🌹 23 flores".

### 6.4 Carta — "Carta solemne" (plan PRO)
`components/memorial/layouts/CartaLayout.tsx`
- **Concepto**: foto + miniaturas a la izquierda y carta en pergamino a la derecha. Muy buena idea.
- **Hallazgos**
  - El panel izquierdo `rgba(0,0,0,.3)` sobre fondo blanco queda gris apagado.
  - Fechas con `toLocaleDateString()` (formato variable y desajuste de hidratación).
  - Sin ritual propio: solo "Dejar dedicatoria" duplicado en dos botones.
  - El pergamino tiene un color fijo `#fdfbf7`, que no reacciona al tema (está bien como concepto, pero choca con temas saturados).
- **Propuesta de diseño**: empezar la carta con "Querido/a {nombre}," en script y firmar "— Tu familia", en lugar de un ✦; panel izquierdo con el color del tema; ritual "Sellar con cera" (sello dorado animado + contador).

### 6.5 Cielo — "Celestial y etéreo" (plan PRO)
`components/memorial/layouts/CieloLayout.tsx`
- **Concepto**: foto flotando en arco dorado sobre un cielo azul y el botón "Enviar un beso al cielo".
- **Hallazgos**
  - **No tiene `MemorialActionButtons`**: sin Compartir ni Descargar tarjeta (el único altar sin motor viral).
  - Las estrellas con `Math.random()` en el render saltan con cada clic (V10); hay una imagen externa inútil.
  - `p-12 md:p-20` y `text-5xl font-black` en degradé = apretado en móvil y frágil con nombres largos.
  - "ÁNGEL GUARDIÁN" está fijo (y sin traducir), y el título usa `font-black`, muy pesado para el concepto etéreo.
  - Contraste bajo sobre una portada oscura (V4).
  - El fondo azul por defecto nunca aparece (P4).
- **Propuesta de diseño**: Cinzel en peso 400 con brillo suave; agregar Compartir/Descargar; usar el contador de besos del backend ("💙 128 besos enviados al cielo"); padding `p-6 sm:p-12`.

### 6.6 Cinemático — "Épico y dramático" (plan ULTRA)
`components/memorial/layouts/CinematicoLayout.tsx`
- **Concepto**: héroe a pantalla completa con Ken Burns, epitafio y tira de fotogramas.
- **Hallazgos**
  - El nombre es `#0f172a` (casi negro) con brillo blanco **fijo**: sobre fotos oscuras se ve sucio y sobre fotos claras desaparece.
  - El desvanecido inferior y el epitafio tienen un color fijo `#FDFBF7`, que ignora tema y `color_fondo`, y luego sigue el corte con el feed (V2).
  - La galería en `grayscale` hasta el hover: en móvil no existe el hover, así que **todas las fotos se ven en gris**.
  - Ken Burns infinito + parallax sin respetar `prefers-reduced-motion`.
- **Propuesta de diseño**: nombre en blanco con sombra negra suave sobre un velo oscuro inferior (estilo póster de película); epitafio con el color del tema; fotos a color en móvil; un ritual "Apagar las luces / encender la sala" (por ejemplo, encender un proyector).

### 6.7 Constelación — "Una estrella en el cielo" (plan ULTRA)
`components/memorial/layouts/ConstelacionLayout.tsx`
- **Concepto**: cielo nocturno, retrato con halo lunar y "Encender una estrella". **Es el concepto más vendible para ULTRA.**
- **Hallazgos**
  - Con `color_fondo=#ffffff` (por defecto) **el cielo nocturno desaparece**: queda en blanco con estrellas grises (P4). Es el error más visible del catálogo premium.
  - Sobre una portada oscura, el nombre queda en índigo oscuro con poco contraste (V4, confirmado en vivo).
  - 90 estrellas animadas con framer-motion = costo de CPU en celulares de gama baja.
  - Las estrellas encendidas no persisten.
- **Propuesta de diseño**: forzar el modo oscuro en este altar (el concepto lo exige) e ignorar `color_fondo` claro; **cada estrella encendida por un visitante queda en el cielo** (posición determinista según su ID y un tooltip con el nombre: "Encendida por Tía Marta"). Esa es la gran mecánica emocional y viral de ULTRA. Estrellas en CSS/canvas en lugar de 90 nodos animados.

### 6.8 Galería — "Museo y obra de arte" (plan ULTRA)
`components/memorial/layouts/GaleriaLayout.tsx`
- **Concepto**: retrato bajo un foco, marco dorado, placa de bronce y sala de exposición.
- **Hallazgos**
  - El foco de luz se debilita mucho cuando hay `color_fondo` (0.25 frente a 0.95), así que con el valor por defecto la escena pierde su drama.
  - La pared de museo por defecto nunca aparece (P4).
  - "Obra I, II, III…" solo hasta V; con más fotos aparece "Obra 6", inconsistente (relevante si Eterno llega a 25 fotos).
  - Las fotos se repiten en el feed inferior (V5).
  - La cédula "Obra de una vida" funciona bien ✅.
- **Propuesta de diseño**: generar los números romanos con una función; agregar al pie de cada foto una "cédula" editable por la familia ("Su primera playa, 2018"); quitar las fotos repetidas del feed. Ritual: "Dejar una flor al pie de la obra".

---

## 7. Matriz rápida de estado por altar

| Altar | Plan | Fondo propio visible hoy | Ritual | Ritual persistente | Compartir/Descargar | Contraste en oscuro | Prioridad de revisión |
|-------|------|--------------------------|--------|--------------------|---------------------|---------------------|-----------------------|
| Normal | FREE | n/a | Vela | ❌ | ✅ | ⚠️ (feed) | Media |
| Altar | FREE | ❌ | Vela (ya encendida) | ❌ | ✅ | ⚠️ (feed) | **Alta** (insignia) |
| Editorial | PRO | n/a | Flor | ❌ | ✅ | ⚠️ | Media |
| Carta | PRO | n/a | — | — | ✅ | ⚠️ | Media |
| Cielo | PRO | ❌ | Beso | ❌ | ❌ | ❌ | **Alta** |
| Cinemático | ULTRA | n/a | — | — | ✅ | ❌ (epitafio fijo) | Alta |
| Constelación | ULTRA | ❌ (queda blanco) | Estrella | ❌ | ✅ | ❌ | **Muy alta** |
| Galería | ULTRA | ❌ | — | — | ✅ | ⚠️ | Media |

**Orden sugerido para la Fase 2:** Constelación → Altar → Cielo → Cinemático → Galería → Carta → Editorial → Normal.

---

## 8. Análisis responsive (móvil)

> Revisado el 2026-10-03 en 390 px de ancho (iPhone 12–15), con los 8 altares cargados en un iframe sobre un frontend local con los datos públicos de Pelusa (tema oscuro + portada). La gestión familiar se revisó solo en código: verla en vivo exigía ingresar el PIN de una familia en producción.
>
> Contexto: casi todo el tráfico del memorial llega desde el link compartido por WhatsApp, o sea, **desde el celular**. El público suele ser una familia en duelo y, a menudo, personas mayores.

### 8.1 Lo que está bien ✅
- **Ningún altar tiene scroll horizontal** en 390 px (`scrollWidth = ancho del viewport`); lo que sobresale son decoraciones dentro de contenedores con `overflow-hidden`.
- Los campos del formulario usan 16 px, así que iOS no hace zoom al tocarlos.
- Cinemático usa `100svh` (respeta la barra de direcciones de Safari).
- La tira de fotogramas de Cinemático se desliza horizontalmente a propósito y funciona bien con el dedo.
- La Fase 2 ya dejó los nombres adaptables al largo, menos espaciado en Cielo y fotos a color en táctil.

### 8.2 Hallazgos por prioridad

| # | Problema | Dónde | Por qué importa | Propuesta |
|---|----------|-------|-----------------|-----------|
| R1 | **El nombre queda bajo el pliegue**: la foto ocupa toda la primera pantalla y "PELUSA" aparece recién al bajar. | Normal, Carta, Editorial | Los primeros 3 s deben responder "¿a quién recordamos?". Altar, Cielo, Constelación, Cinemático y Galería sí lo logran. | En móvil, limitar la foto a unos `55svh` o mostrar el nombre antes de la foto (`order-first md:order-none`). |
| R2 | **Controles que solo aparecen con hover**: la ✕ para borrar foto y el texto "Seleccionar" en la gestión familiar; el corazón sobre las fotos del feed. | `gestion/page.tsx:763, 772, 889`; `MemorialClientPage.tsx` (feed) | En táctil no hay hover: la familia no ve cómo borrar una foto, justo la tarea más común desde el celular. | Que se vean siempre en táctil: `opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100`. |
| R3 | **Botón flotante de la huella (volver arriba) y badge de reCAPTCHA** fijos en la misma esquina inferior derecha; la huella además tapa las tarjetas al hacer scroll. | Normal (`bottom-8 right-8`) + badge de reCAPTCHA | Se encima con el contenido y con el badge, y se ve descuidado. | Mover la huella a la izquierda o subirla (`bottom-24`), y ocultar el badge de reCAPTCHA con la leyenda de texto que Google permite. |
| R4 | **Los 3 botones de acción quedan en 2 + 1** (uno huérfano centrado). | Todos los altares (`MemorialActionButtons`) | Se ve desordenado justo en la zona de compartir, que es el motor viral. | En móvil, una fila de 3 botones iguales con ícono y texto corto, o "Compartir" ancho completo como acción principal y los otros dos debajo. |
| R5 | **Cada foto del feed ocupa una pantalla** (ancho completo, 4:5). Con el plan Eterno (hasta 25 fotos) son hasta 25 pantallas de scroll. | Feed universal (Normal, Altar, Cielo, Editorial) | Las dedicatorias y el formulario "Honra su memoria" quedan muy abajo. | En móvil, 2 columnas para las fotos (`grid-cols-2`) o un carrusel horizontal; las dedicatorias a ancho completo. |
| R6 | **Tarjetas de dedicatoria con `min-h-[260px]`**: un mensaje de 2 líneas deja más de 100 px vacíos. | `MemorialClientPage.tsx` (feed) | Más scroll y aire muerto. | Aplicar el `min-h` solo en `md:` (en escritorio sí alinea la grilla). |
| R7 | **Texto de 8–11 px en mayúsculas espaciadas**: "UNA ESTRELLA MÁS EN EL CIELO", fechas de Carta, chips, contadores y etiquetas de la gestión (`text-[8px]`/`text-[9px]` en unos 15 lugares). | Altares y gestión familiar | Difícil de leer para personas mayores o con el celular a distancia. | Mínimo 12 px en móvil (`text-xs`) y menos tracking; en la gestión, `text-[10px]` como piso. |
| R8 | **Fechas de Altar y Carta muy chicas** (Cormorant itálica en tamaño pequeño). | Altar, Carta | La fecha es un dato emocional clave. | Subir a `text-base`/`text-lg` en móvil. |
| R9 | **Miniaturas de Carta de 40 px** (`w-10 h-10`). | Carta | Área táctil menor a los 44 px recomendados. | `w-12 h-12` en móvil. |
| R10 | **Páginas largas**: entre 2.400 y 4.000 px a 390 px (Normal 4.029, Editorial 4.015). Editorial además arranca con 96 px vacíos (`py-24`). | Normal, Editorial | Mucho scroll antes de llegar a dedicar. | Reducir el padding superior en móvil (`pt-10 md:py-24`) y aplicar R5/R6. |
| R11 | **Admin `/dashboard/memorials` no es usable en móvil**: el encabezado no hace wrap (título + buscador `w-64`); la tabla tiene 7 columnas; el modal tiene una vista previa "escritorio" de 1024 px escalada. | `admin/dashboard/memorials/page.tsx` | Es herramienta de escritorio (prioridad baja), pero el SuperAdmin a veces atiende ventas por WhatsApp desde el celular. | Encabezado `flex-col sm:flex-row`, buscador `w-full sm:w-64`, tarjetas en lugar de tabla en móvil y vista previa solo "Móvil" en pantallas chicas. |

### 8.3 Estado por altar (390 px)

| Altar | Nombre visible en el 1er pantallazo | Scroll horizontal | Alto total | Observaciones |
|-------|-------------------------------------|-------------------|------------|---------------|
| Normal | ❌ | No | ~4.030 px | R1, R3, R5 |
| Altar | ✅ | No | ~3.840 px | Fechas chicas (R8) |
| Cielo | ✅ (debajo de la foto) | No | ~3.700 px | Bien |
| Constelación | ✅ | No | ~2.440 px | El mejor en móvil |
| Cinemático | ✅ | No | ~2.880 px | Bien; la tira horizontal es intencional |
| Galería | ✅ | No | ~3.000 px | Bien |
| Carta | ❌ | No | ~2.560 px | R1, R9 |
| Editorial | ❌ | No | ~4.015 px | R1, R10 |

### 8.4 Plan sugerido (Fase 5 — responsive)
1. **R2** (controles solo con hover en la gestión): es un bug funcional, ~15 min.
2. **R1 + R5 + R6** (pliegue y largo de la página): el mayor impacto en la experiencia, ~2 h.
3. **R3 + R4** (botones flotantes y acciones), ~1 h.
4. **R7 + R8 + R9** (legibilidad y áreas táctiles), ~1 h.
5. **R10 + R11** (pulido y admin), ~2 h.

Antes de cerrar: revisar en un iPhone real (Safari) y un Android (Chrome), porque el iframe no reproduce la barra de direcciones dinámica ni el teclado.
