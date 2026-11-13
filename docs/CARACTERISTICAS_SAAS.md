# Vinzer: características, novedades y limitaciones

> Fecha: 2026-11-02. Sirve para diseñar los planes. Complementa `ANALISIS_PLANES.md`.
> La disponibilidad por plan sale de la **base local** (`sys_subscription_plans`) y puede diferir de producción.

**Leyenda de planes:** F = FREE · T = Track · N = NORMAL · P = PRO · U = ULTRA
✓ = incluido · ✗ = no incluido · ✓* = no está configurado en el plan, **queda incluido por defecto** · ✓† = incluido por la regla de respaldo del código
**Estado:** 🆕 Nuevo (oct–nov 2026) · ✅ Disponible · ⚠️ Disponible con limitación · 🔜 Próximamente / incompleto

---

## 1. Límites por plan (lo que hoy se cobra)

| Límite | F | T | N | P | U | Cómo se aplica |
|---|---|---|---|---|---|---|
| Precio mensual (CLP) | $0 | $29.900 | $39.900 | $79.990 | $119.000 | Lo que paga cada cliente queda congelado al contratar |
| Órdenes al mes | 5 | 25 | 40 | 60 | 250 | Bloqueo duro + aviso al 80 % y 100 % (panel y correo) |
| Mascotas / clientes | 5 | 25 | 40 | 60 | 250 | ⚠️ Configurado, pero el backend **no lo verifica** al crear (solo se muestra) |
| Usuarios | 1 | 2 | 3 | 4 | 5 | Se verifica cuando el SuperAdmin crea el usuario + aviso |
| Veterinarias (partners) | 0 | 0 | 15 | 30 | 100 | ⚠️ No se verifica en backend |
| Servicios / planes / productos | 10/2/5 | 10/5/15 | 20/7/50 | 50/10/200 | 70/20/300 | Bloqueo duro |
| Eliminar registros | ✗ | ✗ | ✓ | ✓ | ✓ | `can_delete` |
| Exportar datos | ✗ | ✗ | ✗ | ✓ | ✓ | `can_export` |
| Créditos IA al mes (no acumulables) | 0 | 0 | 3 | 7 | 10 | 1 crédito = 1 diseño con 3 intentos, vigencia 7 días |
| Precio crédito IA extra (USD) | 0,99 | 0,99 | 0,89 | 0,75 | 0,59 | Se muestra en CLP y USD |
| Descuento por pago anual | — | 45 % | 45 % | 45 % | 45 % | Un % global, editable por el SuperAdmin («precio de lanzamiento») |

---

## 2. Características para el crematorio (panel del cliente)

### 2.1 Clientes, mascotas y ventas

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Clientes | Ficha de familia: crear, editar, eliminar, buscar | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Mascotas | Ficha con fotos, fechas de nacimiento/fallecimiento, peso | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| **Convenios con empresas** | % de descuento en planes, ánforas y un servicio especial; se congela en la orden | ✓* | ✓* | ✓* | ✓* | ✓* | 🆕 |
| Catálogo de servicios y planes | Servicios, planes con servicios y ánforas incluidos | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Recargo por peso | Tramos «desde–hasta» (máx. 20), se aplican solos en la orden | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Catálogo de planes para compartir | Enlace público con planes y tamaños + embudo (visitas, solicitudes, WhatsApp, formularios) | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Catálogo público de productos | Catálogo de ánforas/productos para enviar a la familia | ✗ | ✗ | ✓ | ✓ | ✓ | ✅ |
| Descuento especial (%) | Descuento manual en la orden, después del convenio | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |

### 2.2 Órdenes de cremación

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Recepción y pedidos (Kanban + lista) | Tablero por estado; Entregados paginado de a 5 | ✓ | ✓ | ✓ | ✓ | ✓ | 🆕 (paginación) |
| Editar orden por secciones | Angelito, logística, evidencia, comercial | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| **Ánfora del plan como línea de la orden** | Se descuenta y devuelve del stock; «Cambiar» ánfora y «Cobrar diferencia» | ✓ | ✓ | ✓ | ✓ | ✓ | 🆕 |
| **Validación de stock** | No deja guardar sin stock; suma todas las líneas del producto | ✓ | ✓ | ✓ | ✓ | ✓ | 🆕 |
| **Confirmación antes de guardar** | Resumen de la orden / cambios antes de crear, actualizar o eliminar | ✓ | ✓ | ✓ | ✓ | ✓ | 🆕 |
| **Vista previa del recibo** | Ver el recibo antes de guardar | ✓ | ✓ | ✓ | ✓ | ✓ | 🆕 |
| Recibo PDF | Con ánforas incluidas, convenio y descuentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Eliminar orden con alcance | Solo la orden / la mascota completa / también el cliente | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Comisión a veterinaria | Se calcula sobre el total final; se borra al cancelar | ✗ | ✗ | ⚠️ | ⚠️ | ⚠️ | ⚠️ (ver §6) |

### 2.3 Operación y seguimiento para la familia

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Flujo operativo configurable | Cada crematorio define sus etapas | ✓ | ✓ | ✓* | ✓ | ✓ | ✅ |
| Panel de trabajo | Avance de etapas con evidencia (foto, nota, firma) | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Seguimiento en vivo (link + código) | La familia ve cada etapa con horarios y fotos | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Avisos a la familia | Correo automático al entrar a una etapa + WhatsApp manual + historial | ✓* | ✓* | ✓* | ✓* | ✓* | ✅ |
| Encuesta de satisfacción | 1–5 + comentario al finalizar; invitación a reseña en Google | ✓* | ✓* | ✓* | ✓* | ✓* | ✅ |
| Correos «no responder» | Pie con teléfono y correo del crematorio | ✓ | ✓ | ✓ | ✓ | ✓ | 🆕 |

### 2.4 Formulario público de registro

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Formulario para la familia | Por pasos (Familia, Ángel, Camino, Recuerdos), con PIN temporal | ✓ | ✓ | ✓* | ✓ | ✓ | ✅ |
| Campos configurables | Mostrar/ocultar/obligatorio, renombrar campos | ✓ | ✓ | ✓* | ✓ | ✓ | ✅ |
| Formularios personalizados | Varios enlaces, con servicio fijo y total estimado | ✓ | ✓ | ✓* | ✓ | ✓ | ✅ |
| Mensaje de bienvenida | General o por formulario | ✓ | ✓ | ✓* | ✓ | ✓ | ✅ |
| Video de bienvenida | Video ≤ 30 s (subido o Vimeo/Cloudflare), al inicio o al final | ✗ | ✗ | ✗ | ✓ | ✓ | ✅ |
| Procesar registro | Crea cliente → mascota → orden en un clic | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |

### 2.5 Documentos, diseños e IA

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Certificado de cremación (PDF) | Plantillas, datos reales de la mascota, aviso si faltan fechas | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Repositorio de documentos | Certificados guardados | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Tarjetas de homenaje | Carta de despedida digital | ✗ | ✓ | ✓* | ✓ | ✓ | ✅ |
| Diseños para redes con IA | Plantillas + ilustración IA desde la foto real + texto IA | ✓* | ✓* | ✓* | ✓ | ✓ | ✅ (usa créditos) |
| «Ajustar elementos» del diseño | Ocultar/mover capas solo para ese diseño | ✓* | ✓* | ✓* | ✓ | ✓ | ✅ |
| «Generar todo» | Procesa el registro y crea certificado + tarjeta + imagen de redes | ✗ | ✗ | ✓* | ✓ | ✓ | ✅ |
| Compra de créditos IA | Packs 1/5/10 o cantidad libre; pago por transferencia | ✓ | ✓ | ✓* | ✓ | ✓ | ✅ |

### 2.6 Memorial digital

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Memorial de la mascota | Página pública, PIN opcional, diseño (altar, partículas, fuentes) | ✗ | ✗ | ✓* | ✓ | ✓ | ✅ |
| Dedicatorias | La familia aprueba o rechaza | ✗ | ✗ | ✓* | ✓ | ✓ | ✅ |
| Melodías | Música de fondo elegida por el crematorio | ✗ | ✗ | ✓* | ✓ | ✓ | ✅ |
| Gestión por la familia | Página simple con guardado automático | ✗ | ✗ | ✓* | ✓ | ✓ | ✅ |

### 2.7 Inventario

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| Productos (ánforas, relicarios) | Stock, costo, precio, disponibilidad | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Categorías y proveedores | Gestión | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| PDF de productos | Descarga | ✓ | ✗ | ✓ | ✓ | ✓ | ⚠️ (Track no, FREE sí) |

### 2.8 Configuración, equipo e integraciones

| Característica | Qué ofrece | F | T | N | P | U | Estado |
|---|---|---|---|---|---|---|---|
| General / Facturación / Notificaciones | Datos del crematorio, plan, reportar pago | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ (siempre visible) |
| Usuarios y roles | 8 roles + permisos por módulo y acción | ✗ | ✗ | ✓ | ✓ | ✓ | ✅ |
| Marca blanca (sin «Vinzer») | En seguimiento, formulario, catálogo y correos | ✗ | ✓† | ✓† | ✓† | ✓ | ✅ |
| Widget para la web del crematorio | Catálogo y seguimiento incrustables, con API key y dominios | ✗ | ✗ | ✗ | ✓ | ✓ | ✅ |
| Formulario incrustable | El formulario dentro de la web propia | ✗ | ✗ | ✗ | ✓ | ✓ | ✅ |
| Exportar | Descarga de datos | ✗ | ✗ | ✗ | ✓ | ✓ | ✅ |
| Dashboard con métricas | KPIs y gráfico mensual | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Tarjeta de satisfacción | Promedio de la encuesta (dueños) | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Centro de ayuda | Guías y preguntas frecuentes según lo que el plan permite | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| Checklist «Configura tu crematorio» | 6 pasos detectados solos (primeros 90 días) | ⚠️ | ✓ | ✓ | ✓ | ✓ | ⚠️ (FREE no puede crear 2.º usuario) |

---

## 3. Para la familia (sin cuenta)

| Característica | Qué ofrece | Estado |
|---|---|---|
| Seguimiento en vivo | Línea de tiempo con fotos y notas; búsqueda por código en `track.` | ✅ |
| Formulario de registro | Desde el celular, con precios por peso si el crematorio lo permite | ✅ |
| Catálogo de planes | Elegir tamaño y plan, solicitar por WhatsApp | ✅ |
| Memorial | Ver, dejar dedicatorias, escuchar melodía; gestionar con PIN | ✅ |
| Encuesta | Una pregunta al terminar el servicio | ✅ |
| Planes de memorial (USD) | Mensual 10 / Anual 70 / Eterno 110 | ⚠️ venta por WhatsApp |

---

## 4. Para Vinzer (SuperAdmin)

| Herramienta | Qué ofrece | Estado |
|---|---|---|
| Crematorios | Alta, plan, demo temporal de plan superior, regalar créditos | ✅ |
| Configuración de planes | Precios, límites, funciones, descuento anual, funciones visibles en la web | ✅ |
| Métricas del negocio | MRR/ARR/ARPA, altas y cambios de plan, clientes en riesgo y oportunidades | ✅ |
| KPIs del catálogo | Embudo de los catálogos de planes de todos los crematorios | ✅ |
| Diagnóstico 360° | Evaluación de prospectos (10/15/20 preguntas) + PDF + versión pública `vinzer.cl/diagnostico` | 🆕 |
| Créditos IA | Saldo OpenRouter, costo real vs. valor, solicitudes de compra, alertas de saldo | ✅ |
| Plataformas IA | Gemini, Claude, ChatGPT, OpenRouter, DeepSeek con cadena de respaldo | ✅ |
| Plantillas de diseño | Editor visual con capas de datos e IA; uso por plantilla; borrar lo creado | ✅ |
| Biblioteca de medios y melodías | Imágenes y audio global | ✅ |
| Banner del panel | Carrusel con slide principal + 3 extra | ✅ |
| Respaldos | Automáticos + prueba de restauración mensual | ✅ |
| Monitoreo | Sentry, health check, auditoría de cada solicitud | ✅ |

---

## 5. Captación y venta

| Característica | Qué ofrece | Estado |
|---|---|---|
| Landing `vinzer.cl` | Planes desde la base de datos, comparación completa, «−X %» anual | ✅ |
| Registro gratis | `vinzer.cl/crear-cuenta` con confirmación por correo + 1 crédito IA de regalo | ✅ |
| Planes pagados | Botón a WhatsApp (no hay checkout público) | ⚠️ |
| Pago de suscripción | Polar.sh + reporte manual de transferencia | ✅ |
| Diagnóstico gratis público | Genera lead + informe + plan sugerido con promo | 🆕 |
| Páginas legales | Términos, privacidad, cookies | ⚠️ falta completar `LEGAL_ENTITY` |

---

## 6. Limitaciones y pendientes (lo que NO ofrecemos todavía)

| # | Limitación | Efecto en los planes |
|---|---|---|
| 1 | **Portal de veterinarias incompleto** (las clínicas no tienen su propio portal funcional) | No vender «portal B2B»; las veterinarias se gestionan desde el crematorio |
| 2 | **Funciones de veterinarias apagadas en todos los planes** (`veterinarios:*` = ✗), pero los planes tienen límite de 15/30/100 | Se promete un límite que no se puede usar: revisar |
| 3 | **Liquidación de comisiones** sin pago automático (solo se calcula y marca) | Vender como «cálculo de comisiones», no «pago» |
| 4 | **Sin checkout público** para planes pagados (WhatsApp) | Fricción en la venta self-service |
| 5 | Límites de **mascotas, clientes y veterinarias no se verifican en backend** al crear (solo órdenes, servicios, planes, productos y usuarios) | Hoy no son un límite real: o se aplican o se quitan de la oferta |
| 6 | **Funciones de NORMAL sin configurar** → memorial, «Generar todo» e IA incluidos por defecto | NORMAL ≈ PRO en funciones |
| 7 | **Convenios** incluido en todos los planes (sin configurar) | Función B2B regalada en FREE/Track |
| 8 | Órdenes antiguas del formulario web: el stock del ánfora del plan no se devolvió al eliminarlas | No reparable automáticamente |
| 9 | Generación de imágenes IA tarda > 60 s a veces y depende del saldo en OpenRouter/Gemini | Necesita proxy a 180 s y alerta de saldo |
| 10 | Portal veterinario usa el sistema de sesión antiguo | Pendiente de migrar |
| 11 | Créditos IA mensuales no se acumulan | Comunicarlo claro en la oferta |
| 12 | Memorial pagado (USD) se vende por WhatsApp, sin cobro automático | Venta asistida |

---

## 7. Ideas para usar esta tabla al rediseñar planes

- **Gancho de cada plan:** elegir 1–2 funciones que el cliente pueda nombrar (Track = seguimiento para la familia; NORMAL = gestión completa + IA; PRO = web propia; ULTRA = marca blanca y volumen).
- **Configurar todo explícitamente** en Admin → Planes: hoy muchas funciones quedan incluidas «por defecto» (✓*).
- **Candidatas a subir de plan** (hoy en todos): convenios, catálogo de planes con embudo, avisos a la familia por correo.
- **Candidatas a bajar de plan** (para atraer): un crédito IA de prueba en FREE/Track para que vean el valor de los diseños.
- **No prometer** lo que está en §6 hasta que esté terminado.
