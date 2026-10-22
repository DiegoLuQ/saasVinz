# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SaaSCrematorio V2** is a multi-tenant SaaS platform for crematory and funeral home management. It supports subdomain-based routing per tenant, RBAC, audit logging, pet memorials, partner/veterinary portals, and payment processing via Polar.sh.

`MEJORAS_SISTEMA.md` (repo root) holds the prioritized improvement plan with implementation status. Largest pending item: S-09 (apply migrations 014/018/020 in production — 020 is required before deploying the refresh-token backend).

## Development Commands

### Backend (FastAPI + Python 3.12)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js + TypeScript)
```bash
cd frontend-saas
npm install
npm run dev       # http://localhost:3000
npm run build
npm run lint
npm run typecheck # tsc --noEmit — must stay clean
```

### Full Stack (Docker Compose)
```bash
docker-compose up -d
```
Services (VPS deployment): backend (1 instance), frontend, pgAdmin, Redis (rate limiting), **postgres** (own container, `vinzer_postgres`, with a persistent named volume — defined in this compose file). The reverse proxy is **jwilder/nginx-proxy + acme-companion already running on the VPS** (integration via `VIRTUAL_HOST`/`LETSENCRYPT_HOST` env vars on the shared external network) — the compose file does not start its own proxy, but it does start and own its PostgreSQL. Postgres sits on an internal-only bridge network (`db_internal`), not the external reverse-proxy network — only `backend` and `pgadmin` can reach it. The backend still self-provisions (role + migrations) against it on boot via `entrypoint.sh`/`provision_db.sh`, exactly as before.

> **AI generation timeouts**: generating an illustration can take >60 s. Next's rewrite proxy is raised to 180 s (`experimental.proxyTimeout` in `next.config.ts`; default 30 s returns a 500 while the backend still finishes and consumes the attempt). In production nginx-proxy also needs `proxy_read_timeout 180s; proxy_send_timeout 180s;` (e.g. in `/etc/nginx/vhost.d/default`, then restart the proxy container), otherwise it cuts at 60 s.

> **Warning**: `app/core/client_ip.py` extracts the real client IP from `X-Forwarded-For` assuming the current proxy's behavior. If the reverse proxy ever changes (e.g. to Traefik/Caddy), re-validate that function — the 5/min login rate limit depends on it.

### Database Setup
```bash
cd backend
python scripts/database/setup_initial_db.py
python scripts/database/seed_plans.py   # Bootstrap only — see warning in "Subscription Plans" section
```
> **Important**: `seed_plans.py` does NOT match production plans. It defines 4 plans (FREE/NORMAL/PRO/ULTRA) with stale prices/limits and omits the Track plan. The DB is the source of truth. The script now **aborts automatically if plans already exist** — it is only for bootstrapping an empty DB.

## Architecture

### Multi-Tenant Isolation
Tenant isolation is enforced at the **PostgreSQL level** via Row-Level Security (RLS). Before every query, `app.current_tenant_id` is set as a session variable; RLS policies use this to filter rows automatically. Admin operations bypass via `app.bypass_rls = 'true'`. See `backend/app/database.py` and `backend/app/core/tenant_context.py`.

### Subscription Plans & Module Tiers
**The database is the authoritative source for plans, not the seed scripts.** `backend/scripts/database/seed_plans.py` is the initial bootstrap but has drifted from current production values (notably prices, limits, and the Track plan which seed does not define). Always query `SubscriptionPlan` directly when reasoning about caps.

Five plans in production (verified against DB):

| Plan   | Mensual (CLP) | Anual (CLP) | pets/orders/customers | users | partners | Certificates | Config | Operaciones | Export |
|--------|---------------|-------------|----------------------|-------|----------|--------------|--------|-------------|--------|
| FREE   | $0            | $0          | 10 / 10 / 10         | 2     | 0        | ❌           | ❌     | ❌          | ❌     |
| Track  | $29.900       | $269.100    | 35 / 35 / 35         | 2     | 0        | ❌           | ❌     | ✅          | ❌     |
| NORMAL | $39.900       | $359.100    | 40 / 40 / 40         | 3     | 15       | ✅           | ✅     | ✅          | ❌     |
| PRO    | $59.990       | $539.910    | 60 / 60 / 60         | 4     | 30       | ✅           | ✅     | ✅          | ✅     |
| ULTRA  | $119.000      | $1.071.000  | 200 / 250 / 100      | 5     | 100      | ✅           | ✅     | ✅          | ✅     |

**Annual discount** (one % for all paid plans, today 25 %): set by the SuperAdmin in Configuración de Planes → "Descuento por pago anual" (`sys_saas_config.annual_discount_pct` + `annual_discount_launch` = show it as "precio de lanzamiento para los primeros crematorios"; API `/api/internal/creator/pricing/annual-discount`, logic in `app/services/plan_pricing.py`, migrations `b7d9f1a3c562`/`c9e1a3b5d674`). Saving it (or a plan's monthly price) recomputes `annual_price` = monthly × 12 × (1 − %), which is what billing/Polar charge and what the tenant billing page (`components/tenant/billing/PlanComparison.tsx`), landing and public plans show. **What a tenant pays is frozen** in `sys_tenants.contracted_price` (amount per cycle, set when its plan change is approved or Polar syncs; backfilled from its current MRR), so changing the discount or prices never changes existing customers. Tenant UI reads `GET /api/internal/billing/pricing`.

**Track** is an operations-focused tier between FREE and NORMAL: includes the `operaciones` and `pagos` modules but **no `certificados` or `configuracion`** — intended for crematories with external CRM/billing.

Hard caps on `max_pets/orders/customers/users/partners` are enforced via `app/api/deps_limits.py`. Module access per plan is checked via `allowed_modules` (JSON column). The `veterinarios` module is allocated in the data model but the B2B portal is incomplete (see "Próximamente" below).

To change plans: edit directly via admin endpoints or a migration script that updates the `SubscriptionPlan` rows. Do not assume `seed_plans.py` reflects reality.

### Domain Model: Workflow & Public Tracking
Each `CremationOC` carries two identifiers:
- `verification_code` (10-char alphanumeric, unique) — printed/displayed for human verification.
- `tracking_token` (secure token in `CremationDetails`) — used in the public tracking URL.

Public tracking endpoint: `GET /api/public/tracking/{tenant_slug}/{pet_name}/{tracking_token}` returns the full timeline (each `WorkflowStep` + `OrderEvidence`) without authentication. The family follows the service in real time via this link.

`WorkflowStep` is **tenant-configurable** — each crematory defines its own sequence of phases. Advancing a step typically requires `OrderEvidence` (photo + notes + operator signature). The frontend's `OperationDetailModal` is the operator's primary UI for this flow.

### Embeddable Widget (public API keys)
Tenants on **PRO/ULTRA** plans (`WIDGET_ALLOWED_PLANS` in `app/api/internal/integrations/services.py`) can embed a catalog/tracking widget on their own websites:
- Public API keys `pk_vinzer_live_*` per tenant (table `sys_tenant_api_keys`, migration 018). Keys are public by design — security relies on the `allowed_domains` whitelist validated against the `Origin` header, plus instant revocation via `is_active`.
- Public endpoints: `/api/public/widget/{catalog,products-services,tracking/*}` — rate-limited 60/min per API key (30/min for tracking) with ETag caching (`max-age=300`).
- Embeddable script is versioned: `frontend-saas/public/widget/v1.js` (+ `demo.html`). Treat its JSON contract as stable — third-party sites depend on it.

### RBAC: Roles & Permissions
8 roles defined: `admin`, `recepcion`, `operador_cremacion`, `contabilidad`, `marketing`, `auditor`, `operator`, `driver`. Plus `creator` (SuperAdmin, bypasses tenant scope).

Permissions are granular: `{module_key, action}` where action ∈ `{view, create, edit, delete}`. Enforced via `check_permission()` in `app/api/deps.py`. Frontend mirrors this via `usePermissions()` context and the `useFeatures()` hook for feature-flag gating.

Plan features (admin → Planes → "Configurar Características", `SubscriptionPlan.features`) sit inside modules. A missing flag = allowed (same as the Sidebar). Enforcement status:
- URL: `ModuleRouteGuard` + `featureForPath()` in `lib/tenant/moduleRoutes.ts` show "no incluida en tu plan" for the 11 gated sections (categorías, proveedores, repositorio, diseños/redes, emitir certificado, panel de trabajo, historial y cobros, veterinarios, comisiones, roles y módulos).
- API (`check_feature(key, default=True)` from `app/api/deps_features.py`): category/provider writes, RBAC tenant-config/toggle-module + `/auth/users/{id}/permissions`, commissions list (`comisiones:ver`) and pay/unpay (`comisiones:liquidar`), repository deletes; plus the older `certificados:generar_pdf`, `certificados:diseno`, `mascotas:memorial`. Shared reads (categories/providers list, `/ops-records/`, cremation lists, `/ops/board`, partner options) are intentionally NOT gated because other screens use them.
- CRUD flags (`clientes|mascotas:crear/editar/eliminar`, `servicios:crear/editar`, `ordenes:crear/editar/eliminar`): enforced inside `check_permission()` via `PLAN_ACTION_FEATURES` (rbac/router.py) **before** per-user overrides, so the plan is always the ceiling; mirrored in the frontend `PermissionContext` (`canCreate/canEdit/canDelete`). Product create/edit/delete use `check_feature` directly. The registro "Procesar" endpoints (`/submissions/{id}/create-customer|create-pet|create-services`) now require clientes/mascotas/ordenes create (they had no permission check at all).
- Also: `dashboard:metricas` hides the dashboard KPIs + monthly chart (frontend only, it's the tenant's own data); `operaciones:seguimiento:crear` gates the `/dashboard/operaciones/crear-seguimiento` route (its API is order creation = `ordenes:crear`); `configuracion:usuarios` gates editing / activating users (`PATCH /auth/users/{id}` and `/toggle`; the list stays readable).
- Modal registry modules must be existing `allowed_modules` keys (a feature whose module is off is forced off), so new sections live under existing modules: Documentos (`certificados:generar_pdf`, `repositorio`, `diseno` = Tarjetas de Homenaje, `redes` = Diseños para Redes IA, `generar_todo`), Configuración (`roles`, `usuarios`, `formulario`, `flujo`, `creditos_ia`, and Integraciones `integraciones:widget|formulario_incrustable|video_bienvenida`). Enforcement: `redes` → AI session/text/image/both, save illustration, save design (reads + digital-card upload stay open) + route/menu; `generar_todo` → `PUT /auto-documents`, `POST /auto-documents/runs`, registro panel, config tab (GET stays open); `formulario` → form-config/weight-pricing/form-video writes; `flujo` → workflow steps POST/PUT; `creditos_ia` → credit purchase/cancel; config tabs hidden via `TAB_FEATURES` in configuracion/page.tsx. Integrations read the flag through `app/services/plan_features.py` (`plan_has`/`tenant_has`), falling back to the old plan-name rule (widget/video PRO+ULTRA, embed ULTRA) when unset; migration `d1f3b5c7e896` stores those values explicitly.
- Removed from the modal because no such function exists: `pagos:registrar`, `veterinarios:solicitudes`, `configuracion:avanzada`, `operaciones:seguimiento:qr_publico` (family tracking is core to every plan). Their old keys may remain in `SubscriptionPlan.features` and are ignored. Every flag in `FEATURES_REGISTRY` (ManageFeaturesModal.tsx) is now enforced; add the enforcement whenever a new one is added.

### Subdomain Routing (Frontend)
`frontend-saas/src/middleware.ts` routes based on hostname:
- `admin.*` → `/admin` (SuperAdmin dashboard; guarded by `saasc_token` cookie)
- `app.*` → `/tenant` (tenant operations; the tenant is identified by JWT, not by a slug subdomain)
- `veterinary.*` → `/veterinary` (partner portal; guarded by `vet_token` cookie)
- `memorial.*` or the dedicated domain (`NEXT_PUBLIC_MEMORIAL_DOMAIN`, e.g. pawmemory.pet) → `/public`
- `track.*` → `/track` at the root (public search-by-code page); other paths → `/public`
- root / `www.` → `/vinzer` (marketing site)
- any other subdomain → redirect to root

For local dev, use `lvh.me:3000` (resolves to 127.0.0.1) with subdomains like `admin.lvh.me:3000`.

### Backend Module Structure
Each feature module under `backend/app/api/internal/` follows this pattern:
```
module/
  router.py    # FastAPI @router endpoints
  models.py    # SQLAlchemy ORM models
  schemas.py   # Pydantic request/response validation
  services.py  # Business logic
```
Modules: `admin`, `auth`, `catalog`, `crm`, `operations`, `creator`, `memorials`, `payments`, `partners`, `veterinary`, `common`, `integrations`.

Note: `integrations` holds the models/schemas/services for the public widget API keys; its routers live in `creator/widgets/` (SuperAdmin management) and `api/public/widget/` (public consumption).

### Authentication
- Access token: JWT (HS256), **60 min**, emitido en cookie **httpOnly** `saasc_token` por el backend en el login (viaja por el proxy same-origin de Next). El header `Authorization: Bearer <token>` sigue soportado y tiene precedencia (scripts/tests).
- Refresh token: opaco, rotatorio, **7 días**, cookie httpOnly `saasc_refresh` (path `/api/internal/auth`), hasheado SHA-256 en la tabla `sys_refresh_tokens` (migración 020). Reuso de un token ya rotado revoca todos los del usuario.
- Endpoints: `POST /api/internal/auth/login` (OAuth2PasswordRequestForm; setea cookies), `POST .../refresh` (rota; el frontend lo llama ante un 401 con single-flight en `lib/auth/token.ts`), `POST .../logout` (revoca + limpia cookies).
- `saasc_session` es un marcador NO-httpOnly (sin token) para que el cliente sepa "hay sesión" (`hasSession()`); el JWT no es legible por JavaScript.
- Protected endpoints usan `get_current_user()` de `backend/app/auth.py` (token desde header o cookie vía `get_token_from_request`).
- Portal veterinario: `vet_token` (cookie/localStorage legible, flujo antiguo) — pendiente de migrar al mismo patrón.

### Frontend API Layer
- Axios instance with auth headers: `frontend-saas/src/lib/api/`
- React Query (TanStack v5) for all server state, configured in `lib/queryClient.ts`
- Translations (Spanish-first) centralized in `lib/translations.ts`

### Frontend Stack Notes
- **Tailwind CSS v4** — no `tailwind.config.js`. Theme tokens live in `@theme inline { ... }` inside `src/app/globals.css` and per-route-group `globals.css` (e.g. tenant has dynamic theme variables in `(tenant)/tenant/globals.css`). Custom utilities (e.g. `.no-scrollbar`) are defined inside `@layer base`.
- **Route groups** in `src/app/`: `(admin)` SuperAdmin panel, `(tenant)` operator dashboard, `(veterinary)` partner portal, `(public)` landings + memorials + form tokens + Vinzer marketing site at `/vinzer`.
- **Subdomain dev**: use `lvh.me:3000` (or `admin.lvh.me`, `app.lvh.me`, `vet.lvh.me`); middleware rewrites by host.

## Environment Variables

### Backend (`backend/.env`)
Key vars: `SECRET_KEY`, `SQLALCHEMY_DATABASE_URL`, `DB_ADMIN_USER/PASS`, `R2_*` (Cloudflare R2), `POLAR_*` (payments), `MAIL_*` (Gmail SMTP), `RECAPTCHA_SECRET_KEY`, `REDIS_URL`, `CORS_ORIGINS` (optional, comma-separated; falls back to the defaults in `app/core/config.py` when unset). `ONBOARDING_API_KEY` (optional: shared key for `POST /api/internal/onboarding/free`, sent as `X-Onboarding-Key`; unset = endpoint disabled). `AI_TEXT_MONTHLY_QUOTA`/`AI_IMAGE_MONTHLY_QUOTA` (AI quota per tenant, default 200/30). AI keys/models are NOT env vars: they live only in Configuración Global → Plataformas IA.

### Frontend (`frontend-saas/.env`)
Key vars: `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDFLARE_R2`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.

### Root (`.env`)
Database credentials and domain mappings consumed by Docker Compose.

## Key Conventions

### API Responses
- Schemas follow naming: `CustomerCreate`, `CustomerUpdate`, `CustomerInDB`
- 401: `"Sesión expirada o token inválido"`
- Rate limits (SlowAPI, Redis storage via `REDIS_URL`): 5/min on login, 100/min general; public tracking `/resolve` 10/min, tracking detail 30/min; widget 60/min per API key
- Errors logged to `backend/error_debug.log` (rotating, 10 MB × 3)

### Frontend Route Groups
App Router layout groups: `(admin)`, `(public)`, `(tenant)`, `(veterinary)` — these are in `frontend-saas/src/app/`.

### Public Registration Form (per-tenant config)
- Each tenant chooses which optional fields of the family form (`/public/[slug]/form`) are shown/required: `sys_tenants.form_config` (migration `d9a2c4e6f813`). Field catalog + defaults (= previous behavior) live in `backend/app/services/public_form_config.py`, mirrored in `frontend-saas/src/lib/publicFormConfig.ts`. Fixed fields: owner name/phone, pet name/species. `submit-form` enforces required fields server-side.
- Weight tiers (`srv_weight_pricing`, max 20) have a tenant-written "desde – hasta" range (e.g. 0–4, 4,1–7); a tier can't start before the previous one ends, and only the last may be open (`max_weight` NULL). The surcharge picks the first tier (by max) whose max covers the weight. Saved as a whole via `PUT /api/internal/maintenance/weight-pricing`. Same tiers drive the internal weight surcharge, the public form size picker and the plans catalog; prices go public only if `form_config.show_weight_prices`. On submit the backend writes the chosen tier text into `pet_data.size`. It also snapshots the tier price into `pet_data.weightTier.price`; the submission detail (`/dashboard/registros/{id}`) shows it as a "Recargo por peso" line and adds it to the total via `submission_weight_charge()` (older submissions without the snapshot use the current tier price). Creating the order from the submission stores that amount as `CremationFinancial.weight_price` and adds it to `total_price`. Order weight surcharge rule: with `weight` (kg) it is derived from the current tiers; without kg the saved `weight_price` is kept (backend expediente and `useOrderForm`), and the crematorium can edit or remove it in the order.
- Custom forms can rename fields: `custom_forms[].fields[key].label` (≤ 40 chars, `MAX_FIELD_LABEL`; empty = default name), edited in the form editor below each visible field. Shown via `fieldLabel()` (`lib/publicFormConfig.ts`) in the form steps, summary and WhatsApp message; used in the backend "Faltan campos obligatorios" error; snapshotted on submit as `owner_data.formLabels` so the registro detail shows the same names.
- Custom forms (`custom_forms`, `?form=<id>`) can fix a service/plan (`associated_service_id`, auto-selected). If the form hides the Camino phase, the fixed service is shown read-only: "Incluye: X · $precio" under the form name in the header, and a "Servicio incluido" card + "Total estimado" (with weight surcharge) in the summary (`SummaryStep.tsx`); prices only when `show_service_prices`.
- Settings UI: Configuración → "Formulario y Pesos" (`components/tenant/settings/PublicFormTab.tsx`), split into 4 sections: Pasos y datos (phases Familia/Ángel/Camino/Recuerdos + their fields), Pesos y precios (weight tiers, price visibility, special services), Bienvenida y avisos (welcome modal, delivery notice), Enlaces (main link + custom forms, which save on their own). One sticky "Guardar cambios" bar saves the rest.
- Welcome message (`welcome_modal`): general + optional per custom form (empty per-form fields inherit the general ones via `mergeWelcomeModal`). Optional **"Ver video" button** (PRO/ULTRA only, `app/services/form_video.py`): video ≤ 30 s, either uploaded (validated + re-encoded to MP4 720p with the bundled `imageio_ffmpeg`, stored in R2 `tenant_{id}/form-video/`, uploaded only when the config is saved via `POST /api/internal/maintenance/form-video`) or a Vimeo / Cloudflare Stream link (duration read from Vimeo oEmbed / the public HLS manifest via `POST .../form-video/link`; only the canonical player URL is stored). `PUT form-config` re-validates new videos and deletes uploaded ones no longer referenced; the public tenant endpoint strips videos for other plans. Per form: inherit / show (own video or the general one) / hide. `welcome_modal.video_position` chooses where the button appears: `start` (default, inside the welcome message) or `end` (success screen after submitting, works even with the welcome message disabled); per form `null` = inherit. UI: `components/tenant/settings/WelcomeVideoField.tsx`, player `components/public/FormVideoPlayer.tsx` inside `CondolenceModal`. Production nginx must allow ~80 MB bodies (`client_max_body_size`) for the upload, and Next's proxy too: `experimental.proxyClientMaxBodySize: '90mb'` in `next.config.ts` (Next 16 silently truncates proxied bodies at 10 MB, so a >10 MB video arrived cut and was rejected as invalid).

### Image Templates for Social Media (Instagram) + AI
- Global templates in `sys_image_templates` (JSON `definition`: background color/image + layers `text`/`photo`/`sticker`, positions in % of the canvas). Rendered with Konva by `components/admin/imageTemplates/TemplateCanvasImpl.tsx` — the same renderer is used by the admin editor (`editable`), the thumbnails, and the tenant page.
- SuperAdmin: Plantillas y Diseños → Diseños Gráficos (Canvas) → visual editor `/dashboard/plantillas-imagen/editor?id=`. A template with `usage_count > 0` is locked: duplicate it to edit. The list shows per-template usage from `GET /api/internal/creator/image-templates/stats/usage` (tenants using it with designs / illustrations / AI generations / last use, and the latest 5 created; detail in `TemplateUsageModal`). «Eliminar lo creado con esta plantilla» (`PurgeTemplateExportsModal`, type ELIMINAR to confirm) deletes, across all tenants, its `sys_template_exports` (designs + AI illustrations) and their R2 files (`app/services/template_exports_purge.py`: DB first, then files not referenced elsewhere via `_still_referenced`; AI generations kept without image); `GET/DELETE /creator/image-templates/{id}/exports[/preview]`, `unlock=true` resets `usage_count` so the template becomes editable. The card/enlarged preview shows the latest real creation instead of sample data: `latest_design` from the usage stats (recipe + current pet/owner/tenant bindings, redrawn with `recipeRender` in `lib/admin/imageTemplates/recipe.ts`, shared with the tenant's `RecipeDesign`), or, without designs, the template with the latest AI illustration. Each template can have an example image (`thumbnail_url`, set with `PUT /creator/image-templates/{id}/example`, allowed even when locked) that tenants see instead of the sample-data preview in Diseños para Redes and Documentos automáticos. New backgrounds/stickers stay local (`blob:`) while editing and are uploaded **only on save**, processed by `MediaService` mode `template` (WebP, ≤2160 px, q85, ≤900 KB, alpha kept). Admin "Probar" illustrations are returned as WebP data URLs and never stored.
- `sys_image_templates.tenant_id` (migration `c5e7a9b2d146`): NULL = global, set = exclusive to that tenant (tenant endpoints filter `tenant_id IS NULL OR = current`). Photo layers have `source`: `pet` (real photo, `slot` photo_1/2/3) or `ai` (illustration generated from the pet photo in `ai_from`, default photo_1; until generated the tenant canvas shows that photo). Backgrounds, stickers and sample pet photos are picked in the editor through `components/admin/imageTemplates/LibraryPickerModal.tsx` (Biblioteca de Medios, `GET /api/internal/media` with `q` search) to avoid re-uploading; sample photos are preview-only and the AI test accepts `photo_url` of a library image. The `ai_text` text layer previews a lorem ipsum of `ai_text_max_chars` in the editor (editable, not saved).
- Data elements (Capas → Datos): text layers bound to pet / owner / tenant / social-media fields (`DATA_FIELD_GROUPS` in `lib/admin/imageTemplates/constants.ts`) plus a `tenant_logo` image element (sticker with `binding`). Real values come from `GET /api/internal/image-templates/render-data?pet_id=` → `template_bindings()` in `image_template_ai.py` (same keys; social handles normalized to @user).
- AI prompts are stored per template (`ai_text_prompt`, `ai_image_prompt`, `ai_text_max_chars` ≤ 500; migration `f8a2c4e6b913`) with `{nombre}`, `{especie}`… variables (`backend/app/services/image_template_ai.py`, mirrored in `lib/admin/imageTemplates/constants.ts`). The tenant can tweak the resolved prompt before generating; the saved prompt doesn't change.
- AI platforms: Configuración Global → "Plataformas IA" (`sys_ai_providers`, migration `b2d4f6a8c135`; API `/api/internal/creator/ai-providers`). Gemini, Claude, ChatGPT, OpenRouter, DeepSeek with name/model/API key (Fernet-encrypted with a key derived from `SECRET_KEY` in `app/utils/secrets_box.py` — rotating `SECRET_KEY` requires re-entering the keys). Several connections can be flagged for text and/or image (image = Gemini, or an OpenRouter image model that accepts `input_references`, via `POST /api/v1/images`); `priority` (1 = principal, migration `e1a3c5d7f692`) orders them into a **fallback chain**: `resolve_all` + `with_fallback` in `app/services/ai_providers.py` try the next connection when one fails (busy, no balance, bad key) after the transient retries in `ai_errors.post_json`; errors raised with `AiError(fallback=False)` (content blocked) stop the chain. The generation log records the model/cost of the connection that actually answered. Resolution is DB-only (no `.env` fallback): with no saved, active, flagged connection that AI function is disabled. "Probar conexión" tests the typed key and does not save.
- Tenant: Documentos → Diseños para Redes (`/dashboard/documentos/redes`, API `/api/internal/image-templates`). Text and illustration use the platforms flagged in "Plataformas IA" (text limit enforced server-side; illustration is made from the pet's real photo). Each generated illustration opens a confirm modal: "Guardar y usar" saves it via `POST /api/internal/image-templates/{id}/save` (kind `illustration`, linked to `sys_ai_generations.media_url`) to `tenant_{id}/ia/` (MediaService category `ia`, mode `template` = optimized WebP); "Descartar" drops it. The AI illustration is the **only image stored** per design: the final design (template + logos + texts) is NOT uploaded — downloading/exporting saves its recipe (`POST /api/internal/image-templates/{id}/designs`, JSON in `sys_template_exports.meta`, `media_url` NULL, migration `a5c7e9b1d348`: ratio, texts, date, stored photo URLs incl. the illustration) and it is re-drawn on demand with the template + current pet data (`components/tenant/redes/RecipeDesign.tsx`: `RecipeDesignView`, `useDesignDownload` → PNG 1080 px). Older designs saved as files still display as images. «Ajustar elementos» (toggle under the canvas, `components/tenant/redes/LayerAdjustPanel.tsx`) lets the tenant hide / move / resize template layers for that design only: stored as `recipe.overrides` ({layer_id: {hidden,x,y,width,height,rotation}}, `lib/admin/imageTemplates/overrides.ts` `applyOverrides`, applied when re-drawing recipes); the template itself never changes. Records live in `sys_template_exports` (migration `b5d7f9a1c236`, RLS; `kind` design|illustration since `c7e9a1b3d458` — saved AI illustrations are recorded too), listed in the page's "Mis diseños generados" tab (`GET/DELETE /api/internal/image-templates/exports`; delete removes the file too, admin only). Items made without a pet (`pet_id` NULL) don't show in any order: «Asignar a mascota» (`AssignPetModal`, `PATCH /exports/{id}` `{pet_id}`, needs `mascotas:edit`) links them to a pet (title suffix updated) so they appear in its orders' «Imágenes generadas». Each generation records `cost_usd` (real cost from OpenRouter when reported, else `sys_ai_providers.cost_per_use_usd`; migration `d7f9b1c3e258`). Exports PNG at 1080 px wide.
- AI credits (`app/services/ai_credits.py`, migration `e9b1d3f5a370`): 1 credit = 1 design (template + pet) with `sys_saas_config.ai_attempts_per_credit` attempts (3), valid `ai_session_days` (7). Each generate call = 1 attempt (`/ai/both` = text + image in one call); the attempt is reserved before calling the AI and released if it fails. Plans grant `sys_subscription_plans.ai_monthly_credits` monthly (NORMAL 3, PRO 7, ULTRA 10; not cumulative); gifts/purchases go to the non-expiring extra bucket; monthly is spent first. Tables `sys_ai_credit_balances` / `sys_ai_credit_ledger` / `sys_ai_design_sessions` (RLS), row locks prevent double spending. Each generation stores `duration_ms` (shown as avg/median/max per model in the Créditos IA report, as "suele tardar ~N s" to the tenant, and in the editor tests) plus `output_text` / `pending_image` so a result whose response never reached the browser can be recovered with `GET /{id}/ai/recover` without spending another attempt (`pending_image` is cleared on save/discard or when the design expires; migration `a3c5e7b9d014`). Credit errors are 409 with `detail.code` `no_ai_credits` / `credit_required` (402 would trigger the frontend plan-limit modal). Extra-credit price is per plan: `sys_subscription_plans.ai_extra_credit_price_usd` (FREE/Track 0.99, NORMAL 0.89, PRO 0.75, ULTRA 0.59; NULL = the global reference `ai_credit_price_usd`, which also values credits in the report); the highest active plan price is shown struck through to discounted plans (`credit_prices()` in `ai_credits.py`). Prices are always shown in CLP and USD: CLP = USD × fixed `sys_saas_config.usd_clp_rate` (SuperAdmin-edited, required, default 950, rounded up to the nearest 10; migration `a7c9e1b3d562`, replaced the old fixed `ai_credit_price_clp`); each purchase snapshots unit price, CLP total and rate. Tenant store offers packs 1/5/10 + custom quantity. The "Regalar / Asignar Créditos" button is also in the tenant detail header (`components/admin/aiCredits/GrantCreditsModal.tsx`, shared with Créditos IA → Saldos; a reason note is required). SuperAdmin panel: Comercial → "Créditos IA" (`/dashboard/creditos-ia`, API `/api/internal/creator/ai-credits`): monthly report (real AI cost vs. credits value × current price, margin, cost per model), balances with gift/purchase/adjust (extra bucket), ledger, and settings (price, attempts, validity days, credits per plan). Credit purchases (migration `f1c3e5a7b482`): Vinzer's bank data / other payment instructions live in `sys_saas_config` (admin Configuración Global → "Datos de pago"); the tenant requests a purchase in Configuración → "Compra de créditos" (`?tab=creditos`, API `/api/internal/ai-credits`, owner/admin only) → `sys_ai_credit_purchases` (pending); the SuperAdmin approves/rejects in Créditos IA → Solicitudes (approve adds to the extra bucket as `purchase` and notifies the tenant).

### Registro detail: Procesar + Generar todo
- `/dashboard/registros/{id}`: one "Procesar registro" button creates whatever is missing of customer → pet → order (each step reuses existing records; plan limits checked up front). It no longer redirects; a "Ver orden" button appears.
- "Documentos" panel (`components/tenant/registros/GenerateAllPanel.tsx`): "Generar todo" processes the registro and then creates the documents configured in Configuración → "Documentos automáticos" (`sys_tenants.auto_documents`, migration `d9f1b3c5e570`, API `/api/internal/auto-documents`): certificate (server-side `/ops-records/generate`, saved to Repositorio), digital farewell card and social image (rendered off-screen in the browser by `OffscreenRenderers.tsx`, saved to `tenant_{id}/ia/` and listed in "Mis diseños generados" — the card via `POST /image-templates/exports/upload` kind `digital`). The social image uses an AI credit when its template has AI layers; the confirm modal states credits left and remaining attempts. Farewell config building is shared in `lib/tenant/farewellCard.ts`.
- The panel sits below "Carta de despedida" and shows per-document thumbnails (`DocumentPreviews.tsx`: what was already generated for that pet/order, else a sample of the configured template; eye button = large view). Exports can be filtered by `pet_id` (`GET /api/internal/image-templates/exports?pet_id=`).
- Running "Generar todo" opens a progress modal (per-step status and time, weighted progress bar with ETA from the real AI averages, `beforeunload` guard, final summary). Each run is recorded via `POST /api/internal/auto-documents/runs` in `sys_document_runs` (migration `f3b5d7a9c814`, RLS): per-step ms and total; credit used and real AI cost are computed server-side from the AI session. The SuperAdmin sees the summary in Créditos IA (`document_runs` in `/creator/ai-credits/report`). Pet photos load with `GET /api/internal/pets/{id}` (not the whole list).
- Certificate pet dates: image certificates take `fecha_nacimiento`/`fecha_fallecimiento` from the pet record. When the design uses them and the pet lacks them, the registro preview (badge «Falta fecha», eye modal → «Completar fecha») and the order slide-over certificate block warn; both open `CertificateTextsModal` (dates + free texts, live preview via override `{date}` in `generate_image_certificate_html`), which on issue PATCHes the pet (`birth_date`/`death_date`) and then (re)issues. With an order, the registro preview renders the certificate with the real pet data (`persist: false`).
- The order slide-over in recepcion-pedidos (`OrderSlideOver`) lists the pet's generated images (card, social design, AI illustrations) with large view and download (`expediente/GeneratedImagesSection.tsx`); certificates stay in its Certificado block.

### Deleting an order (scopes)
`DELETE /api/internal/cremations/{id}?scope=order|pet|all` (UI: `components/tenant/orders/DeleteOrderModal.tsx`, used in recepcion-pedidos list and order form; `delete-preview` returns `scopes` with availability/counts). `order` deletes only the order and its files (restores stock) and **never touches the pet's photos**. `pet` (only if the pet has no other orders; also needs `mascotas:delete`) runs `crm/pets/purge.py`: pet, its orders, memorials, web submissions, AI illustrations/designs/cards (`sys_template_exports`) and files no longer referenced; AI generations/credit sessions are kept as consumption history without images. `all` also deletes the customer (only if no other pets; needs `clientes:delete`).

### Memorials
- Memorials have a public UUID route (`/memorials/v/{cliente}/{mascota}/{uuid}`) and an optional 6-digit `access_key` PIN for private memorials.
- Dedications require explicit approval before becoming public (status: `pendiente` → `aprobado`/`rechazado`); the **family** approves them on the management page (`/memorials/m/{uuid}/gestion`, `access-key` = memorial PIN), not the tenant.
- Memorial design (altar theme, particles, fonts) is stored as JSON per memorial and can be edited from the tenant's memorial setup modal.
- Landing `memorial.vinzer.cl` (`app/(public)/public/page.tsx` + `MemorialLandingClient.tsx`, content in `lib/memorialLanding.ts`) sells 3 USD plans — Mensual 10 / Anual 70 / Eterno 110 — via WhatsApp (assisted sale, no Polar checkout). The SuperAdmin assigns them per memorial (`rec_plans` name_db `mensual|anual|eterno`, migration `e3b5d7f9a124`); their photo/dedication limits come from `rec_plans.features`, and assigning `eterno` clears `valid_until`. The family management page (`/memorials/m/{uuid}/gestion`) shows the same USD plans via `components/memorial/MemorialPlanUpgrade.tsx` (current plan, validity, usage, and only real upgrades, sold through WhatsApp). The old CLP/Polar `TributePlans` remains only in `components/public/PricingSection.tsx`.

### Tenant Help Center
`/dashboard/ayuda` content lives in `frontend-saas/src/lib/tenant/helpContent.ts` (guides + FAQs; the support WhatsApp/email come from admin Configuración Global → Datos del SaaS via `usePlatformInfo()` / `GET /api/public/platform-info`). Each item is hidden when the user can't open its `href`/`checkPath` (role module via `moduleForPath` + plan feature via `featureForPath`, plus optional `feature`). When a feature's behavior changes, update its help text there.

### Known Incomplete Areas ("Próximamente")
- **Veterinary B2B portal**: The data model (Veterinary, PartnerLink, commission %) and notifications exist, but the full self-service portal (clinics submitting cremations, viewing referrals, commission payouts) is incomplete. Landing page (`/vinzer`) explicitly tags these features with "Próximamente".
- **Commission liquidation**: Calculated but no payout endpoint.
- Type checking runs with `npm run typecheck` (`tsc --noEmit`). As of 2026-07-02 it passes clean — keep it that way.

## Infrastructure

- **Storage**: Cloudflare R2 (S3-compatible), client in `backend/app/utils/r2.py`
- **Media uploader**: `get_current_user` stores the user id in `db.info["current_user_id"]`; `MediaService.upload_media` saves it as `web_media_library.created_by` (migration `b9d1f3a5c784`; older files = NULL). Shown, with date/size/dimensions, in the SuperAdmin Biblioteca «i» panel (`components/admin/media/MediaInfoModal.tsx`); the public media list never exposes it.
- **Payments**: Polar.sh — set `POLAR_SERVER=sandbox` or `production`
- **Email**: Gmail SMTP via fastapi-mail (`backend/app/services/email.py`)
- **Certificates**: PDF generation in `backend/app/utils/certificates.py` (~34KB, complex)
- **Audit**: All API requests logged via `backend/app/middleware/audit_middleware.py` to `AuditLog` table
- **Backups**: automatic backups run from a background task (`backend/app/services/backup_scheduler.py`): startup asyncio loop, 5-min check interval, `pg_try_advisory_lock` for exclusion across replicas. They no longer depend on HTTP traffic.
- **API docs**: `/docs`, `/redoc` and `/openapi.json` are disabled when `ENVIRONMENT=production`
- **Form Tokens**: Public registration forms use temporary tokens (`form_tokens`) with a 6-digit PIN and a few-day TTL. Generated from the tenant's Navbar "share" action.
