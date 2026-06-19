# AuraSpear SOC -- OSINT Enrichment

This document covers the OSINT (Open Source Intelligence) enrichment system in the AuraSpear SOC frontend, including the three enrichment surfaces, IOC type normalization, VirusTotal analysis polling, file upload flow, and the result rendering components.

---

## Table of Contents

- [Overview](#overview)
- [OSINT Sources](#osint-sources)
- [Enrichment Surfaces](#enrichment-surfaces)
- [IOC Type Normalization](#ioc-type-normalization)
- [VirusTotal Analysis Flow](#virustotal-analysis-flow)
- [File Upload Flow](#file-upload-flow)
- [Components](#components)
- [Key Files](#key-files)

---

## Overview

OSINT enrichment allows analysts to query external threat intelligence sources for context on indicators of compromise (IOCs). The system supports 13 built-in source types and custom sources, with VirusTotal as the primary enrichment provider.

```
Analyst clicks "Enrich OSINT"
    |
    v
useOsintEnrichment()
    |
    +-- GET /api/agent-config/osint-sources     (fetch enabled sources)
    +-- POST /api/agent-config/osint/enrich     (query all enabled sources)
    |
    v
Backend queries each source in parallel
    |
    v
Results returned per source: success/failure, data, response time
    |
    v
OsintResultCard renders each source result
    |
    +-- VT results: summary badges, reputation, tags, WHOIS, raw data
    +-- VT analysis stubs: "Fetch Analysis Results" polling button
    +-- Non-VT results: raw JSON display
    +-- Failures: error message display
```

---

## OSINT Sources

Supported source types are defined in `OsintSourceType` enum (`src/enums/ai-config.enum.ts`):

| Source Type    | Enum Value       | Description                         |
| -------------- | ---------------- | ----------------------------------- |
| VirusTotal     | `virustotal`     | File, URL, domain, IP hash analysis |
| Shodan         | `shodan`         | Internet-connected device search    |
| AbuseIPDB      | `abuseipdb`      | IP address abuse reports            |
| NVD NIST       | `nvd_nist`       | National Vulnerability Database     |
| AlienVault OTX | `alienvault_otx` | Open Threat Exchange                |
| GreyNoise      | `greynoise`      | Internet background noise analysis  |
| URLScan        | `urlscan`        | URL scanning and analysis           |
| Censys         | `censys`         | Internet-wide scanning data         |
| Malware Bazaar | `malware_bazaar` | Malware sample database             |
| ThreatFox      | `threatfox`      | IOC sharing platform                |
| Pulsedive      | `pulsedive`      | Threat intelligence platform        |
| Web Search     | `web_search`     | Web search integration              |
| Custom         | `custom`         | User-defined OSINT source           |

Source authentication types (`OsintAuthType`): `none`, `api_key_header`, `api_key_query`, `bearer`, `basic`.

Built-in source defaults (name, base URL, supported IOC types) are defined in `src/lib/constants/osint-sources.ts`.

**Security**: API keys are sent to the backend for encrypted storage only. They are never stored in frontend state or localStorage.

---

## Enrichment Surfaces

OSINT enrichment is available on three pages via the shared `OsintEnrichButton` component:

### 1. Alert Detail Drawer

**File**: `src/components/alerts/AlertDetailDrawer.tsx`

When viewing an alert's detail, each IOC extracted from the alert can be enriched. The enrich button appears inline next to each IOC value.

### 2. Entity Management Page

**File**: `src/app/(portal)/entities/page.tsx`

The entities page lists all observed entities (IPs, domains, hashes, etc.). Each entity row includes an enrich button that queries all enabled OSINT sources for that entity's IOC type and value.

Enrichable entity types are defined in `src/lib/entity.utils.ts`:

- IP, Domain, Hostname, Hash, URL, Email, File

The `isEnrichableEntityType()` function determines whether an entity supports OSINT enrichment. The `resolveIocType()` function maps entity types to backend-compatible IOC types.

### 3. Threat Intelligence Page

**File**: `src/components/intel/WazuhCorrelationPanel.tsx`

IOCs on the threat intelligence page (from MISP feeds and manual IOC search) can be enriched with OSINT data.

### 4. Case Artifact Panel

**File**: `src/components/cases/CaseArtifactPanel.tsx`

Case artifacts that represent IOCs can be enriched directly from the case detail view.

---

## IOC Type Normalization

The frontend must normalize a wide variety of IOC type strings (from MISP, entity types, user input) into the 14 backend-compatible types defined in the `IOCType` enum.

### Backend IOC Types (`src/enums/ioc-type.enum.ts`)

| Enum Value     | String         | Description                                   |
| -------------- | -------------- | --------------------------------------------- |
| `IP`           | `ip`           | IPv4 or IPv6 address                          |
| `DOMAIN`       | `domain`       | Domain name                                   |
| `URL`          | `url`          | Full URL                                      |
| `MD5`          | `md5`          | MD5 hash                                      |
| `SHA1`         | `sha1`         | SHA-1 hash                                    |
| `SHA256`       | `sha256`       | SHA-256 hash                                  |
| `HASH`         | `hash`         | Generic hash (SHA-512, ssdeep, imphash, etc.) |
| `FILE_NAME`    | `file_name`    | Filename                                      |
| `CIDR`         | `cidr`         | CIDR notation                                 |
| `EMAIL`        | `email`        | Email address                                 |
| `ASN`          | `asn`          | Autonomous System Number                      |
| `CVE`          | `cve`          | CVE identifier                                |
| `REGISTRY_KEY` | `registry_key` | Windows registry key                          |
| `FILE_PATH`    | `file_path`    | File system path                              |

### Normalization Map

The `normalizeIocType()` function in `src/lib/entity.utils.ts` maps 50+ incoming type strings to these 14 backend types. The full mapping:

**IP variants** (all map to `ip`):
`ip`, `ip-src`, `ip-dst`, `ip-src|port`, `ip-dst|port`, `ipv4`, `ipv6`, `ip_address`

**Domain variants** (all map to `domain`):
`domain`, `domain|ip`, `hostname`, `hostname|port`

**URL variants** (all map to `url`):
`url`, `uri`, `link`

**Hash variants**:

- `md5`, `filename|md5` map to `md5`
- `sha1`, `filename|sha1` map to `sha1`
- `sha256`, `filename|sha256` map to `sha256`
- `hash`, `file_hash`, `sha512`, `ssdeep`, `imphash`, `tlsh`, `sha224`, `sha384`, `authentihash`, `pehash` map to generic `hash`

**File variants**:

- `file`, `filename`, `file_name`, `attachment`, `email-attachment` map to `file_name`
- `filepath`, `file_path` map to `file_path`

**Email variants** (all map to `email`):
`email`, `email-src`, `email-dst`, `email-subject`

**Network variants**:

- `cidr` maps to `cidr`
- `asn`, `as` map to `asn`

**Other**:

- `cve`, `vulnerability` map to `cve`
- `registry`, `registry_key`, `regkey`, `regkey|value`, `windows-registry-key` map to `registry_key`

Unknown types pass through as-is (lowercased).

---

## VirusTotal Analysis Flow

VirusTotal URL and file submissions return an analysis stub (not final results). The frontend handles this with a two-phase fetch:

### Phase 1: Initial Enrichment

```
POST /api/agent-config/osint/enrich
    { iocType, iocValue, sourceIds }
    |
    v
Backend queries VT API
    |
    +-- Direct result (IP, domain, hash):
    |   Response includes full analysis data
    |   (last_analysis_stats, reputation, tags, etc.)
    |
    +-- Analysis stub (URL, file):
    |   Response includes links.self = "https://www.virustotal.com/api/v3/analyses/{id}"
    |   No analysis data yet -- VT is still processing
```

### Phase 2: Polling for Results

When the initial response is an analysis stub, the `OsintResultCard` shows a "Fetch Analysis Results" button:

```
User clicks "Fetch Analysis Results"
    |
    v
fetchAnalysis(analysisUrl, sourceId)
    |
    v
GET /api/agent-config/osint/vt-analysis?url={analysisUrl}
    |
    v
Backend fetches VT analysis results
    |
    +-- Status "queued": Show "Still queued" + keep fetch button
    +-- Status "completed": Show full results with summary badges
```

### Detection Logic

The `extractVtAnalysisUrl()` function in `src/lib/osint.utils.ts` determines if a response is an analysis stub by checking if the `links.self` URL matches the pattern `https://www.virustotal.com/api/v3/analyses/*`.

The `isVtFetchedStillQueued()` function checks if fetched analysis data has `attributes.status === 'queued'`, indicating VT has not finished processing.

### VT GUI URL Extraction

The `extractVtGuiUrl()` function converts VT API URLs to user-facing GUI URLs using four strategies:

1. Parse `links.item` API path (most reliable)
2. Parse top-level `type` + `id` fields
3. Parse nested `data.type` + `data.id` fields
4. Parse `links.self` as fallback

Supported VT resource type to GUI path mappings:

| API Path                    | GUI Path                  |
| --------------------------- | ------------------------- |
| `/api/v3/files/{id}`        | `/gui/file/{id}`          |
| `/api/v3/urls/{id}`         | `/gui/url/{id}`           |
| `/api/v3/domains/{id}`      | `/gui/domain/{id}`        |
| `/api/v3/ip_addresses/{id}` | `/gui/ip-address/{id}`    |
| `/api/v3/analyses/{id}`     | `/gui/file-analysis/{id}` |

---

## File Upload Flow

The `OsintFileUploadButton` component allows analysts to upload files for VirusTotal scanning.

**Hook**: `src/hooks/useOsintFileUpload.ts`
**Component**: `src/components/common/OsintFileUploadButton.tsx`

### Flow

```
Analyst clicks "Upload File for Scan"
    |
    v
Hidden <input type="file"> triggered
    |
    v
useOsintFileUpload.handleFileChange()
    |
    +-- GET /api/agent-config/osint-sources
    |   Find first enabled VT source
    |
    +-- POST /api/agent-config/osint/upload/{sourceId}
    |   FormData with file
    |
    v
VT returns analysis stub (status: "queued", analysisUrl)
    |
    v
Component shows "Fetch Analysis Results" button
    |
    v
fetchAnalysis(analysisUrl) polls VT
    |
    +-- Still queued: Show status, keep button
    +-- Completed: Show full results + "View on VirusTotal" link
```

### Derived State

The hook computes several derived values via `useMemo`:

- `analysisUrl` -- Extracted from raw response
- `isQueued` -- Whether VT is still processing
- `fetchUrl` -- The URL to poll for results
- `fetchedStillQueued` -- Whether the polled result is still queued
- `showFetchButton` -- Whether to show the polling button
- `vtFileGuiUrl` -- Link to VT GUI for completed results

---

## Components

### `OsintEnrichButton`

**File**: `src/components/common/OsintEnrichButton.tsx`

Inline button that triggers OSINT enrichment for a specific IOC.

Props:

- `iocType` -- The IOC type string (will be normalized)
- `iocValue` -- The IOC value to enrich
- `t` -- Translation function

Behavior:

1. Click triggers `useOsintEnrichment().enrich(iocType, iocValue)`
2. Shows loading spinner during enrichment
3. On completion, displays a collapsible panel with results from each source
4. Each source result is rendered by `OsintResultCard`
5. Summary line shows `{successCount}/{totalSources} sources responded`
6. Dismiss button clears results

### `OsintResultCard`

**File**: `src/components/common/OsintResultCard.tsx`

Renders results from a single OSINT source.

Props:

- `result` -- `OsintQueryResult` with `sourceName`, `success`, `data`, `rawResponse`, `responseTimeMs`, `error`
- `t` -- Translation function
- `fetchedData` -- Data from polling (for VT analysis stubs)
- `isFetchingAnalysis` -- Loading state for the fetch button
- `onFetchAnalysis` -- Callback for the "Fetch Analysis Results" button

Display:

- **Header**: Source name, response time in ms, success/failure badge
- **VT GUI link**: "View on VirusTotal" link when available
- **VT Summary badges** (when `last_analysis_stats` present):
  - Malicious count (destructive badge)
  - Suspicious count (warning badge)
  - Clean/harmless count (success badge)
  - Undetected count (secondary badge)
  - Total engine count
- **Reputation score** (when available)
- **Tags** (outline badges)
- **WHOIS data** (collapsible)
- **Raw data** (collapsible JSON view)
- **Error message** for failed sources

### `OsintFileUploadButton`

**File**: `src/components/common/OsintFileUploadButton.tsx`

File upload button for VirusTotal file scanning. Uses a hidden file input triggered by a button click.

### `OsintSourceCard`

**File**: `src/components/ai-config/OsintSourceCard.tsx`

Card component for the OSINT source management UI on the AI Config page. Displays source name, type, enabled status, and configuration actions.

### `OsintSourceDialog`

**File**: `src/components/ai-config/OsintSourceDialog.tsx`

Dialog for creating and editing OSINT sources. Includes URL validation against SSRF patterns via `isAllowedSourceUrl()`.

---

## Key Files

| File                                              | Purpose                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| `src/hooks/useOsintEnrichment.ts`                 | Core enrichment logic (fetch sources, enrich, poll) |
| `src/hooks/useOsintFileUpload.ts`                 | File upload + VT analysis polling                   |
| `src/hooks/useOsintEnrichButton.ts`               | Bridge hook for OsintEnrichButton component         |
| `src/hooks/useOsintResultCard.ts`                 | Derived state for result card rendering             |
| `src/hooks/useOsintSources.ts`                    | OSINT source list management                        |
| `src/hooks/useOsintSourceDialog.ts`               | Source create/edit dialog logic                     |
| `src/hooks/useOsintAnalysisFetch.ts`              | VT analysis fetch logic                             |
| `src/lib/osint.utils.ts`                          | VT URL extraction, summary parsing, GUI URLs        |
| `src/lib/entity.utils.ts`                         | IOC type normalization (50+ MISP types)             |
| `src/lib/constants/osint-sources.ts`              | Built-in source defaults                            |
| `src/enums/ai-config.enum.ts`                     | OsintSourceType, OsintAuthType enums                |
| `src/enums/ioc-type.enum.ts`                      | IOCType enum (14 backend types)                     |
| `src/components/common/OsintEnrichButton.tsx`     | Inline enrich button + results                      |
| `src/components/common/OsintResultCard.tsx`       | Per-source result card                              |
| `src/components/common/OsintFileUploadButton.tsx` | File upload for VT scanning                         |
| `src/components/ai-config/OsintSourceCard.tsx`    | Source management card                              |
| `src/components/ai-config/OsintSourceDialog.tsx`  | Source create/edit dialog                           |
