# AuraSpear Permissions Reference

## Overview

AuraSpear uses a dynamic, database-backed permission system. Permissions follow a `MODULE.ACTION` naming convention and are enforced via the `@RequirePermission()` decorator on every endpoint. `GLOBAL_ADMIN` always has full access (short-circuited in the guard).

Permissions are defined in `src/common/enums/permission.enum.ts` and default role assignments in `src/modules/role-settings/constants/default-permissions.ts`.

---

## Role Hierarchy

Ordered from most privileged to least:

| #   | Role                 | Code                   | Description                                                  |
| --- | -------------------- | ---------------------- | ------------------------------------------------------------ |
| 1   | Global Admin         | `GLOBAL_ADMIN`         | Platform-wide superuser (all permissions, cannot be removed) |
| 2   | Platform Operator    | `PLATFORM_OPERATOR`    | Infrastructure and platform operations                       |
| 3   | Tenant Admin         | `TENANT_ADMIN`         | Full tenant-level administration                             |
| 4   | Detection Engineer   | `DETECTION_ENGINEER`   | Detection and correlation rule management                    |
| 5   | Incident Responder   | `INCIDENT_RESPONDER`   | Alert triage, case management, incident response             |
| 6   | Threat Intel Analyst | `THREAT_INTEL_ANALYST` | Threat intelligence and vulnerability research               |
| 7   | SOAR Engineer        | `SOAR_ENGINEER`        | SOAR playbook creation and automation                        |
| 8   | Threat Hunter        | `THREAT_HUNTER`        | Proactive threat hunting                                     |
| 9   | SOC Analyst L2       | `SOC_ANALYST_L2`       | Senior SOC analyst                                           |
| 10  | SOC Analyst L1       | `SOC_ANALYST_L1`       | Junior SOC analyst                                           |
| 11  | Executive Read-Only  | `EXECUTIVE_READONLY`   | Dashboard and report viewing                                 |
| 12  | Auditor Read-Only    | `AUDITOR_READONLY`     | Audit and compliance review                                  |

Roles are defined in `src/common/interfaces/authenticated-request.interface.ts`.

---

## Complete Permission Matrix

Legend: **X** = granted by default

### Alerts (5 permissions)

| Permission         | Key                  | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------ | -------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View alerts        | `alerts.view`        | X   |     | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Investigate alerts | `alerts.investigate` | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Acknowledge alerts | `alerts.acknowledge` | X   |     | X   |     | X   |     |     |     | X   | X   |     |     |
| Close alerts       | `alerts.close`       | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Escalate alerts    | `alerts.escalate`    | X   |     | X   |     | X   |     |     |     | X   |     |     |     |

### Cases (13 permissions)

| Permission         | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------ | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View cases         | `cases.view`           | X   |     | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Create cases       | `cases.create`         | X   |     | X   |     | X   |     |     | X   | X   | X   |     |     |
| Update cases       | `cases.update`         | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Delete cases       | `cases.delete`         | X   |     | X   |     | X   |     |     |     |     |     |     |     |
| Assign cases       | `cases.assign`         | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Change case status | `cases.changeStatus`   | X   |     | X   |     | X   |     |     |     | X   | X   |     |     |
| Add comments       | `cases.addComment`     | X   |     | X   |     | X   |     |     | X   | X   | X   |     |     |
| Delete comments    | `cases.deleteComment`  | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Add tasks          | `cases.addTask`        | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Update tasks       | `cases.updateTask`     | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Delete tasks       | `cases.deleteTask`     | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Add artifacts      | `cases.addArtifact`    | X   |     | X   |     | X   |     |     | X   | X   |     |     |     |
| Delete artifacts   | `cases.deleteArtifact` | X   |     | X   |     | X   |     |     |     | X   |     |     |     |

### Incidents (6 permissions)

| Permission             | Key                      | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ---------------------- | ------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View incidents         | `incidents.view`         | X   |     | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Create incidents       | `incidents.create`       | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Update incidents       | `incidents.update`       | X   |     | X   |     | X   |     |     |     |     |     |     |     |
| Delete incidents       | `incidents.delete`       | X   |     | X   |     | X   |     |     |     |     |     |     |     |
| Add timeline entries   | `incidents.addTimeline`  | X   |     | X   |     | X   |     |     |     | X   |     |     |     |
| Change incident status | `incidents.changeStatus` | X   |     | X   |     | X   |     |     |     | X   |     |     |     |

### Connectors (6 permissions)

| Permission        | Key                 | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ----------------- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View connectors   | `connectors.view`   | X   | X   | X   |     |     | X   | X   |     | X   |     |     | X   |
| Create connectors | `connectors.create` | X   | X   | X   |     |     | X   |     |     |     |     |     |     |
| Update connectors | `connectors.update` | X   | X   | X   |     |     | X   |     |     |     |     |     |     |
| Delete connectors | `connectors.delete` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Test connectors   | `connectors.test`   | X   | X   | X   |     |     | X   |     |     |     |     |     |     |
| Sync connectors   | `connectors.sync`   | X   | X   | X   |     |     | X   |     |     |     |     |     |     |

### LLM Connectors (5 permissions)

| Permission            | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| --------------------- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View LLM connectors   | `llmConnectors.view`   | X   | X   | X   | X   | X   |     |     |     |     |     |     |     |
| Create LLM connectors | `llmConnectors.create` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Update LLM connectors | `llmConnectors.update` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Delete LLM connectors | `llmConnectors.delete` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Test LLM connectors   | `llmConnectors.test`   | X   | X   | X   |     |     |     |     |     |     |     |     |     |

### Correlation Rules (5 permissions)

| Permission               | Key                  | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------------ | -------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View correlation rules   | `correlation.view`   | X   |     | X   | X   |     | X   | X   | X   | X   |     |     | X   |
| Create correlation rules | `correlation.create` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Update correlation rules | `correlation.update` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Delete correlation rules | `correlation.delete` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Toggle correlation rules | `correlation.toggle` | X   |     | X   | X   |     |     |     |     |     |     |     |     |

### Detection Rules (5 permissions)

| Permission             | Key                     | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ---------------------- | ----------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View detection rules   | `detectionRules.view`   | X   |     | X   | X   |     | X   | X   | X   | X   |     |     | X   |
| Create detection rules | `detectionRules.create` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Update detection rules | `detectionRules.update` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Delete detection rules | `detectionRules.delete` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Toggle detection rules | `detectionRules.toggle` | X   |     | X   | X   |     |     |     |     |     |     |     |     |

### Threat Hunting (5 permissions)

| Permission    | Key            | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------- | -------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View hunts    | `hunt.view`    | X   |     | X   |     |     |     |     | X   |     |     |     | X   |
| Create hunts  | `hunt.create`  | X   |     | X   |     |     |     |     | X   |     |     |     |     |
| Update hunts  | `hunt.update`  | X   |     | X   |     |     |     |     | X   |     |     |     |     |
| Delete hunts  | `hunt.delete`  | X   |     | X   |     |     |     |     | X   |     |     |     |     |
| Execute hunts | `hunt.execute` | X   |     | X   |     |     |     |     | X   |     |     |     |     |

### Reports (5 permissions)

| Permission     | Key              | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View reports   | `reports.view`   | X   |     | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Create reports | `reports.create` | X   |     | X   |     | X   | X   |     | X   | X   |     |     |     |
| Update reports | `reports.update` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Delete reports | `reports.delete` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Export reports | `reports.export` | X   |     | X   |     | X   | X   |     | X   | X   |     | X   | X   |

### Dashboard (1 permission)

| Permission     | Key              | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View dashboard | `dashboard.view` | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |

### Admin - Users (6 permissions)

| Permission    | Key                   | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------- | --------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View users    | `admin.users.view`    | X   |     | X   |     |     |     |     |     |     |     |     | X   |
| Create users  | `admin.users.create`  | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Update users  | `admin.users.update`  | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Delete users  | `admin.users.delete`  | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Block users   | `admin.users.block`   | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Restore users | `admin.users.restore` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### Admin - Tenants (4 permissions)

| Permission     | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View tenants   | `admin.tenants.view`   | X   | X   | X   |     |     |     |     |     |     |     |     | X   |
| Create tenants | `admin.tenants.create` | X   |     |     |     |     |     |     |     |     |     |     |     |
| Update tenants | `admin.tenants.update` | X   |     |     |     |     |     |     |     |     |     |     |     |
| Delete tenants | `admin.tenants.delete` | X   |     |     |     |     |     |     |     |     |     |     |     |

### Threat Intelligence (1 permission)

| Permission | Key          | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ---------- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View intel | `intel.view` | X   |     | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |

### SOAR (5 permissions)

| Permission        | Key            | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ----------------- | -------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View SOAR         | `soar.view`    | X   |     | X   |     | X   |     | X   |     | X   |     |     | X   |
| Create playbooks  | `soar.create`  | X   |     | X   |     |     |     | X   |     |     |     |     |     |
| Update playbooks  | `soar.update`  | X   |     | X   |     |     |     | X   |     |     |     |     |     |
| Delete playbooks  | `soar.delete`  | X   |     | X   |     |     |     | X   |     |     |     |     |     |
| Execute playbooks | `soar.execute` | X   |     | X   |     | X   |     | X   |     |     |     |     |     |

### AI Agents (5 permissions)

| Permission        | Key                | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ----------------- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View AI agents    | `aiAgents.view`    | X   |     | X   |     | X   | X   | X   | X   | X   | X   |     | X   |
| Execute AI agents | `aiAgents.execute` | X   |     | X   |     | X   | X   | X   | X   | X   |     |     |     |
| Create AI agents  | `aiAgents.create`  | X   |     | X   |     |     |     | X   |     |     |     |     |     |
| Update AI agents  | `aiAgents.update`  | X   |     | X   |     |     |     | X   |     |     |     |     |     |
| Delete AI agents  | `aiAgents.delete`  | X   |     | X   |     |     |     | X   |     |     |     |     |     |

### Jobs / Runtime (3 permissions)

| Permission      | Key              | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| --------------- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View jobs       | `jobs.view`      | X   | X   | X   | X   |     |     | X   |     |     |     |     | X   |
| Manage jobs     | `jobs.manage`    | X   | X   | X   | X   |     |     | X   |     |     |     |     |     |
| Cancel all jobs | `jobs.cancelAll` | X   | X   | X   |     |     |     |     |     |     |     |     |     |

### System Health (1 permission)

| Permission         | Key                 | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------ | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View system health | `systemHealth.view` | X   | X   | X   | X   |     |     | X   |     |     |     |     | X   |

### Cloud Security (4 permissions)

| Permission            | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| --------------------- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View cloud security   | `cloudSecurity.view`   | X   | X   | X   |     |     |     |     |     | X   |     | X   | X   |
| Create cloud findings | `cloudSecurity.create` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Update cloud findings | `cloudSecurity.update` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Delete cloud findings | `cloudSecurity.delete` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### Compliance (4 permissions)

| Permission              | Key                 | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ----------------------- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View compliance         | `compliance.view`   | X   |     | X   |     | X   | X   |     | X   | X   | X   | X   | X   |
| Create compliance items | `compliance.create` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Update compliance items | `compliance.update` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Delete compliance items | `compliance.delete` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### Attack Paths (4 permissions)

| Permission          | Key                  | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------- | -------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View attack paths   | `attackPaths.view`   | X   |     | X   |     | X   | X   |     | X   | X   |     |     | X   |
| Create attack paths | `attackPaths.create` | X   |     | X   |     |     |     |     | X   |     |     |     |     |
| Update attack paths | `attackPaths.update` | X   |     | X   |     |     |     |     | X   |     |     |     |     |
| Delete attack paths | `attackPaths.delete` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### UEBA (4 permissions)

| Permission        | Key           | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ----------------- | ------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View UEBA         | `ueba.view`   | X   |     | X   | X   |     | X   |     | X   | X   |     | X   | X   |
| Create UEBA items | `ueba.create` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Update UEBA items | `ueba.update` | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Delete UEBA items | `ueba.delete` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### Normalization (4 permissions)

| Permission           | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------------- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View normalization   | `normalization.view`   | X   | X   | X   | X   |     |     |     |     |     |     |     | X   |
| Create normalization | `normalization.create` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Update normalization | `normalization.update` | X   |     | X   | X   |     |     |     |     |     |     |     |     |
| Delete normalization | `normalization.delete` | X   |     | X   | X   |     |     |     |     |     |     |     |     |

### Vulnerabilities (4 permissions)

| Permission             | Key                      | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ---------------------- | ------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View vulnerabilities   | `vulnerabilities.view`   | X   |     | X   |     | X   | X   |     | X   | X   | X   |     | X   |
| Create vulnerabilities | `vulnerabilities.create` | X   |     | X   |     |     | X   |     |     |     |     |     |     |
| Update vulnerabilities | `vulnerabilities.update` | X   |     | X   |     |     | X   |     |     |     |     |     |     |
| Delete vulnerabilities | `vulnerabilities.delete` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### Data Explorer (2 permissions)

| Permission     | Key              | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View explorer  | `explorer.view`  | X   |     | X   | X   | X   | X   |     | X   | X   |     |     | X   |
| Query explorer | `explorer.query` | X   |     | X   | X   | X   | X   |     | X   | X   |     |     | X   |

### Notifications (2 permissions)

| Permission           | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------------- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View notifications   | `notifications.view`   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Manage notifications | `notifications.manage` | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |     |     |

### Profile (2 permissions)

| Permission     | Key              | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View profile   | `profile.view`   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Update profile | `profile.update` | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |

### Settings (2 permissions)

| Permission      | Key               | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| --------------- | ----------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View settings   | `settings.view`   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |
| Update settings | `settings.update` | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   | X   |

### Role Settings (2 permissions)

| Permission           | Key                   | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------------- | --------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View role settings   | `roleSettings.view`   | X   |     | X   |     |     |     |     |     |     |     |     | X   |
| Update role settings | `roleSettings.update` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### AI Copilots (4 permissions)

| Permission           | Key                    | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------------- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AI Alert Triage      | `ai.alerts.triage`     | X   | X   | X   | X   | X   |     |     |     |     |     |     |     |
| AI Case Copilot      | `ai.cases.copilot`     | X   | X   | X   |     | X   |     |     |     |     |     |     |     |
| AI Detection Copilot | `ai.detection.copilot` | X   | X   | X   | X   |     |     |     |     |     |     |     |     |
| AI SOAR Copilot      | `ai.soar.copilot`      | X   | X   | X   |     |     |     |     |     |     |     |     |     |

### Runbooks / Knowledge Base (4 permissions)

| Permission      | Key               | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| --------------- | ----------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View runbooks   | `runbooks.view`   | X   | X   | X   | X   | X   |     |     |     | X   | X   |     |     |
| Create runbooks | `runbooks.create` | X   | X   | X   | X   | X   |     |     |     |     |     |     |     |
| Update runbooks | `runbooks.update` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Delete runbooks | `runbooks.delete` | X   | X   | X   |     |     |     |     |     |     |     |     |     |

### Entities (3 permissions)

| Permission      | Key               | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| --------------- | ----------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View entities   | `entities.view`   | X   | X   | X   |     | X   |     |     |     | X   | X   |     |     |
| Create entities | `entities.create` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Update entities | `entities.update` | X   | X   | X   |     |     |     |     |     |     |     |     |     |

### MSSP Dashboard (1 permission)

| Permission          | Key                  | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------- | -------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View MSSP dashboard | `msspDashboard.view` | X   | X   |     |     |     |     |     |     |     |     |     |     |

### Users Control (4 permissions)

| Permission         | Key                           | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| ------------------ | ----------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View users control | `usersControl.view`           | X   |     | X   |     |     |     |     |     |     |     |     |     |
| View sessions      | `usersControl.viewSessions`   | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Force logout       | `usersControl.forceLogout`    | X   |     | X   |     |     |     |     |     |     |     |     |     |
| Force logout all   | `usersControl.forceLogoutAll` | X   |     | X   |     |     |     |     |     |     |     |     |     |

### AI Configuration (7 permissions)

| Permission           | Key                         | GA  | PO  | TA  | DE  | IR  | TI  | SE  | TH  | L2  | L1  | EX  | AU  |
| -------------------- | --------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View AI config       | `ai.config.view`            | X   | X   | X   | X   | X   |     |     |     | X   | X   |     |     |
| Edit AI config       | `ai.config.edit`            | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Manage prompts       | `ai.config.manage_prompts`  | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Manage triggers      | `ai.config.manage_triggers` | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Manage OSINT sources | `ai.config.manage_osint`    | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| Manage approvals     | `ai.approvals.manage`       | X   | X   | X   |     |     |     |     |     |     |     |     |     |
| View AI usage        | `ai.usage.view`             | X   | X   | X   | X   | X   |     |     |     |     |     |     |     |

---

## Permission Count Summary

| Module           | Count   |
| ---------------- | ------- |
| Alerts           | 5       |
| Cases            | 13      |
| Incidents        | 6       |
| Connectors       | 6       |
| LLM Connectors   | 5       |
| Correlation      | 5       |
| Detection Rules  | 5       |
| Threat Hunting   | 5       |
| Reports          | 5       |
| Dashboard        | 1       |
| Admin - Users    | 6       |
| Admin - Tenants  | 4       |
| Intel            | 1       |
| SOAR             | 5       |
| AI Agents        | 5       |
| Jobs             | 3       |
| System Health    | 1       |
| Cloud Security   | 4       |
| Compliance       | 4       |
| Attack Paths     | 4       |
| UEBA             | 4       |
| Normalization    | 4       |
| Vulnerabilities  | 4       |
| Data Explorer    | 2       |
| Notifications    | 2       |
| Profile          | 2       |
| Settings         | 2       |
| Role Settings    | 2       |
| AI Copilots      | 4       |
| Runbooks         | 4       |
| Entities         | 3       |
| MSSP Dashboard   | 1       |
| Users Control    | 4       |
| AI Configuration | 7       |
| **Total**        | **136** |

Note: `GLOBAL_ADMIN` is not included in the configurable role matrix -- this role has implicit access to all permissions and is short-circuited in the `PermissionsGuard`.

---

## Key Files

| File                                                         | Purpose                         |
| ------------------------------------------------------------ | ------------------------------- |
| `src/common/enums/permission.enum.ts`                        | Permission enum definition      |
| `src/common/interfaces/authenticated-request.interface.ts`   | UserRole enum and hierarchy     |
| `src/modules/role-settings/constants/default-permissions.ts` | Default role-permission mapping |
| `src/common/guards/permissions.guard.ts`                     | Permission enforcement guard    |
| `src/common/decorators/require-permission.decorator.ts`      | Endpoint permission decorator   |

---

## Related Documentation

- [Permissions and Roles Guide](./permissions-and-roles.md) -- How to add new permissions
- [AI Automation System](./AI-AUTOMATION.md) -- AI-related permissions in context
