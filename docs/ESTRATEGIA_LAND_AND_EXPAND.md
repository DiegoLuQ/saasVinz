# Estrategia «Land and Expand» con el plan Track

> Propuesta del 2026-11-12. Estado: **en evaluación** (sin código todavía).

**Idea:** no venderle un sistema gigante el día 1 a un crematorio que hoy trabaja con cuaderno o Excel.

- **Fase 1, Aterrizar:** darle entrada con lo que resuelve su dolor más urgente (trazabilidad con QR y certificados digitales), por una tarifa mensual accesible.
- **Fase 2, Expandir:** cuando ya confía en el sistema, desbloquearle módulos o cobrarle según su crecimiento.

**Conclusión corta:** Track ya cumple casi todo el papel de «Aterrizar» y no hace falta crear un plan nuevo. Hay que **afinar Track como puerta de entrada** y **construir el mecanismo de expansión**, que es lo que hoy falta.

---

## Fase 1 — Aterrizar: Track = «trazabilidad con QR + certificado»

### 1. Recortar Track a lo que resuelve el dolor del cuaderno

Hoy Track incluye bastante más de lo necesario: diseños para redes con IA, tarjetas de homenaje, formulario público, etc.

| Track **incluye** (lo que la familia ve) | Pasa a **Expandir** |
|---|---|
| Crear la orden rápido (cliente, mascota, plan) | Diseños para redes IA, tarjetas de homenaje |
| Flujo de etapas + seguimiento público con QR | Memorial, «Generar todo» |
| Avisos a la familia (correo / WhatsApp) | Catálogo de planes y productos, tiendita de recuerdos |
| Certificado PDF con código de verificación | Convenios, veterinarias, inventario de ánforas |
| Formulario web básico (es la entrada de los pedidos) | Indicadores, exportar, marca blanca |

> **Esfuerzo:** solo configuración. Se cambian las características del plan Track en Admin → Planes → «Configurar Características». No requiere código.

### 2. Que la trazabilidad se vea física, no solo digital

Es lo que convence a quien viene del cuaderno:

- **Etiqueta QR imprimible por orden**, para pegar en la bolsa o la urna:
  - el operador la escanea para avanzar la etapa;
  - la familia la escanea para ver el seguimiento.
- **Certificado con QR de verificación**, para comprobar que es auténtico. El `verification_code` de la orden ya existe.

> **Esfuerzo:** es lo único realmente nuevo que pide la Fase 1.

### 3. Que el arranque sea inmediato

- Cuenta creada en 5 minutos. El autoregistro ya existe para FREE; falta abrirlo para Track.
- Flujo de etapas predeterminado ya cargado.
- Importar las órdenes que hoy tienen en Excel.

**Objetivo:** que la **primera familia abra su seguimiento en la primera semana**. Ya se puede medir con las aperturas de tracking (`sys_public_link_views`).

---

## Fase 2 — Expandir: el mecanismo que falta

### 4. Módulos adicionales sobre el plan (*add-ons*)

Hoy solo se puede subir de plan completo. La pieza clave sería poder activarle a un crematorio **un módulo suelto** por un monto mensual extra, por ejemplo:

- Memorial
- Catálogo + tiendita de recuerdos
- Diseños IA
- Inventario de ánforas

Cómo encaja en lo que ya existe:

- El monto se suma a lo que paga el crematorio (`sys_tenants.contracted_price`).
- El control de características (`plan_has` / `tenant_has`) lo respetaría, así que **todo lo que hoy está bloqueado funcionaría solo** al activar el módulo.

> **Esfuerzo:** es lo más grande, porque toca facturación.

### 5. Cobrar por volumen en vez de bloquear

- Al pasar las 25 órdenes del mes, Track podría **cobrar un monto por orden extra** en lugar de cortar el servicio.
- Las alertas del 80 % y del 100 % ya existen; solo cambiaría el mensaje: *«Este mes llevas 31 órdenes: te conviene NORMAL»*.
- Se puede sugerir subir de plan por volumen o por necesidad, como ya calcula el Diagnóstico 360°.

### 6. Que lo bloqueado venda

- Hoy una sección bloqueada dice «no incluida en tu plan». Debería mostrar:
  - un **ejemplo real con sus datos** (*«así se vería el memorial de Luna»*);
  - un botón **«Probar 14 días»**, que usaría la demo temporal que ya existe (`effective_plan`).
- Ganchos en el momento justo:
  - **Al finalizar una orden:** *«¿Quieres regalarle un memorial a esta familia?»*
  - **Al emitir el certificado:** *«Agrega la tarjeta de homenaje»*

### 7. No construir módulos sin demanda

Rutas de choferes y pasarela de pagos para familias **no existen**.

1. Primero, botones **«Próximamente — avísame»**, contando cuántos crematorios los piden.
2. Recién con interés real, se construyen.

---

## Cómo saber si funciona

Para ti como dueño, en **Métricas del negocio** (los cambios de plan ya quedan registrados en `sys_tenant_events`):

| Métrica | Qué mide |
|---|---|
| **Activación** | % de crematorios Track con una orden y su seguimiento abierto en los primeros 7 días |
| **Conversión** | % de Track que sube de plan o compra un módulo en 90 días |
| **Ingreso por expansión** | Cuánto crece el MRR por *add-ons* y subidas de plan, frente al MRR de clientes nuevos |
| **Uso** | Qué módulo bloqueado más se intenta abrir: indica qué *add-on* construir y vender primero |

---

## Orden sugerido

| # | Paso | Esfuerzo |
|---|---|---|
| 1 | Recortar Track y ajustar el mensaje en la web | Solo configuración |
| 2 | Etiqueta QR imprimible + QR de verificación en el certificado | Bajo / medio |
| 3 | Bloqueos que venden + «Probar 14 días» + medir intentos de abrir lo bloqueado | Medio |
| 4 | *Add-ons* por módulo + cobro por volumen | Alto (facturación) |
| 5 | Módulos nuevos (rutas, pagos) | Solo si la lista de espera lo justifica |

---

## Decisiones pendientes

- **Precio de Track:** ¿bajarlo (por ejemplo a $19.900) para que la entrada sea más fácil, o mantenerlo en $29.900?
- **Al pasar las 25 órdenes:** ¿cobrar por orden extra o mantener el bloqueo?
- **Qué sale de Track:** ¿quitar la IA y las tarjetas de homenaje, o dejar alguna como gancho?
