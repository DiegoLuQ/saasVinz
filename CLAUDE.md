# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SaaSCrematorio V2** is a multi-tenant SaaS platform for crematory and funeral home management. It supports subdomain-based routing per tenant, RBAC, audit logging, pet memorials, partner/veterinary portals, and payment processing via Polar.sh.

## Development Commands

### Backend (FastAPI + Python 3.11)
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
```

### Full Stack (Docker Compose)
```bash
docker-compose up -d
```
Services: Traefik reverse proxy, PostgreSQL, 3 backend replicas, frontend, pgAdmin.

### Database Setup
```bash
cd backend
python scripts/database/setup_initial_db.py
python scripts/database/seed_plans.py   # Bootstrap only — see warning in "Subscription Plans" section
```
> **Important**: `seed_plans.py` does NOT match production plans. It defines 4 plans (FREE/NORMAL/PRO/ULTRA) with stale prices/limits and omits the Track plan. The DB is the source of truth.

## Architecture

### Multi-Tenant Isolation
Tenant isolation is enforced at the **PostgreSQL level** via Row-Level Security (RLS). Before every query, `app.current_tenant_id` is set as a session variable; RLS policies use this to filter rows automatically. Admin operations bypass via `app.bypass_rls = 'true'`. See `backend/app/database.py` and `backend/app/core/tenant_context.py`.

### Subscription Plans & Module Tiers
**The database is the authoritative source for plans, not the seed scripts.** `backend/scripts/database/seed_plans.py` is the initial bootstrap but has drifted from current production values (notably prices, limits, and the Track plan which seed does not define). Always query `SubscriptionPlan` directly when reasoning about caps.

Five plans in production (verified against DB):

| Plan   | Mensual (CLP) | Anual (CLP) | pets/orders/customers | users | partners | Certificates | Config | Operaciones | Export |
|--------|---------------|-------------|----------------------|-------|----------|--------------|--------|-------------|--------|
| FREE   | $0            | $0          | 10 / 10 / 10         | 2     | 0        | ❌           | ❌     | ❌          | ❌     |
| Track  | $29.900       | —           | 35 / 35 / 35         | 2     | 0        | ❌           | ❌     | ✅          | ❌     |
| NORMAL | $39.900       | $299.900    | 40 / 40 / 40         | 3     | 15       | ✅           | ✅     | ✅          | ❌     |
| PRO    | $59.990       | $599.900    | 60 / 60 / 60         | 4     | 30       | ✅           | ✅     | ✅          | ✅     |
| ULTRA  | $119.000      | $999.900    | 200 / 250 / 100      | 5     | 100      | ✅           | ✅     | ✅          | ✅     |

**Track** is an operations-focused tier between FREE and NORMAL: includes the `operaciones` and `pagos` modules but **no `certificados` or `configuracion`** — intended for crematories with external CRM/billing.

Hard caps on `max_pets/orders/customers/users/partners` are enforced via `app/api/deps_limits.py`. Module access per plan is checked via `allowed_modules` (JSON column). The `veterinarios` module is allocated in the data model but the B2B portal is incomplete (see "Próximamente" below).

To change plans: edit directly via admin endpoints or a migration script that updates the `SubscriptionPlan` rows. Do not assume `seed_plans.py` reflects reality.

### Domain Model: Workflow & Public Tracking
Each `CremationOC` carries two identifiers:
- `verification_code` (10-char alphanumeric, unique) — printed/displayed for human verification.
- `tracking_token` (secure token in `CremationDetails`) — used in the public tracking URL.

Public tracking endpoint: `GET /api/public/tracking/{tenant_slug}/{pet_name}/{tracking_token}` returns the full timeline (each `WorkflowStep` + `OrderEvidence`) without authentication. The family follows the service in real time via this link.

`WorkflowStep` is **tenant-configurable** — each crematory defines its own sequence of phases. Advancing a step typically requires `OrderEvidence` (photo + notes + operator signature). The frontend's `OperationDetailModal` is the operator's primary UI for this flow.

### RBAC: Roles & Permissions
8 roles defined: `admin`, `recepcion`, `operador_cremacion`, `contabilidad`, `marketing`, `auditor`, `operator`, `driver`. Plus `creator` (SuperAdmin, bypasses tenant scope).

Permissions are granular: `{module_key, action}` where action ∈ `{view, create, edit, delete}`. Enforced via `check_permission()` in `app/api/deps.py`. Frontend mirrors this via `usePermissions()` context and the `useFeatures()` hook for feature-flag gating.

### Subdomain Routing (Frontend)
`frontend-saas/src/middleware.ts` routes based on hostname:
- `admin.*` → `/admin` (SuperAdmin dashboard)
- `veterinary.*` → `/veterinary` (Partner portal)
- `<tenant>.*` → `/tenant` (Tenant operations)
- root or `lvh.me` → `/public` (Landing page)
- `pawmemory.pet` → `/public/memorials` (Dedicated memorials domain)

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
Modules: `admin`, `auth`, `catalog`, `crm`, `operations`, `creator`, `memorials`, `payments`, `partners`, `veterinary`, `common`.

### Authentication
- JWT (HS256), 7-day expiry, via `Authorization: Bearer <token>` header
- Login endpoint: `POST /api/internal/auth/login` (OAuth2PasswordBearer)
- Protected endpoints use `get_current_user()` FastAPI dependency from `backend/app/auth.py`
- Frontend stores tokens in cookies: `saasc_token` (tenant/admin), `vet_token` (veterinary portal)

### Frontend API Layer
- Axios instance with auth headers: `frontend-saas/src/lib/api/`
- React Query (TanStack v5) for all server state, configured in `lib/queryClient.ts`
- Translations (Spanish-first) centralized in `lib/translations.ts`

### Frontend Stack Notes
- **Tailwind CSS v4** — no `tailwind.config.js`. Theme tokens live in `@theme inline { ... }` inside `src/app/globals.css` and per-route-group `globals.css` (e.g. tenant has dynamic theme variables in `(tenant)/tenant/globals.css`). Custom utilities (e.g. `.no-scrollbar`) are defined inside `@layer base`.
- **Route groups** in `src/app/`: `(admin)` SuperAdmin panel, `(tenant)` operator dashboard, `(veterinary)` partner portal, `(public)` landings + memorials + form tokens + Vincer marketing site at `/vincer`.
- **Subdomain dev**: use `lvh.me:3000` (or `admin.lvh.me`, `app.lvh.me`, `vet.lvh.me`); middleware rewrites by host.

## Environment Variables

### Backend (`backend/.env`)
Key vars: `SECRET_KEY`, `SQLALCHEMY_DATABASE_URL`, `DB_ADMIN_USER/PASS`, `R2_*` (Cloudflare R2), `POLAR_*` (payments), `MAIL_*` (Gmail SMTP), `RECAPTCHA_SECRET_KEY`, `REDIS_URL`.

### Frontend (`frontend-saas/.env`)
Key vars: `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDFLARE_R2`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.

### Root (`.env`)
Database credentials and domain mappings consumed by Docker Compose.

## Key Conventions

### API Responses
- Schemas follow naming: `CustomerCreate`, `CustomerUpdate`, `CustomerInDB`
- 401: `"Sesión expirada o token inválido"`
- Rate limits: 5/min on login, 100/min general (SlowAPI)
- Errors logged to `backend/error_debug.log`

### Frontend Route Groups
App Router layout groups: `(admin)`, `(public)`, `(tenant)`, `(veterinary)` — these are in `frontend-saas/src/app/`.

### Memorials
- Memorials have a public UUID route (`/memorials/v/{cliente}/{mascota}/{uuid}`) and an optional 6-digit `access_key` PIN for private memorials.
- Dedications require explicit approval by the tenant before becoming public (status: `pendiente` → `aprobado`/`rechazado`).
- Memorial design (altar theme, particles, fonts) is stored as JSON per memorial and can be edited from the tenant's memorial setup modal.

### Known Incomplete Areas ("Próximamente")
- **Veterinary B2B portal**: The data model (Veterinary, PartnerLink, commission %) and notifications exist, but the full self-service portal (clinics submitting cremations, viewing referrals, commission payouts) is incomplete. Landing page (`/vincer`) explicitly tags these features with "Próximamente".
- **Commission liquidation**: Calculated but no payout endpoint.
- Several files have **pre-existing TypeScript errors** (e.g. `gestion-servicios/plan/[id]/page.tsx`, `mascotas/page.tsx` null-vs-undefined mismatches). They are not blocking the build via Next.js's loose mode but `tsc --noEmit` will report them. Don't assume they're caused by your changes.

## Infrastructure

- **Storage**: Cloudflare R2 (S3-compatible), client in `backend/app/utils/r2.py`
- **Payments**: Polar.sh — set `POLAR_SERVER=sandbox` or `production`
- **Email**: Gmail SMTP via fastapi-mail (`backend/app/services/email.py`)
- **Certificates**: PDF generation in `backend/app/utils/certificates.py` (~34KB, complex)
- **Audit**: All API requests logged via `backend/app/middleware/audit_middleware.py` to `AuditLog` table
- **3D Memorials**: Three.js / @react-three/fiber in frontend for pet memorial visualization
- **Form Tokens**: Public registration forms use temporary tokens (`form_tokens`) with a 6-digit PIN and a few-day TTL. Generated from the tenant's Navbar "share" action.
