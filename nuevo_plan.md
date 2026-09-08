# 🗺️ Plan Maestro de Optimización Web: Vinzer.cl

> **Versión corregida — 26 ago 2026.** Este documento fue alineado contra el sistema real
> (`SubscriptionPlan` en BD, `app/utils/limit_checker.py`, `components/vinzer/*`,
> `components/public/TrackingSearch.tsx`, `api/public/tracking/router.py`).
> **La base de datos es la fuente de verdad de los planes.** Ningún valor de este plan
> modifica lo que ya está en el sistema: si aquí y en la BD difieren, manda la BD.
>
> Los puntos marcados con 🔎 requieren verificación contra la BD de producción antes de publicarse.
> Los puntos marcados con 🚧 describen funcionalidad que **aún no existe** y no debe anunciarse
> hasta estar construida.

---

## FASE 0: Regla de datos

Antes de escribir una línea de copy comercial:

1. **Los topes de plan que se publiquen deben ser exactamente los de `SubscriptionPlan`.**
   Si la web promete más de lo que aplica `LimitChecker`, el cliente recibe un
   `402 PAYMENT REQUIRED` al superar el tope real. Eso es exposición comercial, no un bug de copy.
2. **Mascotas, órdenes y clientes se cuentan por mes calendario** (hora de Chile).
   **Usuarios, servicios, productos y planes internos son un tope total acumulado**, no mensual.
   Nunca escribir "usuarios simultáneos": son cuentas creadas, estén conectadas o no.
3. **El precio anual vive en el campo `annual_price`**, que es el que usa
   `admin/billing/router.py` para cobrar. No calcular el anual en el frontend con un
   porcentaje fijo: hoy la landing calcula −20 % y muestra cifras distintas a las que cobra el sistema.
4. **La sección de precios debe leer los planes desde el endpoint público**, no desde
   constantes escritas en el JSX. Es la única forma de que la web no vuelva a desviarse.

---

## FASE 1: Estrategia y Arquitectura de Navegación

### El gran desafío resuelto:
En la web conviven dos perfiles:
1. **El Comprador B2B (Dueño/Administrador de crematorio):** viene a evaluar el software para comprarlo.
2. **El Usuario Final (Tutor de mascota o Clínica Veterinaria):** viene a rastrear un servicio en curso.

> **Regla de oro:** La web debe estar pensada 90 % para vender el software, pero ofreciendo un
> acceso directo e impecable para la consulta de seguimiento sin estorbar el embudo de ventas.

---

## FASE 2: Especificación Detallada Sección por Sección

---

### SECCIÓN 0: Barra de Navegación Superior (*Sticky Navbar*)
* **Objetivo:** Orientar al visitante, dar acceso inmediato a la demo y permitir la consulta rápida de seguimiento.
* **Componentes:**
  * **Izquierda:** Logo de Vinzer (`VinzerLogo`).
  * **Centro (Menú):** `Módulos` | `Cómo Funciona` | `Sitio Web Crematorio` | `Precios` | `FAQ`.
  * **Derecha (Acciones clave):**
    * Botón secundario con estilo buscador/cápsula: **`🔍 Estado del Servicio`**
      (scroll suave al ancla `#seguimiento`; el mecanismo `handleNavLinkClick` ya existe,
      solo hay que sumar la sección al array de `handleScroll`).
    * Botón primario: **`Solicitar Demo`** (color de acento).
* **Se conserva:** el toggle de tema claro/oscuro que ya existe en el header actual.

---

### SECCIÓN 1: Cabecera Principal (*Hero Section*)
* **Objetivo:** Atrapar en menos de 5 segundos al dueño del crematorio con una propuesta de valor indiscutible.
* **Contenido Exacto:**
  * **Badge Superior:** `✨ Software integral para la industria funeraria de mascotas`
  * **Título Principal (H1):**
    > **"Software de control operativo y trazabilidad total para tu crematorio de mascotas."**

    > ⚠️ **Mantener la palabra "software" y la frase "crematorio de mascotas" en el H1.**
    > El `title`, los `keywords` y el JSON-LD de `app/(public)/vinzer/page.tsx` están construidos
    > sobre "software para crematorios de mascotas". Un H1 que empiece en "Control operativo"
    > rompe esa coherencia y pierde posicionamiento.
  * **Subtítulo:**
    > *"Automatiza el registro de servicios, el flujo de trabajo de planta, la emisión de
    > certificados y el seguimiento público para las familias, en un solo sistema en la nube."*
  * **Botones de Acción (CTAs):**
    * Botón Primario: `Agendar Demostración Gratis`
    * Botón Secundario: `Ver Planes y Precios`
  * **Elemento Visual Central:** Mockup limpio de la pantalla principal (Dashboard).
    El buscador de seguimiento **sale del mockup** y pasa a la Sección 2.

> ❌ **Eliminar el CTA "Ver cómo funciona".** El modal actual
> (`VinzerLandingClient.tsx:849`) apunta a `youtube.com/embed/dQw4w9WgXcQ` — un placeholder
> que quedó publicado. Retirar el botón y el modal completo hasta tener una grabación real
> del dashboard.

---

### SECCIÓN 2: Módulo Público de Consulta (*Buscador de Estado del Servicio*)
* **Objetivo:** Doble propósito: herramienta funcional para tutores/veterinarias y demostración
  en vivo, para el dueño del crematorio, de cómo su negocio se verá más profesional y transparente.
* **Ubicación:** Sección propia justo debajo del Hero, con ancla `#seguimiento`.
* **Implementación:** reutilizar `components/public/TrackingSearch.tsx` con `layout="inline"`
  (ya está implementado y hoy no se usa en ninguna parte). Cero código nuevo.
* **Contenido Exacto:**
  * **Título de la tarjeta:** `Trazabilidad y Estado de Servicio en Tiempo Real`
  * **Subtexto:** *"¿Eres tutor o clínica veterinaria? Ingresa el código de seguimiento único
    para conocer el estado del proceso."*
  * **Formulario interactivo:**
    * Input placeholder: **`Ej: SMROE2STJ4`**

      > ⚠️ **No usar `VM-8492` ni ningún formato con prefijo y guion.** El `verification_code`
      > real son **10 caracteres alfanuméricos sin separadores**. El input fuerza mayúsculas y
      > elimina espacios; un ejemplo con guion hará que la gente escriba un formato que siempre
      > devolverá 404.
    * Botón: `Consultar Estado`
  * **Mensaje comercial para el dueño del crematorio (Badge inferior):**
    * *"💡 Con Vinzer, tus clientes y veterinarias aliadas consultan el estado en línea sin
      necesidad de llamarte."*

      > ⚠️ **No publicar la cifra "reduce las consultas en un 80 %"** mientras no exista una
      > medición real. Es un dato inventado y es el tipo de promesa que un cliente puede exigir.

* **Notas técnicas:**
  * 🔎 `GET /api/public/tracking/resolve/{code}` está limitado a **10 peticiones por minuto por IP**
    (`api/public/tracking/router.py:28`). Al subir el buscador al inicio de la página más visitada,
    evaluar si ese techo aguanta clínicas u oficinas que consultan varios códigos desde la misma
    salida a internet. Alternativa mínima: mostrar un mensaje específico ante el 429 en vez del
    genérico "Ocurrió un error".
  * La página dedicada `track.` ya resuelve `?code=XXXX` automáticamente. Sirve como destino de
    enlaces directos desde certificados y correos.
  * El seguimiento público **no está limitado por plan**: funciona en los cinco planes.

---

### SECCIÓN 3: Módulos Clave del Sistema *(4 Pilares Operativos)*
* **Objetivo:** Explicar el poder técnico del software sin listas interminables de texto.
* **Estructura en cuadrícula (4 tarjetas con iconos y capturas compactas).**

> 🚧 **Los cuatro pilares fueron reescritos.** La versión anterior de este plan anunciaba
> "custodia por QR", "escaneo en cada etapa", "geolocalización" y "app de choferes".
> **Nada de eso existe en el sistema**: no hay generación ni lectura de códigos QR en el código
> (la palabra aparece únicamente en el copy de la propia landing), y de logística existe
> `LogisticsTask` con asignación de chofer, tipo (retiro/entrega) y dirección — sin coordenadas
> ni aplicación móvil dedicada. Los pilares siguientes describen solo capacidades reales.

1. **Trazabilidad y Custodia Verificable:**
   * *Copy:* *"Cada servicio genera un código de verificación único de 10 caracteres más un
     enlace de seguimiento público. El flujo de trabajo es configurable por crematorio y cada
     fase queda registrada con usuario, hora y cambios en un historial de auditoría completo."*
2. **Evidencia Fotográfica por Fase:**
   * *Copy:* *"Avanzar una etapa exige adjuntar evidencia: foto, notas y firma del operador.
     La familia ve esa misma línea de tiempo en tiempo real, sin iniciar sesión y sin llamar a
     preguntar."*
3. **Certificados Digitales Personalizables:**
   * *Copy:* *"Certificados PDF automáticos con los datos de la mascota, el tutor, el tipo de
     servicio, firma digital, marca de agua y numeración secuencial. Plantillas editables en
     secciones, colores, orden y tipografías."*
   * Disponible desde el plan **NORMAL**.
4. **Catálogo, Inventario y Coordinación de Retiros:**
   * *Copy:* *"Control de servicios, productos y ánforas, con asignación de retiros y entregas
     a los responsables de tu equipo, dirección y estado de cada tarea."*

* **Bloque a conservar del sitio actual:** la comparativa **"Método tradicional vs. Vinzer"**
  (`VinzerFeatures.tsx`, ancla `#comparativa`). Es el bloque que rompe la objeción real de este
  mercado — *"lo hago con Excel y WhatsApp"*. Comprimirlo dentro de esta sección o dejarlo como
  fila previa a Precios, pero no eliminarlo.

---

### SECCIÓN 4: Cómo Funciona *(Flujo Operativo en 3 Pasos)*
* **Objetivo:** Mostrar simplicidad para operarios de planta y personal de recepción.
* **Estructura:**
  * **Paso 1: Registro del Servicio.** Recepción —o el formulario público con token temporal y
    PIN— ingresa los datos de la mascota y el tutor. El sistema emite el código de verificación
    y el enlace de seguimiento.
  * **Paso 2: Avance del Flujo con Evidencia.** El operador completa cada fase configurada por el
    crematorio adjuntando foto, notas y su firma. La línea de tiempo pública se actualiza al instante.
  * **Paso 3: Certificado, Memorial y Entrega.** Se genera el certificado digital, se registra la
    entrega y —si el crematorio lo activa— queda publicado el memorial digital de la mascota.

---

### SECCIÓN 5: Módulo Exclusivo: Sitio Web Institucional *(Incluido en Plan Ultra)*
* **Objetivo:** Vender la ventaja competitiva del Plan Ultra: no solo adquieren el software
  interno, sino una presencia digital que proyecta seriedad a las familias.
* **Ubicación:** **antes** de la sección de Precios, para que el visitante llegue cargado a la
  tarjeta ULTRA.
* **Contenido Exacto:**
  * **Badge:** `💎 Exclusivo Plan Ultra`
  * **Título (H2):**
    > **"Tu crematorio merece un sitio web que transmita confianza y paz desde el primer clic."**
  * **Párrafo explicativo:**
    > *"El Plan Ultra incluye tu propia página web institucional personalizada con tu marca,
    > logotipo y colores, conectada a Vinzer. Permite que las familias y clínicas conozcan tus
    > servicios y consulten el estado de su mascota directamente en tu dominio."*
  * **3 Beneficios Clave del Sitio Incluido:**
    1. **Marca Blanca Completa:** tu propio dominio (ej. `www.tucrematorio.cl`) con diseño sobrio y empático.
    2. **Buscador de Seguimiento Integrado:** tus clientes consultan la trazabilidad dentro de tu propia web.
    3. **Catálogo de Servicios y Ánforas:** muestra tus tipos de cremación y tu stock de productos.
  * **Elemento Visual:** mockup de un sitio elegante en computador y teléfono.

> ⚠️ **Decisiones comerciales a cerrar antes de publicar esta sección:**
> * El componente actual (`VinzerWebService.tsx`) lo vende como **"servicio adicional"** e incluye
>   **"dominio + hosting el primer año"**. La nueva versión dice *"gratis para siempre · solo pagas
>   tu dominio"*. Son dos promesas distintas: hay que elegir una y escribir la letra chica
>   (qué pasa si el cliente se da de baja del Ultra, quién paga el hosting a partir del año 2).
> * Este sitio es un **entregable manual del equipo**, no una funcionalidad que el sistema genere
>   solo. Dimensionar la carga operativa antes de prometerlo a todo cliente Ultra.
> * Retirar el copy de agencia genérica ("somos especialistas en crear sitios web", "SEO para tu
>   ciudad", "entrega en 7–10 días hábiles") y amarrar todo el bloque al Plan Ultra.

---

### SECCIÓN 6: Planes y Precios

#### Encabezado superior
* **Garantía y seguridad:** 🔒 *"Todos los planes incluyen aislamiento estricto de datos por
  crematorio (Row-Level Security a nivel de PostgreSQL) y el módulo de seguimiento público para
  tutores y veterinarias."*

  > ⚠️ **No decir "aislamiento total de base de datos".** No hay una base de datos por cliente:
  > el aislamiento es por fila mediante RLS dentro de la misma base. Decirlo mal es una afirmación
  > técnica falsa frente a un comprador que pregunte.

* **Selector:** `[ MENSUAL ]` / `[ ANUAL ]`

  > ⚠️ **No usar la insignia "20 % DCTO".** El descuento anual real **no es uniforme**: sale del
  > campo `annual_price` de cada plan y varía entre 17 % y 37 %. Mostrar el precio anual absoluto
  > y el ahorro en pesos de cada plan, no un porcentaje único.
  >
  > Pendiente de decisión: si se quiere un porcentaje único de cara al cliente, hay que
  > **actualizar `annual_price` en la BD con una migración**, no maquillarlo en el frontend.

#### Tabla maestra — valores reales del sistema

| Plan   | Mensual (CLP) | Anual (CLP) | Mascotas/mes | Órdenes/mes | Clientes/mes | Usuarios (total) | Veterinarias | Certificados | Configuración | Operaciones | Exportación |
|--------|---------------|-------------|--------------|-------------|--------------|------------------|--------------|--------------|---------------|-------------|-------------|
| FREE   | $0            | $0          | 10           | 10          | 10           | 2                | 0            | ❌           | ❌            | ❌          | ❌          |
| Track  | $29.900       | —           | 35           | 35          | 35           | 2                | 0            | ❌           | ❌            | ✅          | ❌          |
| NORMAL | $39.900       | $299.900    | 40           | 40          | 40           | 3                | 15           | ✅           | ✅            | ✅          | ❌          |
| PRO    | $59.990       | $599.900    | 60           | 60          | 60           | 4                | 30           | ✅           | ✅            | ✅          | ✅          |
| ULTRA  | $119.000      | $999.900    | 200          | 250         | 100          | 5                | 100          | ✅           | ✅            | ✅          | ✅          |

> ### ⚠️ Verificación del 26-ago-2026 contra la BD alcanzable en desarrollo
>
> Al implementar el endpoint público de planes se consultó la BD configurada en
> `backend/.env` (`127.0.0.1:5432/v3_saas`). **Sus valores NO coinciden con la tabla de
> arriba**, que proviene de CLAUDE.md (documentada como verificada contra producción):
>
> | Plan   | Documentado (CLAUDE.md) | BD de desarrollo |
> |--------|-------------------------|------------------|
> | FREE   | 10 / 10 / 10            | **5 / 5 / 5**    |
> | Track  | 35 / 35 / 35            | **25 / 25 / 25** |
> | NORMAL | 40 / 40 / 40            | 40 / 40 / 40 ✓   |
> | PRO    | 60 / 60 / 60            | 60 / 60 / 60 ✓   |
> | ULTRA  | 200 / 250 / 100         | **250 / 250 / 250** |
>
> Además, en esa BD **FREE y Track sí tienen el módulo `certificados`** en `allowed_modules`,
> al contrario de lo que indica la tabla documentada.
>
> **Qué significa:** o la BD de desarrollo está desactualizada respecto de producción, o
> CLAUDE.md lo está. **Hay que resolverlo consultando producción** antes de dar por buenos
> los números de esta sección.
>
> **Por qué ya no es crítico para la web:** la sección de precios dejó de tener los números
> escritos a mano y ahora los lee de `GET /api/public/plans`, que consulta la misma tabla que
> aplica `LimitChecker`. La landing muestra siempre lo que su base de datos aplica, apunte a
> la que apunte. Lo que queda por corregir es el dato en sí, no el código.
>
> **Confirmado en esa BD:** los topes de catálogo de ULTRA que este plan traía sin verificar
> (**70 servicios y 300 productos**) sí son correctos.
>
> **Defecto de datos detectado:** `Track` tiene `display_order = 4`, empatado con `ULTRA`, por
> lo que se renderiza al final en vez de entre FREE y NORMAL. Script de corrección listo (no
> ejecutado): `backend/scripts/database/fix_plan_display_order.py` — simula por defecto, escribe
> con `--apply`.

* **Track no tiene precio anual** en la BD. O se define uno con una migración, o la tarjeta se
  publica solo con precio mensual.
* 🔎 **Topes de catálogo (`max_services`, `max_products`, `max_plans`) sin verificar.**
  La versión anterior de este plan prometía "hasta 70 servicios y 300 productos" en ULTRA;
  ese dato no está confirmado contra la BD de producción. **No publicarlo hasta verificarlo.**
* 🚧 **El portal B2B para veterinarias está incompleto.** El modelo de datos existe (veterinaria,
  vínculo con el crematorio, porcentaje de comisión) y los topes por plan son reales, pero el
  portal de autoservicio no está terminado y la liquidación de comisiones se calcula sin endpoint
  de pago. Mantener la etiqueta **"Próximamente"** que ya usa la landing actual.
* **Widget embebible:** disponible en **PRO y ULTRA** (`WIDGET_ALLOWED_PLANS`). Es un
  diferenciador real y verificado que hoy la sección de precios no menciona — vale la pena sumarlo.

---

#### Estructura de la sección

La grilla muestra **solo los cuatro planes de pago**, en este orden fijo:
**Track → Normal → PRO → ULTRA**. Todos sus botones dicen únicamente **`Cotizar`**.

> El orden se fija en el componente (`PAID_PLAN_ORDER`) y no por `display_order`, porque en la
> BD ese campo tiene a Track empatado con ULTRA y lo empujaba al final. Ver el defecto de datos
> más arriba.

**El plan gratuito sale de la grilla** y va en un bloque propio debajo, a ancho completo.
Mezclar un plan de $0 con los de pago ancla el precio hacia abajo y desordena la comparación;
como bloque aparte funciona como puerta de entrada para quien recién parte.

#### Bloque aparte: Plan Gratuito
* **Categoría:** PARA EMPEZAR
* **Titular:** *"¿Recién partes? Prueba Vinzer gratis."*
* **Enfoque:** ideal para crematorios que inician o desean probar la plataforma sin riesgo.
  Sin tarjeta, sin contrato y sin plazo.
* **Precio:** $0 CLP / mes (100 % gratis)
* **Detalle del plan** (los topes se leen de la BD, no se escriben a mano):
  * ✓ Mascotas, órdenes y clientes **al mes** según el tope del plan
  * ✓ Usuarios de acceso según el tope del plan
  * ✓ Catálogo de servicios y productos
  * ✓ Seguimiento público para tutores
* **Botón (CTA directo a WhatsApp):** `Solicitar por WhatsApp`
* **Nota aclaratoria al pie:**
  ⚠️ *La activación se valida por WhatsApp. Escríbenos desde el número oficial registrado de
  tu crematorio/negocio.*

#### 1. Plan Operativo: Track
* **Categoría:** OPERATIVO
* **Enfoque:** diseñado para crematorios que ya tienen facturación o CRM externo y solo necesitan
  trazabilidad y control de planta.
* **Precio:** $29.900 CLP / mes
* **Detalle del plan:**
  * ✓ Hasta 35 mascotas, 35 órdenes y 35 clientes **al mes**
  * ✓ 2 usuarios de acceso
  * ✓ Módulo de operaciones y trazabilidad del flujo de trabajo
  * ✓ Catálogo de servicios y productos
  * ✓ Seguimiento público en tiempo real
  * ✗ Sin certificados digitales ni módulo de configuración
* **Botón (CTA):** `Cotizar`

#### 2. Plan Profesional: Normal
* **Categoría:** PROFESIONAL
* **Enfoque:** gestión completa para crematorios en crecimiento con flujo constante de servicios.
* **Precio:** $39.900 CLP / mes · **Anual: $299.900 CLP** *(ahorras $178.900 al año)*
* **Detalle del plan:**
  * ✓ Hasta 40 mascotas, 40 órdenes y 40 clientes **al mes**
  * ✓ 3 usuarios de acceso
  * ✓ **Certificados digitales** y módulo de configuración
  * ✓ Operaciones y trazabilidad completas
  * ✓ Hasta 15 veterinarias asociadas *(portal B2B: próximamente)*
  * ✓ Catálogo de servicios y productos
* **Botón (CTA):** `Cotizar`

#### 3. Plan Avanzado: PRO *(El Más Recomendado)*
* **Insignia:** ★ RECOMENDADO

  > La landing actual no destaca ningún plan. Con cinco tarjetas idénticas el visitante no tiene
  > punto de entrada — la insignia es uno de los cambios de mayor impacto de todo el rediseño.
* **Categoría:** AVANZADO
* **Enfoque:** potencia y automatización para crematorios de alto volumen y convenios veterinarios.
* **Precio:** $59.990 CLP / mes · **Anual: $599.900 CLP** *(equivale a 2 meses gratis)*
* **Detalle del plan:**
  * ✓ Hasta 60 mascotas, 60 órdenes y 60 clientes **al mes**
  * ✓ 4 usuarios con roles y permisos granulares
  * ✓ **Exportación de reportes y datos habilitada**
  * ✓ **Widget embebible** para tu propio sitio web
  * ✓ Todo lo incluido en el Plan Normal
  * ✓ Hasta 30 veterinarias asociadas *(portal B2B: próximamente)*
* **Botón (CTA destacado):** `Cotizar`

#### 4. Plan Empresarial: ULTRA
* **Insignia:** 💎 TODO INCLUIDO
* **Categoría:** EMPRESARIAL
* **Enfoque:** para empresas consolidadas con alto volumen que buscan además presencia de marca digital.
* **Precio:** $119.000 CLP / mes · **Anual: $999.900 CLP** *(ahorras $428.100 al año)*
* **Detalle del plan:**
  * ✓ Hasta 200 mascotas y 250 órdenes **al mes**
  * ✓ 5 usuarios · hasta 100 clientes nuevos al mes
  * ✓ Todo lo incluido en el Plan PRO
  * ✓ Exportación de datos y widget embebible
  * ✓ Hasta 100 veterinarias asociadas *(portal B2B: próximamente)*
  * ✓ 🌐 **Sitio web institucional incluido** *(ver letra chica en la Sección 5)*
* **Botón (CTA):** `Cotizar`

> ⚠️ **Correcciones respecto de la landing en producción, a aplicar en `VinzerPricing.tsx`:**
> * PRO dice **80 mascotas/órdenes y 10 usuarios** → los topes reales son **60 y 4**.
> * ULTRA dice **"usuarios ilimitados"** → el tope real es **5**.
> * FREE dice **1 usuario** → son **2**.
> * Track dice **25 órdenes** → son **35**.
> * Los cinco CTA apuntan a `loginUrl` (`app.dominio/login`), donde **no existe registro público**:
>   el visitante llega a un login que no puede usar. Cambiarlos por WhatsApp (FREE) y Cotizar (resto).
> * El precio anual se calcula en el navegador (`precio × 0,8 × 12`) e **ignora `annual_price`**.
>   En PRO la web muestra $575.000 y el sistema cobra $599.900.

---

### SECCIÓN 7: Preguntas Frecuentes (*FAQ en Acordeón*)
* **Objetivo:** resolver dudas críticas de decisión técnica y comercial.

> ⚠️ **El FAQ está espejado en el JSON-LD** (`FAQPage`) dentro de `app/(public)/vinzer/page.tsx`.
> Si se cambian las preguntas de la sección y no se actualiza el schema, Google indexa rich
> snippets que no existen en la página. **Ambos archivos se editan juntos.**

* **Preguntas obligatorias:**
  1. **¿Qué incluye el sitio web del Plan Ultra?**
     * *R:* Diseñamos e implementamos una página web con tu logotipo, dominio propio, catálogo de
       servicios y el buscador de seguimiento conectado a tu panel Vinzer.
  2. **¿Cómo garantiza Vinzer la trazabilidad del servicio?**
     * *R:* Cada servicio genera un código de verificación único de 10 caracteres más un enlace de
       seguimiento público. El flujo de trabajo es configurable por crematorio y cada fase requiere
       evidencia fotográfica, notas y firma del operador. El sistema registra usuario, hora y
       cambios en cada acción crítica.
  3. **¿Cuánto demora la puesta en marcha del software?**
     * *R:* Tu cuenta queda habilitada en menos de 24 horas. Te capacitamos a ti y a tu equipo en
       una sola sesión.

       > 🔎 Verificar que el compromiso de "24 horas" y "sesión de 45 minutos" corresponda al
       > proceso real de alta antes de publicarlo.
  4. **¿Mi equipo necesita computadores costosos?**
     * *R:* No. Vinzer funciona desde cualquier navegador web en computador, tablet o smartphone.

       > ⚠️ Eliminada la mención a "lectores de códigos QR estándar": el sistema no usa QR.
  5. **¿Puedo migrar mi historial de servicios desde Excel?**
     * *R:* 🔎 **Pendiente de confirmar.** No hay un importador documentado en el sistema.
       Si la migración se hace de forma manual por el equipo, decirlo así; si no existe el
       servicio, retirar la pregunta. No prometer importación "sin costo adicional" sin
       validarlo con operaciones.

---

### SECCIÓN 8: Cierre y Formulario de Demostración (*CTA Final*)
* **Objetivo:** captura del lead en menos de 20 segundos.
* **Contenido:**
  * **Título:** *"Lleva la trazabilidad de tu crematorio al estándar que tus clientes esperan."*
  * **Formulario compacto (solo 3 campos):**
    1. `Nombre y Apellido`
    2. `Nombre del Crematorio / Empresa`
    3. `WhatsApp o Teléfono de contacto`
  * **Botón principal:** `Solicitar Demostración Guiada`
* **Botón Flotante:** ícono de WhatsApp con mensaje precargado
  (*"Hola, quiero coordinar una demo de Vinzer"*). No existe hoy: es un componente nuevo.

> 🚧 **Este formulario requiere backend nuevo.** La landing completa no tiene un solo `<form>`
> hoy; los seis CTA apuntan al mismo enlace de WhatsApp.
> * El endpoint existente `/api/public/contact` **no sirve**: pertenece al Plan Recuerdo
>   (memorial gratuito) y su esquema espera datos de mascota y foto.
> * Hay que crear un router público propio para leads (nombre, empresa, teléfono), con
>   **rate limit y reCAPTCHA** — la clave de sitio ya está en el entorno — y notificación por
>   correo vía `services/email.py`. Un formulario público en el dominio raíz sin protección
>   recibe spam desde el primer día.

---

## FASE 3: Checklist de lo que se DEBE ELIMINAR

* ❌ **El modal de video del hero.** Apunta a un placeholder de YouTube que sigue publicado.
* ❌ **Textos extensos de "Quiénes Somos" o historia de la empresa.** La sección `#vision`
  (Misión / Visión / Valores + foto + cita del equipo) se retira; lo institucional pasa al footer.
* ❌ **La barra de cifras.** "10 caracteres", "3 roles" y "5 planes" no son logros comerciales:
  son detalles de implementación presentados como métricas.
* ❌ **Las 12 tarjetas de `#capacidades`.** Se comprimen en los 4 pilares de la Sección 3.
* ❌ **Listas planas de viñetas.** Reemplazadas por tarjetas visuales con iconos.
* ❌ **Formularios con más de 4 preguntas.** Nada de RUT, dirección física o mensajes largos en
  el primer contacto.
* ❌ **Frases que suenen a agencia genérica de diseño web.** La mención del sitio web queda 100 %
  amarrada al Plan Ultra.
* ❌ **Toda mención a QR, geolocalización o app de choferes**, hasta que esas funciones existan.
* ❌ **Cifras de marketing sin respaldo** ("reduce las consultas un 80 %").

### Lo que NO se debe eliminar
* ⚠️ **La comparativa "Método tradicional vs. Vinzer"** — es el bloque que rompe la objeción real
  del mercado. Conservarlo, aunque sea comprimido.
* ⚠️ **La densidad de texto indexable.** Módulos + Comparativa + Capacidades concentran casi todo
  el cuerpo que sostiene el posicionamiento SEO. Al pasar de ~2.700 a ~1.200 líneas hay que
  compensar con copy más denso en los 4 pilares y en el FAQ.

---

## Resumen del Flujo de Conversión

```text
[ Navbar: Logo + Menú + Estado del Servicio + Solicitar Demo ]
                         ↓
[ Hero: Propuesta de valor B2B + Mockup del Dashboard ]
                         ↓
[ #seguimiento — Buscador de Estado del Servicio (tutores / clínicas) ]
                         ↓
[ 4 Pilares: Trazabilidad, Evidencia, Certificados, Catálogo y Retiros ]
                         ↓
[ Cómo Funciona: 3 pasos reales de la operación ]
                         ↓
[ Sitio Web Institucional — Incluido en Plan Ultra ]
                         ↓
[ Precios: Track | NORMAL | PRO ★ | ULTRA 💎  +  bloque Plan Gratuito ]
                         ↓
[ FAQ Acordeón (sincronizado con el JSON-LD) ]
                         ↓
[ Formulario Express (3 campos) + WhatsApp Flotante ]
```

---

## Orden de ejecución sugerido

| Fase | Alcance | Detalle |
|------|---------|---------|
| **A** | Urgente, independiente del rediseño | Quitar el modal de video del hero · Corregir PRO, ULTRA, FREE y Track en `VinzerPricing.tsx` · Decidir la política anual y llevarla a `annual_price` |
| **B** | Prioridad 1 y 2 | Extraer el buscador a `#seguimiento` con `layout="inline"` · Botón "Estado del Servicio" en navbar y menú móvil · Rehacer la sección de planes leyendo del endpoint público |
| **C** | Reestructuración | Reescribir los 4 pilares · Journey de 4 a 3 pasos · Mover el sitio web antes de Precios · Retirar `#vision` y la barra de cifras · Sincronizar JSON-LD y H1 |
| **D** | Captura de leads | Endpoint de leads + correo + rate limit + reCAPTCHA · Formulario de 3 campos · WhatsApp flotante · Revisar el límite de `/resolve` |
