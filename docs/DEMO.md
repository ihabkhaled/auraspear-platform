# AuraSpear Platform — Demo Guide

This guide walks through running a live demo of the AuraSpear SOC platform using the
seeded database. Everything described here is produced by the Prisma seed script
(`apps/api/prisma/seed.ts`), so the personas, tenants, and storyline data below match
exactly what you get after seeding.

---

## 1. Prerequisites — Seeding the Demo Environment

The demo relies entirely on seeded data. Before logging in you must seed the database.

### Required environment variable

The seed script **fails loudly** if `SEED_DEFAULT_PASSWORD` is not set — there is no
fallback. From `apps/api/prisma/seed.ts`:

```ts
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} environment variable is required. Set a strong password (12+ chars) before seeding.`
    )
  }
  return value
}

const DEFAULT_PASSWORD: string = requireEnv('SEED_DEFAULT_PASSWORD')
```

`SEED_DEFAULT_PASSWORD` is declared (empty, must be filled in) in:

- `apps/api/.env.example` — `SEED_DEFAULT_PASSWORD=` with the comment
  _"REQUIRED for prisma db seed — set a strong password (12+ chars)"_
- `apps/api/.env.docker`
- `.env.example` and `.env.production.example` at the repo root

The single password you set there becomes the login password for **every seeded user**
(it is hashed with bcrypt at `BCRYPT_ROUNDS = 12` and stored as `passwordHash`).

> The local `apps/api/.env` checked into the working tree uses
> `SEED_DEFAULT_PASSWORD=Admin@123!Secure` for local development. Treat this as a
> local-only convenience value, not a production credential.

### Optional connector credentials

Connector seed credentials are read from `SEED_*` env vars and fall back to obvious
placeholders (`CHANGE_ME_NOT_A_REAL_PASSWORD`, `CHANGE_ME_NOT_A_REAL_API_KEY`, etc.) when
unset: `SEED_WAZUH_PASSWORD`, `SEED_WAZUH_INDEXER_PASSWORD`, `SEED_GRAYLOG_PASSWORD`,
`SEED_VELOCIRAPTOR_PASSWORD`, `SEED_GRAFANA_API_KEY`, `SEED_INFLUXDB_TOKEN`,
`SEED_MISP_AUTH_KEY`, `SEED_SHUFFLE_API_KEY`. Connector configs are encrypted at rest
when `CONFIG_ENCRYPTION_KEY` is present (AES-256-GCM via `encrypt(...)`).

### Run the seed

From `apps/api` (commands defined in `apps/api/package.json`):

```bash
npm run prisma:seed     # runs "prisma db seed"
# or the alias:
npm run seed
```

The seeder is **idempotent** — it uses `upsert` / `createMany({ skipDuplicates: true })`
throughout and is safe to re-run.

---

## 2. Demo Tenants

The seed creates three tenants, each with a different "personality" and data volume
(`TENANT_PROFILES` in `seed.ts`):

| Tenant          | Slug              | Tenant ID                              | Seeded Alerts | Profile                                                     |
| --------------- | ----------------- | -------------------------------------- | ------------- | ----------------------------------------------------------- |
| Aura Finance    | `aura-finance`    | `00000000-0000-4000-a000-000000000001` | 32            | Finance-themed assets (`fin-web-01`, `trading-server-01`…)  |
| Aura Health     | `aura-health`     | `00000000-0000-4000-a000-000000000002` | 18            | Healthcare assets (`ehr-server-01`, `pharmacy-app-01`…)     |
| Aura Enterprise | `aura-enterprise` | `00000000-0000-4000-a000-000000000003` | 45            | Broad enterprise estate (largest data set — best for demos) |

Each tenant is seeded with the same set of connectors (`CONNECTOR_SEEDS`), all pointed at
the local Docker stack: **Wazuh Manager**, **Graylog SIEM**, **Velociraptor EDR**
(disabled by default), **Grafana**, **InfluxDB**, **MISP Threat Intel**, **Shuffle SOAR**,
and **AWS Bedrock AI** (model `global.anthropic.claude-sonnet-4-5-20250929-v1:0`).

> **Recommendation:** use **Aura Enterprise** for the main storyline — it has the most
> alerts (45), the full set of case templates, and the richest hunt/intel data.

---

## 3. Personas — Seeded Users & Roles

### 3.1 Platform Administrator (cross-tenant)

A single true `GLOBAL_ADMIN` is seeded who is a member of **every** tenant:

| Field     | Value                                           |
| --------- | ----------------------------------------------- |
| Name      | Platform Administrator                          |
| Email     | `platform-admin@auraspear.io`                   |
| Role      | `GLOBAL_ADMIN` (membership in all 3 tenants)    |
| Protected | `isProtected: true` (cannot be deleted/blocked) |
| Password  | value of `SEED_DEFAULT_PASSWORD`                |

Because this user is `GLOBAL_ADMIN`, it can switch tenants via the `X-Tenant-Id` header and
always passes permission checks. Use it to demonstrate cross-tenant administration.

### 3.2 Per-tenant personas

For **each** tenant, five role-specific users are seeded. Emails follow the pattern
`<persona>@<tenant-slug>.io`, and **all share the same `SEED_DEFAULT_PASSWORD`**.

| Persona / Name | Email pattern          | Role                 | Notes                                                    |
| -------------- | ---------------------- | -------------------- | -------------------------------------------------------- |
| Admin User     | `admin@<slug>.io`      | `TENANT_ADMIN`       | `isProtected: true` (the only protected per-tenant user) |
| Senior Analyst | `analyst.l2@<slug>.io` | `SOC_ANALYST_L2`     | Also gets a seeded mobile session                        |
| Junior Analyst | `analyst.l1@<slug>.io` | `SOC_ANALYST_L1`     | Front-line triage                                        |
| Threat Hunter  | `hunter@<slug>.io`     | `THREAT_HUNTER`      | Owns hunt sessions                                       |
| Executive      | `exec@<slug>.io`       | `EXECUTIVE_READONLY` | Read-only dashboards/reports + AI chat                   |

Concrete examples for **Aura Enterprise** (`aura-enterprise`):

- `admin@aura-enterprise.io` — TENANT_ADMIN
- `analyst.l2@aura-enterprise.io` — SOC_ANALYST_L2
- `analyst.l1@aura-enterprise.io` — SOC_ANALYST_L1
- `hunter@aura-enterprise.io` — THREAT_HUNTER
- `exec@aura-enterprise.io` — EXECUTIVE_READONLY

Each seeded user also gets:

- A `TenantMembership` with `status: 'active'`.
- A `UserPreference` row (theme `system`, language `en`, comfortable dashboard density).
- A seeded desktop `UserSession` (Windows/Chrome) with realistic `lastLoginAt`/`lastSeenAt`
  timestamps; TENANT_ADMIN and SOC_ANALYST_L2 additionally get a seeded **mobile** session
  (Android/Pixel 8), so the "active sessions" UI has multi-device data to show.

### 3.3 Role hierarchy & capabilities

Roles are ordered most-to-least privileged (per `apps/api/CLAUDE.md`):

```
GLOBAL_ADMIN > TENANT_ADMIN > SOC_ANALYST_L2 > THREAT_HUNTER > SOC_ANALYST_L1 > EXECUTIVE_READONLY
```

Permissions are stored in the database and seeded from `DEFAULT_PERMISSIONS`
(`apps/api/src/modules/role-settings/constants/default-permissions.ts`). Relevant
contrasts for the demo:

- **TENANT_ADMIN, SOC_ANALYST_L2, THREAT_HUNTER, SOC_ANALYST_L1** all hold
  `CASES_CREATE`, so they can open and work cases.
- **EXECUTIVE_READONLY** is intentionally read-only: it holds view/export permissions
  (`DASHBOARD_VIEW`, `ALERTS_VIEW`, `CASES_VIEW`, `INCIDENTS_VIEW`, `REPORTS_VIEW`,
  `REPORTS_EXPORT`, `COMPLIANCE_VIEW`, `INTEL_VIEW`, …) plus AI chat access
  (`AI_CHAT_ACCESS`) — but **no** `CASES_CREATE`. Use this persona to show the
  least-privileged, executive dashboard view.

---

## 4. Demo Login Flow

The platform uses **email + password** authentication for the demo (OIDC is optional and
only used when the `OIDC_*` env vars are configured).

1. Open the web app login page (`apps/web/src/app/(auth)/login/page.tsx`).
2. Enter one of the seeded emails (e.g. `admin@aura-enterprise.io`) and the
   `SEED_DEFAULT_PASSWORD` value.
3. The frontend posts to its proxy route `POST /api/auth/login`
   (`apps/web/src/app/api/auth/login/route.ts`), which forwards to the backend
   `POST /auth/login` (`apps/api/src/modules/auth/auth.controller.ts`).

The backend login endpoint:

- Is `@Public()` and rate-limited to **5 requests / 60s** (`@Throttle`).
- Validates the body with `AuthLoginSchema` (Zod).
- On success returns `{ accessToken, csrfToken, user, permissions, tenants }` and sets the
  access + refresh tokens as HTTP-only cookies (`setAuthCookies`).
- The `tenants` array lets the UI show every tenant the user belongs to — most useful for
  `platform-admin@auraspear.io`, which returns all three tenants and enables tenant
  switching.

> Tokens are short-lived access (15m) + refresh (7d), each with `jti` + `tokenType`
> claims; the seed even pre-creates `RefreshTokenFamily` / `RefreshTokenRotation` /
> `UserSession` rows so session-management screens have data on first login.

---

## 5. Demo Storyline

A natural end-to-end demo using the **Aura Enterprise** tenant. Sign in as the
**Senior Analyst** (`analyst.l2@aura-enterprise.io`) unless noted, since that persona can
view alerts, run AI, and create/escalate cases.

### Step 1 — Dashboard overview

Land on the dashboard. The seed populates this tenant with **45 alerts**, multiple case
cycles, incidents, vulnerabilities, UEBA entities, attack paths, SOAR playbooks,
compliance controls, and reports — so the KPI panels, severity breakdowns, and MITRE
panels all render with real numbers. (Use the **Executive** persona,
`exec@aura-enterprise.io`, to show the same dashboards in a clean read-only view.)

### Step 2 — Alert investigation

Open the alerts list. Alerts are generated from `ALERT_TEMPLATES` (20 templates) with
realistic detail:

- A spread of statuses (`new_alert`, `acknowledged`, `in_progress`, `false_positive`,
  `resolved`) driven by the tenant's `alertStatusWeights`.
- Severities from `low` → `critical`, MITRE tactics/techniques (e.g.
  _Suspicious PowerShell Execution_ → `T1059.001`, _Credential Dumping Attempt_ →
  `T1003.001`, _Ransomware Encryption Activity_ → `T1486`).
- Sources spanning `wazuh`, `graylog`, `velociraptor`, `logstash`, and `misp`.
- A `rawEvent` JSON payload (source-shaped: Wazuh decoder fields, Graylog stream fields,
  or Velociraptor artifact fields) for ~80% of alerts, plus acknowledged/closed metadata
  and human-readable `resolution` text on resolved/closed alerts.

Pick a high/critical alert (e.g. _Credential Dumping Attempt_ or _Malware C2 Beacon_) and
open its detail to show enrichment, MITRE mapping, and the raw event.

### Step 3 — AI Copilot

From the alert, invoke the AI copilot. AI routing uses the seeded **AWS Bedrock AI**
connector (model `global.anthropic.claude-sonnet-4-5-20250929-v1:0`, with
`nlHuntingEnabled`, `explainableAiEnabled`, and `auditLoggingEnabled` set). Every tenant is
also seeded with **AI audit logs** and **AI agents**, so the AI activity/audit views are
populated. Demonstrate the copilot summarizing the alert, mapping MITRE techniques, and
suggesting next steps.

> Threat-hunting tie-in: sign in (or note) the **Threat Hunter**
> (`hunter@aura-enterprise.io`). Hunt sessions are pre-seeded from `HUNT_QUERIES` with
> mixed statuses (`completed`, `running`, `error`), reasoning steps, and matched
> `HuntEvent` records — e.g. `process.name:powershell.exe AND process.args:*-enc*`.

### Step 4 — Case escalation

Escalate the alert into a case. The tenant already has cases seeded from `CASE_TEMPLATES`
(e.g. _Ransomware Investigation_, _Phishing Campaign Response_, _Insider Threat Review_,
_Vulnerability Exploitation_ / Log4Shell), each with:

- Sequential case numbers `SOC-<year>-NNN` (generated with a global counter).
- A severity/status, a `createdBy` of `admin@<slug>.io`, owner assignment round-robined
  across assignable users (analysts/hunters/admins — execs are excluded), and round-robin
  assignment across the three **case cycles** (`Cycle 1 — January Ops` and
  `Cycle 2 — February Ops` closed, `Cycle 3 — March Ops` active).
- A seeded `timeline` (`created`, `status_changed`) and a triage `note` for non-open cases.

Show creating a new case from the alert (Senior Analyst has `CASES_CREATE`), linking the
alert, assigning an owner, and adding it to the active March cycle. Notifications are also
seeded, so the bell/notifications panel has content.

### Step 5 — Report

Finish by generating/showing a report. Report templates and per-tenant reports are seeded
(`seedReportTemplates` + `seedReports`), so the reports module lists ready-made executive
and operational reports. Switch to the **Executive** persona (`exec@aura-enterprise.io`),
which holds `REPORTS_VIEW` and `REPORTS_EXPORT`, to present and export the report as a
leadership wrap-up of the investigation.

---

## 6. Quick Reference — Demo Credentials

| Purpose                    | Email                           | Role               |
| -------------------------- | ------------------------------- | ------------------ |
| Cross-tenant super admin   | `platform-admin@auraspear.io`   | GLOBAL_ADMIN       |
| Tenant admin (Enterprise)  | `admin@aura-enterprise.io`      | TENANT_ADMIN       |
| Senior analyst (storyline) | `analyst.l2@aura-enterprise.io` | SOC_ANALYST_L2     |
| Junior analyst             | `analyst.l1@aura-enterprise.io` | SOC_ANALYST_L1     |
| Threat hunter              | `hunter@aura-enterprise.io`     | THREAT_HUNTER      |
| Executive (read-only)      | `exec@aura-enterprise.io`       | EXECUTIVE_READONLY |

Swap the `aura-enterprise` slug for `aura-finance` or `aura-health` to demo the other
tenants. **Password for every account = the value of `SEED_DEFAULT_PASSWORD`.**

---

### Key source files

- Seed script: `apps/api/prisma/seed.ts`
- Default role permissions: `apps/api/src/modules/role-settings/constants/default-permissions.ts`
- Login endpoint: `apps/api/src/modules/auth/auth.controller.ts` (`POST /auth/login`)
- Web login UI: `apps/web/src/app/(auth)/login/page.tsx`
- Web login proxy: `apps/web/src/app/api/auth/login/route.ts`
- Seed env vars: `apps/api/.env.example` (`SEED_DEFAULT_PASSWORD`, `SEED_*`)
