# Vinzer: SaaS para crematorios de mascotas

Vinzer es una plataforma web multi-tenant para crematorios y funerarias de mascotas en Chile (precios en CLP). Cada crematorio (tenant) tiene sus datos aislados a nivel de base de datos (PostgreSQL con Row-Level Security). Cubre la operación completa: desde que la familia pide el servicio hasta la entrega de las cenizas y el recuerdo posterior.

## Flujo principal

1. **Formulario público para familias:** la familia registra al tutor, la mascota, el tamaño o peso, el servicio y las fotos. Cada crematorio configura qué campos se piden, sus rangos de peso y precios, el cobro de traslado por comuna y los servicios especiales.
2. **Registros → Orden de cremación:** el crematorio procesa el registro y se crean el cliente, la mascota y la orden. Los planes, servicios y productos vendidos quedan "congelados" en la orden, y el stock de ánforas e insumos se descuenta.
3. **Flujo operativo configurable:** cada crematorio define sus etapas. En el Panel de Trabajo el operador avanza cada orden con evidencia (foto, notas, firma) y, si quiere, avisa a la familia por WhatsApp o correo.
4. **Seguimiento público:** la familia sigue el servicio en tiempo real con un enlace o un código, sin iniciar sesión.
5. **Entrega:** al cerrar la orden se envía un correo de fase final y después una invitación programada a dejar una reseña en Google.

## Módulos clave

- **CRM:** clientes, mascotas, convenios con empresas (descuentos) y veterinarias referidoras con comisiones.
- **Catálogo:** servicios, planes (con grupos, precio por peso, tablas de precios promocionales), productos (ánforas, relicarios) y catálogos públicos que se comparten por enlace, con carrito de solicitudes.
- **Documentos:** certificados de cremación en PDF o imagen, tarjetas de homenaje y diseños para redes sociales generados con IA a partir de la foto de la mascota. Funcionan con créditos IA por plan y se pueden comprar créditos extra. Existe también "Generar todo", que crea todos los documentos de una vez.
- **Memoriales digitales:** página conmemorativa por mascota con velas, flores, dedicatorias moderadas por la familia, melodía, línea de tiempo, video y voz. Hay planes de memorial propios (Recuerdo, Eterno, Infinito) que Vinzer vende directamente a las familias.
- **Indicadores (KPIs):** órdenes entregadas, ingresos, rankings por plan, servicio, producto y ciudad, y embudos de conversión del catálogo y del formulario.
- **Widget embebible (PRO y ULTRA):** muestra el catálogo y el seguimiento en el sitio web del crematorio.

## Roles y planes

- **Roles:** RBAC con roles como admin, recepción, operador de cremación, contabilidad, marketing, auditor y conductor, con permisos por módulo y acción.
- **Planes SaaS:** FREE, Track ($29.900), NORMAL ($39.900), PRO ($59.990) y ULTRA ($119.000) mensuales, con descuento anual. Definen los límites de órdenes, usuarios y servicios, los módulos y funciones disponibles, los créditos IA y la marca blanca. En el plan FREE se muestra la marca Vinzer.
- **Registro:** un crematorio puede crear su propia cuenta FREE.

## Panel SuperAdmin (Vinzer)

Gestiona los crematorios, los planes y precios, las plantillas de diseño, los proveedores de IA, los créditos, los memoriales y las métricas del negocio (MRR, clientes en riesgo, oportunidades de upgrade). También incluye el "Diagnóstico 360°" para evaluar a crematorios prospectos y una versión pública de autodiagnóstico en vinzer.cl/diagnostico.

## Stack técnico

- **Backend:** FastAPI (Python 3.12), PostgreSQL con RLS, Redis y Alembic.
- **Frontend:** Next.js con TypeScript, Tailwind v4 y React Query.
- **Servicios externos:** archivos en Cloudflare R2, correo SMTP de Hostinger y pagos con Polar.sh.
- **Despliegue:** Docker Compose en un VPS.
- **Subdominios:** `app.` (crematorios), `admin.` (SuperAdmin), `track.` (seguimiento), `memorial.` (memoriales) y la raíz (sitio de marketing).

---

Para el detalle técnico completo, ver `CLAUDE.md` en la raíz del repositorio.
