# Análisis estratégico de planes (Vinzer)

> Fecha: 2026-11-02. Datos leídos de la **base local de desarrollo** (`v3_saas`, tabla `sys_subscription_plans` + `sys_saas_config`).
> ⚠️ La base local **no coincide** con la tabla de CLAUDE.md (que dice estar verificada contra producción): FREE 5 vs 10 órdenes, Track 25 vs 35, PRO $79.990 vs $59.990, descuento anual 45 % vs 25 %. Antes de decidir, confirmar los valores reales en producción (Admin → Configuración de Planes).

---

## 1. Foto actual

| | FREE | **Track** | NORMAL | PRO | ULTRA |
|---|---|---|---|---|---|
| Precio mensual | $0 | **$29.900** | $39.900 | $79.990 | $119.000 |
| Anual (−45 %) | $0 | $197.340 | $263.340 | $527.934 | $785.400 |
| Órdenes / mascotas / clientes al mes | 5 | **25** | 40 | 60 | 250 |
| Usuarios | 1 | 2 | 3 | 4 | 5 |
| Veterinarias (partners) | 0 | 0 | 15 | 30 | 100 |
| Servicios / planes / productos | 10 / 2 / 5 | 10 / 5 / 15 | 20 / 7 / 50 | 50 / 10 / 200 | 70 / 20 / 300 |
| Puede eliminar / exportar | ✗ / ✗ | ✗ / ✗ | ✓ / ✗ | ✓ / ✓ | ✓ / ✓ |
| Créditos IA al mes | 0 | 0 | 3 | 7 | 10 |
| Precio crédito IA extra (USD) | 0,99 | 0,99 | 0,89 | 0,75 | 0,59 |
| **Costo por orden** (precio ÷ órdenes) | — | **$1.196** | **$998** | **$1.333** | **$476** |

### Funciones que realmente diferencian (según `features`; vacío = incluido por defecto)

| Función | FREE | Track | NORMAL | PRO | ULTRA |
|---|---|---|---|---|---|
| Seguimiento en vivo, flujo operativo, formulario público | ✓ | ✓ | ✓ | ✓ | ✓ |
| Certificados PDF + repositorio | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tarjetas de homenaje (diseño) | ✗ | ✓ | ✓* | ✓ | ✓ |
| Diseños para redes con IA | ✓* | ✓* | ✓* | ✓ | ✓ |
| «Generar todo» | ✗ | ✗ | ✓* | ✓ | ✓ |
| Memorial de mascota | ✗ | ✗ | ✓* | ✓ | ✓ |
| Catálogo público de productos | ✗ | ✗ | ✓ | ✓ | ✓ |
| Roles y usuarios (configuración) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Widget / video bienvenida | ✗ | ✗ | ✗ | ✓ | ✓ |
| Formulario incrustable | ✗ | ✗ | ✗ | ✓ | ✓ |
| Sin marca Vinzer | ✗ | ✓† | ✓† | ✓† | ✓ |

\* No está configurado en el plan → **queda incluido por defecto** (regla «flag ausente = permitido»).
† Por la regla de respaldo `NAME_FALLBACK` (solo FREE muestra la marca).

---

## 2. Diagnóstico del Plan Track

**Idea original:** plan de operaciones para crematorios que ya tienen CRM/facturación externos (entre FREE y NORMAL).

**Problema: hoy Track no tiene una razón clara para existir.**

1. **Está demasiado cerca de NORMAL.** Por **$10.000 más** (+33 %), NORMAL da +15 órdenes (+60 %), +1 usuario, 15 veterinarias, roles/usuarios, catálogo, poder eliminar, 3 créditos IA al mes (≈ USD 2,7 en valor) y memorial / «Generar todo» por defecto. Cualquier cliente que compare elige NORMAL → Track funciona como **señuelo** sin quererlo.
2. **Es el plan con el costo por orden más caro** después de PRO ($1.196 vs $998 de NORMAL). Pagar menos y recibir proporcionalmente menos no se siente como «plan de entrada».
3. **Su promesa no se cumple en el producto.** Se vende como «solo operaciones», pero incluye clientes, mascotas, certificados, tarjetas de homenaje e inventario. No hay nada que un crematorio con CRM externo gane por elegirlo, salvo precio.
4. **Inconsistencias:** FREE puede descargar el PDF de productos y Track no (`inventario:productos:descargar_pdf`); Track no tiene los módulos `perfil`/`productos` que sí tienen todos los demás.
5. **`display_order` = 4, igual que ULTRA.** En vistas que ordenan por ese campo, Track aparece después de PRO. (La landing fija su propio orden, pero el panel de admin y otros listados no.)
6. **Sin clientes** en la base local (2 FREE y 2 ULTRA). Si en producción tampoco tiene, cambiarlo no tiene costo.

### Recomendación para Track (elegir una)

**A. Reposicionarlo como plan de entrada «Trazabilidad» (recomendada)**
- Precio **$19.900** (o $24.900): salto claro desde FREE y diferencia real con NORMAL (+$15.000–20.000).
- **30 órdenes**, 2 usuarios.
- Incluye lo que vende Vinzer al crematorio pequeño: seguimiento en vivo para la familia, flujo operativo con avisos, formulario público, certificado PDF.
- Sin: diseños IA, memorial, catálogo, veterinarias, convenios, roles. Eso queda como motivo para subir a NORMAL.
- Mensaje: *«Tu familia ve cada paso del servicio. Desde $19.900»*.

**B. Eliminarlo** y dejar FREE → NORMAL → PRO → ULTRA. Menos opciones = decisión más simple. Conviene si no hay clientes en Track y si NORMAL baja a ~$34.900.

**C. Mantenerlo a $29.900** solo si se le sacan funciones (diseño de tarjetas, IA) y se le suben las órdenes a ~35, para que el costo por orden quede bajo NORMAL. Es la opción más débil: sigue a $10.000 de NORMAL.

---

## 3. Análisis del resto de la escalera

```
Órdenes/mes   5 ──► 25 ──► 40 ──► 60 ──────────────► 250
Precio        $0    $29.9k  $39.9k  $79.99k           $119k
Salto         —     +29.9k  +10k    +40.1k (+100 %)   +39k (+49 %)
```

### FREE
- Bien como gancho (5 órdenes, marca Vinzer visible = publicidad gratis).
- ⚠️ **1 usuario**, pero el checklist «Configura tu crematorio» pide «un segundo usuario»: un FREE nunca lo completa. O se sube a 2 usuarios o se quita ese paso para FREE.
- Tiene «Diseños para redes con IA» por defecto (flag vacío) pero 0 créditos: verá la sección y no podrá usarla sin comprar. Puede servir para vender créditos, pero conviene que sea a propósito.

### NORMAL — el plan «correcto» hoy
- Mejor costo por orden de los planes chicos ($998) y el set de funciones más completo por precio.
- ⚠️ Sus `features` están **desactualizadas**: memorial, «Generar todo», diseños IA y tarjetas no están marcados, así que quedan **incluidos por defecto**. Hoy NORMAL ≈ PRO en funciones. Decidir explícitamente qué tiene y guardarlo en Admin → Planes.

### PRO — el eslabón más débil (con $79.990)
- Duplica el precio de NORMAL (+100 %) para solo +50 % de órdenes: **costo por orden $1.333, el más caro de todos**.
- Lo que agrega (exportar, widget, video, 4 usuarios) no justifica +$40.000 para un crematorio mediano.
- Un cliente que pasa de 40 órdenes probablemente prefiere quedarse limitado o saltar directo a ULTRA (+$39.000 por 190 órdenes más).
- **Recomendación:** volver a **$59.990** (lo que dice CLAUDE.md para producción) o subir sus órdenes a ~100. A $59.990 el costo por orden queda en $1.000, coherente con NORMAL.

### ULTRA
- 250 órdenes por $119.000 = $476/orden: muy generoso frente a PRO. Bien si se vende con contacto comercial («Contactar ventas»), pero deja un hueco grande entre 60 y 250.
- Opciones: bajar a 150 órdenes y crear «ULTRA+» a medida, o subir PRO a 100 órdenes para cubrir el medio.
- Es el único con marca blanca explícita y formulario incrustable: bien como plan premium.

### Descuento anual 45 % (base local)
- 45 % = el cliente paga ~6,6 meses por 12. Es muy agresivo: reduce el ingreso anual casi a la mitad. Tiene sentido solo como **precio de lanzamiento para los primeros crematorios** (está activado `annual_discount_launch`) y con fecha de término. Un estándar sano es 15–20 % (≈ 2 meses gratis). CLAUDE.md dice 25 % en producción: verificar.

---

## 4. Otros hallazgos a revisar

| # | Hallazgo | Impacto | Acción |
|---|---|---|---|
| 1 | `veterinarios:gestionar` y `comisiones:*` están en **✗ para todos los planes**, pero NORMAL/PRO/ULTRA prometen 15/30/100 veterinarias | Se vende un límite que nadie puede usar (o el flag no se aplica) | Decidir: activarlo en NORMAL+ o quitar el límite de la comparación |
| 2 | **Convenios** (`clientes:convenios`) no está configurado → incluido en **todos**, incluso FREE | Función B2B regalada en planes de entrada | Marcarlo solo para NORMAL+ (o PRO+) |
| 3 | Flags obsoletos guardados (`pagos:registrar`, `veterinarios:solicitudes`, `configuracion:avanzada`, `operaciones:seguimiento:qr_publico`) | Ruido, se ignoran | Limpiar al guardar cada plan |
| 4 | `display_order` repetido (Track = ULTRA = 4) | Orden incorrecto en el admin | FREE 1, Track 2, NORMAL 3, PRO 4, ULTRA 5 |
| 5 | CLAUDE.md vs base local distintos | Decisiones con datos equivocados | Confirmar producción y actualizar la tabla de CLAUDE.md |

---

## 5. Propuesta de escalera (ejemplo)

| | FREE | Track «Trazabilidad» | NORMAL | PRO | ULTRA |
|---|---|---|---|---|---|
| Precio | $0 | **$19.900** | $39.900 | **$59.990** | $119.000 |
| Órdenes | 5 | **30** | 40 → **50** | 60 → **100** | 250 |
| Usuarios | **2** | 2 | 3 | 5 | 8 |
| Costo/orden | — | $663 | $798 | $600 | $476 |
| Gancho | Prueba + marca Vinzer | Seguimiento para la familia | Gestión completa + IA | Integraciones web + volumen | Marca blanca + a medida |

Regla para que la escalera se sienta justa: **cada plan superior debe bajar (o mantener) el costo por orden** y sumar al menos una función que el cliente pueda nombrar.

---

## 6. Próximos pasos sugeridos

1. Confirmar precios, límites y descuento reales en producción.
2. Decidir el destino de Track (A, B o C).
3. Corregir el precio o el volumen de PRO.
4. Revisar en Admin → Planes → «Configurar Características» cada plan y **guardar todas las funciones explícitamente** (sobre todo NORMAL, convenios y veterinarias).
5. Ajustar `display_order` y el usuario extra de FREE.
6. Actualizar la tabla de planes de CLAUDE.md con lo decidido.
