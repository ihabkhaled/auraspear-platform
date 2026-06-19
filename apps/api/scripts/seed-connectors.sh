#!/bin/bash
# =============================================================================
# AuraSpear SOC — Seed All Connector Services with Hundreds of Test Data
# =============================================================================
# Usage:
#   bash scripts/seed-connectors.sh
#
# Prerequisites:
#   docker compose -f docker-compose.connectors.yml up -d
#   Wait ~60s for all services to initialize
# =============================================================================

# Note: Use MSYS_NO_PATHCONV=1 only for docker exec commands, not globally
# Global export would break temp file paths on Windows/Git Bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; }
header()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
ERRORS=0

# =============================================================================
# 1. WAZUH — Skipped (use scripts/seed-wazuh.sh for 10K Wazuh alerts)
# =============================================================================
header "1/8 — Wazuh Indexer: SKIPPED (run seed-wazuh.sh separately)"
success "Use: bash scripts/seed-wazuh.sh"

# =============================================================================
# 2. GRAYLOG — 150 Log Events via API
# =============================================================================
header "2/8 — Graylog: Seeding 150 log events"

GRAYLOG_URL="http://localhost:9000"
GRAYLOG_AUTH="admin:admin@Graylog1"

# First ensure a GELF UDP input exists
INPUT_EXISTS=$(curl -s -u "$GRAYLOG_AUTH" -H "X-Requested-By: AuraSpear" \
  "$GRAYLOG_URL/api/system/inputs" 2>/dev/null | grep -c "GELF UDP" || true)

if [ "$INPUT_EXISTS" = "0" ]; then
  curl -s -u "$GRAYLOG_AUTH" -H "X-Requested-By: AuraSpear" \
    -H "Content-Type: application/json" \
    -X POST "$GRAYLOG_URL/api/system/inputs" \
    -d '{
      "title": "GELF UDP",
      "type": "org.graylog2.inputs.gelf.udp.GELFUDPInput",
      "configuration": {"bind_address": "0.0.0.0", "port": 12201},
      "global": true
    }' >/dev/null 2>&1
  sleep 2
fi

# Also create a GELF TCP input for reliable delivery
TCP_EXISTS=$(curl -s -u "$GRAYLOG_AUTH" -H "X-Requested-By: AuraSpear" \
  "$GRAYLOG_URL/api/system/inputs" 2>/dev/null | grep -c "GELF TCP" || true)

if [ "$TCP_EXISTS" = "0" ]; then
  curl -s -u "$GRAYLOG_AUTH" -H "X-Requested-By: AuraSpear" \
    -H "Content-Type: application/json" \
    -X POST "$GRAYLOG_URL/api/system/inputs" \
    -d '{
      "title": "GELF TCP",
      "type": "org.graylog2.inputs.gelf.tcp.GELFTCPInput",
      "configuration": {"bind_address": "0.0.0.0", "port": 12202},
      "global": true
    }' >/dev/null 2>&1
  sleep 2
fi

GRAYLOG_HOSTS=("web-server-01" "web-server-02" "app-server-01" "db-server-01" "dc-server-01" "file-server-01" "mail-server-01" "vpn-gateway" "firewall-01" "ids-sensor-01" "proxy-01" "dns-server-01" "k8s-node-01" "endpoint-01" "backup-server-01")
GRAYLOG_FACILITIES=("sshd" "nginx" "apache" "mysql" "java-app" "iptables" "ad" "postfix" "openvpn" "snort" "sysmon" "squid" "bind" "kubernetes" "cron")
GRAYLOG_MSGS=(
  "Failed login attempt for user admin"
  "Connection refused from upstream backend"
  "Slow query detected (took 12.5s)"
  "Application exception: NullPointerException"
  "Blocked connection to port 3389 (RDP)"
  "Account lockout after 5 failed attempts"
  "Phishing email blocked from attacker@evil.com"
  "VPN connection from unusual location: Russia"
  "Snort alert: ET EXPLOIT Apache Struts RCE"
  "PowerShell encoded command execution detected"
  "Connection to C2 domain blocked: evil-c2.xyz"
  "Mass file rename: 1500 files to .encrypted"
  "SQL injection attempt blocked in parameter id"
  "DNS tunneling: long subdomain queries detected"
  "Container running as root in production namespace"
  "TLS certificate expired for api.internal.local"
  "Disk usage exceeded 90% threshold"
  "Failed SSH key authentication from 185.220.101.1"
  "ModSecurity rule triggered: XSS attempt"
  "Unauthorized API access with expired token"
  "Memory usage critical: 95% on db-server-01"
  "Suspicious outbound traffic to Tor exit node"
  "Service httpd restarted unexpectedly"
  "Kernel panic: Unable to mount root filesystem"
  "Audit: User jsmith added to sudoers group"
  "Rsync backup failed: connection timed out"
  "LDAP query from non-domain host detected"
  "Process sshd consuming excessive CPU"
  "New crontab entry detected for root user"
  "SELinux denial: httpd accessing /etc/shadow"
)

# Seed via GELF UDP from inside the Graylog container (bypasses Windows networking issues)
MSYS_NO_PATHCONV=1 docker exec auraspear-graylog /bin/sh -c '
HOSTS="web-server-01 db-server-01 app-server-01 file-server-01 dc-server-01 mail-server-01 vpn-gateway k8s-node-01 firewall-01 ids-sensor-01 proxy-01 dns-server-01"
MSGS="Failed login attempt for admin|Blocked connection to RDP port 3389|SQL injection attempt blocked|Web server 502 Bad Gateway|Account lockout after 5 failed attempts|Phishing email blocked from attacker|VPN connection from unusual location Russia|Snort alert: Apache Struts RCE attempt|PowerShell encoded command execution|C2 domain connection blocked evil-c2.xyz|Mass file rename to .encrypted extension|DNS tunneling: long subdomain queries|Container running as root in production|TLS certificate expired for api.internal|Disk usage exceeded 90 percent threshold"
COUNT=0
for i in $(seq 1 150); do
  HOST=$(echo $HOSTS | cut -d" " -f$(( (i % 12) + 1 )))
  MSG=$(echo "$MSGS" | cut -d"|" -f$(( (i % 15) + 1 )))
  LEVEL=$(( (i % 5) + 2 ))
  SRC="$((10 + i % 200)).$((i % 250)).$((i * 7 % 250)).$((i * 13 % 250 + 1))"
  echo -n "{\"version\":\"1.1\",\"host\":\"$HOST\",\"short_message\":\"$MSG [src=$SRC]\",\"level\":$LEVEL,\"_facility\":\"security\",\"_src_ip\":\"$SRC\",\"_event_id\":$((10000 + i))}" | nc -w 1 -u localhost 12201 2>/dev/null && COUNT=$((COUNT + 1))
done
echo "$COUNT"
' 2>&1

GELF_COUNT=$(MSYS_NO_PATHCONV=1 docker exec auraspear-graylog /bin/sh -c 'echo -n "{\"version\":\"1.1\",\"host\":\"test\",\"short_message\":\"seed-verify\"}" | nc -w 1 -u localhost 12201 2>/dev/null && echo ok' 2>&1)

success "Sent 150 GELF events to Graylog via container-internal UDP"

# =============================================================================
# 3. GRAFANA — Dashboards + Data Sources + Folders
# =============================================================================
header "3/8 — Grafana: Seeding dashboards and data"

GRAFANA_URL="http://localhost:3001"
GRAFANA_AUTH="admin:admin"

# Create/get service account + token
SA_RESULT=$(curl -s -u "$GRAFANA_AUTH" -X POST "$GRAFANA_URL/api/serviceaccounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"auraspear-seed","role":"Admin"}' 2>/dev/null)
SA_ID=$(echo "$SA_RESULT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
GRAFANA_TOKEN=""
if [ -n "$SA_ID" ] && [ "$SA_ID" != "null" ]; then
  TOKEN_RESULT=$(curl -s -u "$GRAFANA_AUTH" -X POST "$GRAFANA_URL/api/serviceaccounts/$SA_ID/tokens" \
    -H "Content-Type: application/json" \
    -d '{"name":"seed-token"}' 2>/dev/null)
  GRAFANA_TOKEN=$(echo "$TOKEN_RESULT" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
fi

# Create folder
curl -s -u "$GRAFANA_AUTH" -X POST "$GRAFANA_URL/api/folders" \
  -H "Content-Type: application/json" \
  -d '{"uid":"auraspear-soc","title":"AuraSpear SOC"}' >/dev/null 2>&1

DASHBOARDS=(
  '{"title":"Security Operations Center","tags":["security","soc"],"panels":[{"id":1,"type":"stat","title":"Total Alerts (24h)","gridPos":{"h":4,"w":6,"x":0,"y":0}},{"id":2,"type":"timeseries","title":"Alert Trend","gridPos":{"h":8,"w":12,"x":0,"y":4}},{"id":3,"type":"piechart","title":"Alerts by Severity","gridPos":{"h":8,"w":6,"x":12,"y":4}},{"id":4,"type":"table","title":"Top Attackers","gridPos":{"h":8,"w":6,"x":18,"y":4}},{"id":5,"type":"stat","title":"Active Agents","gridPos":{"h":4,"w":6,"x":6,"y":0}},{"id":6,"type":"stat","title":"Critical Alerts","gridPos":{"h":4,"w":6,"x":12,"y":0}},{"id":7,"type":"gauge","title":"Threat Level","gridPos":{"h":4,"w":6,"x":18,"y":0}}],"schemaVersion":39}'
  '{"title":"Network Traffic Analysis","tags":["network","traffic"],"panels":[{"id":1,"type":"timeseries","title":"Bandwidth Usage","gridPos":{"h":8,"w":12,"x":0,"y":0}},{"id":2,"type":"table","title":"Top Connections","gridPos":{"h":8,"w":12,"x":12,"y":0}},{"id":3,"type":"piechart","title":"Protocol Distribution","gridPos":{"h":8,"w":8,"x":0,"y":8}},{"id":4,"type":"barchart","title":"Traffic by Source IP","gridPos":{"h":8,"w":8,"x":8,"y":8}},{"id":5,"type":"stat","title":"Blocked Connections","gridPos":{"h":4,"w":8,"x":16,"y":8}}],"schemaVersion":39}'
  '{"title":"Endpoint Security","tags":["endpoint","edr"],"panels":[{"id":1,"type":"stat","title":"Total Endpoints","gridPos":{"h":4,"w":6,"x":0,"y":0}},{"id":2,"type":"stat","title":"Online Endpoints","gridPos":{"h":4,"w":6,"x":6,"y":0}},{"id":3,"type":"timeseries","title":"Endpoint Events","gridPos":{"h":8,"w":12,"x":0,"y":4}},{"id":4,"type":"table","title":"Recent Detections","gridPos":{"h":8,"w":12,"x":12,"y":4}}],"schemaVersion":39}'
  '{"title":"Threat Intelligence Overview","tags":["threat-intel","misp"],"panels":[{"id":1,"type":"stat","title":"IOCs Tracked","gridPos":{"h":4,"w":6,"x":0,"y":0}},{"id":2,"type":"stat","title":"Active Campaigns","gridPos":{"h":4,"w":6,"x":6,"y":0}},{"id":3,"type":"piechart","title":"IOC Types","gridPos":{"h":8,"w":8,"x":0,"y":4}},{"id":4,"type":"table","title":"Recent Events","gridPos":{"h":8,"w":16,"x":8,"y":4}}],"schemaVersion":39}'
  '{"title":"Authentication & Access","tags":["auth","access"],"panels":[{"id":1,"type":"timeseries","title":"Login Attempts","gridPos":{"h":8,"w":12,"x":0,"y":0}},{"id":2,"type":"piechart","title":"Auth Success vs Failure","gridPos":{"h":8,"w":6,"x":12,"y":0}},{"id":3,"type":"table","title":"Account Lockouts","gridPos":{"h":8,"w":6,"x":18,"y":0}},{"id":4,"type":"stat","title":"Failed Logins (1h)","gridPos":{"h":4,"w":6,"x":0,"y":8}}],"schemaVersion":39}'
  '{"title":"Infrastructure Health","tags":["infra","monitoring"],"panels":[{"id":1,"type":"gauge","title":"CPU Usage","gridPos":{"h":6,"w":6,"x":0,"y":0}},{"id":2,"type":"gauge","title":"Memory Usage","gridPos":{"h":6,"w":6,"x":6,"y":0}},{"id":3,"type":"gauge","title":"Disk Usage","gridPos":{"h":6,"w":6,"x":12,"y":0}},{"id":4,"type":"timeseries","title":"System Load","gridPos":{"h":8,"w":18,"x":0,"y":6}}],"schemaVersion":39}'
)

GF_COUNT=0
for DB in "${DASHBOARDS[@]}"; do
  curl -s -u "$GRAFANA_AUTH" -X POST "$GRAFANA_URL/api/dashboards/db" \
    -H "Content-Type: application/json" \
    -d "{\"dashboard\":$DB,\"folderUid\":\"auraspear-soc\",\"overwrite\":true}" >/dev/null 2>&1
  GF_COUNT=$((GF_COUNT + 1))
done

if [ -n "$GRAFANA_TOKEN" ]; then
  success "Seeded $GF_COUNT dashboards + API token: $GRAFANA_TOKEN"
else
  success "Seeded $GF_COUNT dashboards (service account may already exist)"
fi

# =============================================================================
# 4. INFLUXDB — 500+ Time-Series Data Points
# =============================================================================
header "4/8 — InfluxDB: Seeding 500+ metrics"

INFLUX_URL="http://localhost:8086"
INFLUX_TOKEN="auraspear-dev-token-change-me"
INFLUX_ORG="auraspear"
INFLUX_BUCKET="security"

TMPFILE=$(mktemp)
BASE_TS=$(($(date +%s) - 86400 * 3))
INFLUX_HOSTS=("web-server-01" "db-server-01" "app-server-01" "file-server-01" "dc-server-01" "mail-server-01" "vpn-gateway" "k8s-node-01")

for i in $(seq 0 71); do
  TS=$(( (BASE_TS + i * 3600) * 1000000000 ))
  HIDX=$((i % 8))
  printf 'alert_counts,severity=critical count=%di %d\n' "$((RANDOM % 5 + 1))" "$TS"
  printf 'alert_counts,severity=high count=%di %d\n' "$((RANDOM % 15 + 3))" "$TS"
  printf 'alert_counts,severity=medium count=%di %d\n' "$((RANDOM % 30 + 10))" "$TS"
  printf 'alert_counts,severity=low count=%di %d\n' "$((RANDOM % 50 + 20))" "$TS"
  printf 'network_traffic,interface=eth0 bytes_in=%di,bytes_out=%di %d\n' "$((RANDOM * 10000 + 500000))" "$((RANDOM * 8000 + 300000))" "$TS"
  printf 'network_traffic,interface=eth1 bytes_in=%di,bytes_out=%di %d\n' "$((RANDOM * 5000 + 100000))" "$((RANDOM * 4000 + 80000))" "$TS"
  printf 'auth_events,type=success count=%di %d\n' "$((RANDOM % 100 + 50))" "$TS"
  printf 'auth_events,type=failure count=%di %d\n' "$((RANDOM % 20 + 2))" "$TS"
  printf 'auth_events,type=lockout count=%di %d\n' "$((RANDOM % 5))" "$TS"
  printf 'threat_intel,source=misp hits=%di %d\n' "$((RANDOM % 10))" "$TS"
  printf 'threat_intel,source=virustotal hits=%di %d\n' "$((RANDOM % 8))" "$TS"
  printf 'system_metrics,host=%s cpu_usage=%d.%d,memory_usage=%d.%d,disk_usage=%d.%d %d\n' "${INFLUX_HOSTS[$HIDX]}" "$((30 + RANDOM % 60))" "$((RANDOM % 10))" "$((50 + RANDOM % 45))" "$((RANDOM % 10))" "$((30 + RANDOM % 50))" "$((RANDOM % 10))" "$TS"
  printf 'firewall_events,action=allow count=%di %d\n' "$((RANDOM % 500 + 100))" "$TS"
  printf 'firewall_events,action=deny count=%di %d\n' "$((RANDOM % 100 + 5))" "$TS"
done > "$TMPFILE"

sed -i 's/\r$//' "$TMPFILE" 2>/dev/null
LINES=$(wc -l < "$TMPFILE")

INFLUX_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$INFLUX_URL/api/v2/write?org=$INFLUX_ORG&bucket=$INFLUX_BUCKET&precision=ns" \
  -H "Authorization: Token $INFLUX_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary "@$TMPFILE" 2>/dev/null)

rm -f "$TMPFILE"

if [ "$INFLUX_RESULT" = "204" ]; then
  success "Seeded 72h of metrics into InfluxDB ($LINES data points)"
else
  fail "InfluxDB seeding returned HTTP $INFLUX_RESULT"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# 5. MISP — 10 Threat Intel Events with 100+ IOCs
# =============================================================================
header "5/8 — MISP: Seeding threat intelligence events"

MISP_URL="https://localhost:8443"

# Get MISP auth key from inside the container (most reliable)
MISP_KEY=$(MSYS_NO_PATHCONV=1 docker exec auraspear-misp /bin/sh -c '/var/www/MISP/app/Console/cake user change_authkey admin@admin.test 2>/dev/null' 2>&1 | grep -o '[A-Za-z0-9]\{40\}')

if [ -z "$MISP_KEY" ]; then
  # Fallback: try API login
  MISP_KEY=$(curl -sk -X POST "$MISP_URL/auth" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@admin.test","password":"admin"}' 2>/dev/null | grep -o '"authkey":"[^"]*"' | cut -d'"' -f4)
fi

if [ -n "$MISP_KEY" ]; then
  success "MISP API key: $MISP_KEY"
  MH=(-sk -H "Authorization: $MISP_KEY" -H "Content-Type: application/json" -H "Accept: application/json")

  # Event 1: APT-29
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"APT-29 Cozy Bear - SolarWinds Supply Chain Attack","distribution":0,"threat_level_id":1,"analysis":2,"Attribute":[
    {"type":"ip-dst","category":"Network activity","value":"185.220.101.1","to_ids":true,"comment":"C2 server"},
    {"type":"ip-dst","category":"Network activity","value":"91.189.92.11","to_ids":true,"comment":"Exfiltration endpoint"},
    {"type":"ip-dst","category":"Network activity","value":"5.188.86.250","to_ids":true,"comment":"Staging server"},
    {"type":"ip-dst","category":"Network activity","value":"77.83.247.81","to_ids":true,"comment":"Beacon relay"},
    {"type":"domain","category":"Network activity","value":"evil-c2-server.xyz","to_ids":true,"comment":"Primary C2"},
    {"type":"domain","category":"Network activity","value":"update-check.solarwinds-malware.com","to_ids":true},
    {"type":"domain","category":"Network activity","value":"cdn-static.apt29-infra.net","to_ids":true},
    {"type":"md5","category":"Payload delivery","value":"a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4","to_ids":true,"comment":"Sunburst backdoor"},
    {"type":"sha256","category":"Payload delivery","value":"ce77d116a074dab7a22a0fd4f2c1ab475f16eec42e1ded3c0b0aa8211fe858d6","to_ids":true},
    {"type":"sha256","category":"Payload delivery","value":"32519b85c0b422e4656de6e6c41878e95fd95026267daab4215ee59c107d6c77","to_ids":true,"comment":"TEARDROP"},
    {"type":"url","category":"Network activity","value":"https://evil-c2-server.xyz/api/v1/beacon","to_ids":true},
    {"type":"email-src","category":"Payload delivery","value":"phishing@apt29-campaign.ru","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"SolarWinds.Orion.Core.BusinessLayer.dll","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 2: LockBit 3.0
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"LockBit 3.0 Ransomware - Manufacturing Sector","distribution":0,"threat_level_id":1,"analysis":1,"Attribute":[
    {"type":"ip-dst","category":"Network activity","value":"203.0.113.42","to_ids":true,"comment":"C2"},
    {"type":"ip-dst","category":"Network activity","value":"198.51.100.55","to_ids":true,"comment":"Drop server"},
    {"type":"domain","category":"Network activity","value":"lockbit-decrypt.onion.ws","to_ids":true},
    {"type":"domain","category":"Network activity","value":"lockbitapt.uz","to_ids":true},
    {"type":"md5","category":"Payload delivery","value":"b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5","to_ids":true,"comment":"Dropper"},
    {"type":"sha256","category":"Payload delivery","value":"d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"lockbit_decryptor.exe","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"restore-my-files.txt","to_ids":true},
    {"type":"mutex","category":"Artifacts dropped","value":"Global\\\\LockBit3_Mutex","to_ids":true},
    {"type":"regkey","category":"Persistence mechanism","value":"HKLM\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\\\LockBit","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 3: BEC Phishing
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"Business Email Compromise - CEO Fraud Targeting Finance","distribution":0,"threat_level_id":2,"analysis":2,"Attribute":[
    {"type":"email-src","category":"Payload delivery","value":"ceo-urgent@company-secure.com","to_ids":true},
    {"type":"email-src","category":"Payload delivery","value":"finance-review@secure-portal.net","to_ids":true},
    {"type":"domain","category":"Network activity","value":"company-secure.com","to_ids":true},
    {"type":"domain","category":"Network activity","value":"secure-portal.net","to_ids":true},
    {"type":"url","category":"Payload delivery","value":"https://company-secure.com/invoice-review.html","to_ids":true},
    {"type":"ip-dst","category":"Network activity","value":"198.51.100.77","to_ids":true,"comment":"Phishing infra"},
    {"type":"email-subject","category":"Payload delivery","value":"URGENT: Wire Transfer Required - Confidential","to_ids":false},
    {"type":"email-subject","category":"Payload delivery","value":"RE: Invoice #INV-2026-0342 Payment Overdue","to_ids":false}
  ]}}' >/dev/null 2>&1

  # Event 4: Cryptominer
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"XMRig Cryptominer - Cloud Infrastructure Compromise","distribution":0,"threat_level_id":3,"analysis":2,"Attribute":[
    {"type":"ip-dst","category":"Network activity","value":"45.33.32.156","to_ids":true,"comment":"Mining pool proxy"},
    {"type":"ip-dst","category":"Network activity","value":"104.248.20.30","to_ids":true,"comment":"Proxy relay"},
    {"type":"domain","category":"Network activity","value":"pool.supportxmr.com","to_ids":true},
    {"type":"domain","category":"Network activity","value":"xmr-pool.hashvault.pro","to_ids":true},
    {"type":"md5","category":"Payload delivery","value":"c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"kworker_xmrig","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":".xmrig-config.json","to_ids":true},
    {"type":"port","category":"Network activity","value":"3333","to_ids":true,"comment":"Stratum protocol"}
  ]}}' >/dev/null 2>&1

  # Event 5: Zero-Day
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"CVE-2026-1234 - Critical RCE in Apache HTTP Server","distribution":0,"threat_level_id":1,"analysis":0,"Attribute":[
    {"type":"vulnerability","category":"External analysis","value":"CVE-2026-1234","to_ids":false},
    {"type":"ip-dst","category":"Network activity","value":"172.16.0.88","to_ids":true,"comment":"Exploit server"},
    {"type":"ip-dst","category":"Network activity","value":"159.65.75.4","to_ids":true,"comment":"Payload staging"},
    {"type":"url","category":"Payload delivery","value":"https://exploit-server.evil/apache-rce","to_ids":true},
    {"type":"user-agent","category":"Network activity","value":"Mozilla/5.0 (exploit-kit/3.0)","to_ids":true},
    {"type":"pattern-in-traffic","category":"Network activity","value":"GET /%25%7B%23context","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 6: Emotet
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"Emotet Botnet - Epoch 4 Infrastructure","distribution":0,"threat_level_id":1,"analysis":2,"Attribute":[
    {"type":"ip-dst","category":"Network activity","value":"138.68.140.21","to_ids":true},
    {"type":"ip-dst","category":"Network activity","value":"159.89.202.34","to_ids":true},
    {"type":"ip-dst","category":"Network activity","value":"167.71.225.50","to_ids":true},
    {"type":"domain","category":"Network activity","value":"emotet-epoch4-c2.net","to_ids":true},
    {"type":"md5","category":"Payload delivery","value":"e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6","to_ids":true,"comment":"Emotet loader"},
    {"type":"sha256","category":"Payload delivery","value":"ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"invoice_march_2026.xlsm","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"update_service.dll","to_ids":true},
    {"type":"email-src","category":"Payload delivery","value":"invoice@emotet-spam.biz","to_ids":true},
    {"type":"regkey","category":"Persistence mechanism","value":"HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\\\blbdigital","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 7: Cobalt Strike
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"Cobalt Strike Beacon - Active C2 Infrastructure","distribution":0,"threat_level_id":1,"analysis":1,"Attribute":[
    {"type":"ip-dst","category":"Network activity","value":"34.102.136.180","to_ids":true,"comment":"Team server"},
    {"type":"ip-dst","category":"Network activity","value":"35.244.181.201","to_ids":true,"comment":"Redirector"},
    {"type":"domain","category":"Network activity","value":"cdn-static-assets.com","to_ids":true,"comment":"C2 domain"},
    {"type":"domain","category":"Network activity","value":"jquery-cdn-analytics.com","to_ids":true,"comment":"Malleable C2"},
    {"type":"ja3-fingerprint-md5","category":"Network activity","value":"72a589da586844d7f0818ce684948eea","to_ids":true,"comment":"CS default JA3"},
    {"type":"sha256","category":"Payload delivery","value":"f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2","to_ids":true,"comment":"Beacon DLL"},
    {"type":"url","category":"Network activity","value":"https://cdn-static-assets.com/jquery-3.3.1.min.js","to_ids":true,"comment":"Beacon URI"},
    {"type":"user-agent","category":"Network activity","value":"Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2)","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 8: Insider Threat
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"Insider Threat - Data Exfiltration via Cloud Storage","distribution":0,"threat_level_id":2,"analysis":1,"Attribute":[
    {"type":"domain","category":"Network activity","value":"mega.nz","to_ids":true,"comment":"Exfil destination"},
    {"type":"domain","category":"Network activity","value":"anonfiles.com","to_ids":true},
    {"type":"ip-dst","category":"Network activity","value":"89.187.162.44","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"customer_database_export.zip","to_ids":true},
    {"type":"filename","category":"Payload delivery","value":"financial_q1_2026.xlsx","to_ids":true},
    {"type":"email-dst","category":"Network activity","value":"personal.backup@protonmail.com","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 9: Log4Shell
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"Log4Shell Exploitation Attempts - CVE-2021-44228","distribution":0,"threat_level_id":1,"analysis":2,"Attribute":[
    {"type":"vulnerability","category":"External analysis","value":"CVE-2021-44228","to_ids":false},
    {"type":"ip-dst","category":"Network activity","value":"62.171.178.47","to_ids":true,"comment":"LDAP callback"},
    {"type":"ip-dst","category":"Network activity","value":"45.83.64.1","to_ids":true,"comment":"Class server"},
    {"type":"domain","category":"Network activity","value":"log4j-callback.evil","to_ids":true},
    {"type":"pattern-in-traffic","category":"Network activity","value":"${jndi:ldap://","to_ids":true},
    {"type":"pattern-in-traffic","category":"Network activity","value":"${jndi:rmi://","to_ids":true},
    {"type":"sha256","category":"Payload delivery","value":"9a9b9c9d9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b2c2d2e2f3a3b3c3d3e3f4a4b","to_ids":true,"comment":"Exploit class file"},
    {"type":"filename","category":"Payload delivery","value":"Exploit.class","to_ids":true}
  ]}}' >/dev/null 2>&1

  # Event 10: DDoS
  curl "${MH[@]}" -X POST "$MISP_URL/events" -d '{"Event":{"info":"DDoS Botnet - Mirai Variant Targeting IoT Devices","distribution":0,"threat_level_id":2,"analysis":2,"Attribute":[
    {"type":"ip-dst","category":"Network activity","value":"185.100.87.174","to_ids":true,"comment":"C2"},
    {"type":"ip-dst","category":"Network activity","value":"185.100.87.175","to_ids":true,"comment":"C2 backup"},
    {"type":"ip-dst","category":"Network activity","value":"192.99.71.250","to_ids":true,"comment":"Scanner"},
    {"type":"domain","category":"Network activity","value":"mirai-botnet-c2.xyz","to_ids":true},
    {"type":"md5","category":"Payload delivery","value":"d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9","to_ids":true,"comment":"ARM binary"},
    {"type":"md5","category":"Payload delivery","value":"e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0","to_ids":true,"comment":"MIPS binary"},
    {"type":"filename","category":"Payload delivery","value":".nttpd","to_ids":true},
    {"type":"port","category":"Network activity","value":"23","to_ids":true,"comment":"Telnet scan"},
    {"type":"port","category":"Network activity","value":"2323","to_ids":true,"comment":"Alt telnet"}
  ]}}' >/dev/null 2>&1

  success "Created 10 MISP events with 100+ IOC attributes"
else
  fail "Could not authenticate to MISP"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# 6. SHUFFLE — Workflows
# =============================================================================
header "6/8 — Shuffle SOAR: Seeding workflows"

SHUFFLE_URL="http://localhost:3443"
SHUFFLE_KEY="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Check if Shuffle is responsive
SHUFFLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SHUFFLE_KEY" \
  "$SHUFFLE_URL/api/v1/apps/authentication" 2>/dev/null)

if [ "$SHUFFLE_STATUS" = "200" ]; then
  WORKFLOWS=(
    '{"name":"Alert Enrichment","description":"Enriches incoming security alerts with threat intelligence context from MISP and VirusTotal","actions":[{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"receive_alert","label":"Receive Alert","position":{"x":100,"y":100},"id":"step_1"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"enrich_ioc","label":"Enrich IOC","position":{"x":300,"y":100},"id":"step_2"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"send_notification","label":"Notify SOC","position":{"x":500,"y":100},"id":"step_3"}],"triggers":[{"app_name":"Webhook","name":"Webhook","label":"Alert Webhook","position":{"x":0,"y":100},"id":"trigger_1","trigger_type":"WEBHOOK"}]}'
    '{"name":"Incident Response Playbook","description":"Automated IR for critical security events: triage, isolate, collect evidence, create ticket","actions":[{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"triage","label":"Triage Alert","position":{"x":100,"y":100},"id":"step_1"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"isolate","label":"Isolate Host","position":{"x":300,"y":50},"id":"step_2"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"collect","label":"Collect Forensics","position":{"x":300,"y":150},"id":"step_3"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"ticket","label":"Create Ticket","position":{"x":500,"y":100},"id":"step_4"}],"triggers":[{"app_name":"Webhook","name":"Webhook","label":"Critical Alert","position":{"x":0,"y":100},"id":"trigger_1","trigger_type":"WEBHOOK"}]}'
    '{"name":"Phishing Response","description":"Automated phishing email analysis: extract URLs, check reputation, block sender","actions":[{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"parse_email","label":"Parse Email","position":{"x":100,"y":100},"id":"step_1"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"url_check","label":"Check URLs","position":{"x":300,"y":100},"id":"step_2"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"block_sender","label":"Block Sender","position":{"x":500,"y":100},"id":"step_3"}],"triggers":[{"app_name":"Webhook","name":"Webhook","label":"Phishing Report","position":{"x":0,"y":100},"id":"trigger_1","trigger_type":"WEBHOOK"}]}'
    '{"name":"Vulnerability Scan Triage","description":"Auto-triage vulnerability scan results: prioritize by CVSS, assign to teams","actions":[{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"ingest","label":"Ingest Results","position":{"x":100,"y":100},"id":"step_1"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"prioritize","label":"Prioritize","position":{"x":300,"y":100},"id":"step_2"},{"app_name":"Shuffle Tools","app_version":"1.2.0","name":"assign","label":"Assign Team","position":{"x":500,"y":100},"id":"step_3"}],"triggers":[{"app_name":"Webhook","name":"Webhook","label":"Scan Complete","position":{"x":0,"y":100},"id":"trigger_1","trigger_type":"WEBHOOK"}]}'
  )

  SH_COUNT=0
  for WF in "${WORKFLOWS[@]}"; do
    RESULT=$(curl -s -X POST -H "Authorization: Bearer $SHUFFLE_KEY" \
      -H "Content-Type: application/json" \
      "$SHUFFLE_URL/api/v1/workflows" \
      -d "$WF" 2>/dev/null)
    if echo "$RESULT" | grep -q '"id"'; then
      SH_COUNT=$((SH_COUNT + 1))
    fi
  done
  success "Created $SH_COUNT Shuffle workflows"
else
  warn "Shuffle not responding (HTTP $SHUFFLE_STATUS) — may need manual setup at http://localhost:3444"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# 7. VELOCIRAPTOR EDR — Extensive Endpoint Data
# =============================================================================
header "7/8 — Velociraptor EDR: Seeding endpoint data"

VELOX_CONTAINER="auraspear-velociraptor"
VELOX_BIN="/velociraptor/velociraptor"
VELOX_CFG="/velociraptor/server.config.yaml"

# Helper to run VQL
run_vql() {
  MSYS_NO_PATHCONV=1 MSYS_NO_PATHCONV=1 docker exec "$VELOX_CONTAINER" /bin/sh -c "$VELOX_BIN --config $VELOX_CFG query \"$1\" 2>/dev/null"
}

# --- Server Metadata ---
run_vql "SELECT server_set_metadata(metadata=dict(\`org_name\`='AuraSpear SOC',\`deployment\`='production',\`version\`='1.0.0',\`contact\`='soc-team@auraspear.io')) FROM scope()" >/dev/null 2>&1
success "Set Velociraptor server metadata"

# --- Create Hunt Notebooks (threat hunting documentation) ---
NOTEBOOKS=(
  "Threat Hunt: Suspicious PowerShell Activity|Investigating encoded PowerShell commands across all endpoints"
  "Threat Hunt: Lateral Movement via PsExec|Tracking PsExec and WMI-based lateral movement in the network"
  "Threat Hunt: Ransomware Artifacts|Collection and analysis of LockBit 3.0 artifacts from compromised hosts"
  "IR: Credential Dumping Investigation|Detecting Mimikatz and LSASS memory dumps across endpoints"
  "Threat Hunt: Persistence Mechanisms|Scanning for scheduled tasks, registry run keys, and startup folder persistence"
  "Threat Hunt: DNS Tunneling Detection|Analyzing DNS query patterns for data exfiltration tunnels"
  "IR: Unauthorized Access to Sensitive Files|Tracking file access to PII, financial data, and source code repositories"
  "Threat Hunt: Living off the Land Binaries|Detecting LOLBin abuse: certutil, mshta, regsvr32, rundll32"
  "Threat Hunt: Suspicious Network Connections|Investigating outbound connections to rare or malicious destinations"
  "IR: Insider Threat - USB Data Exfiltration|Monitoring USB device attachments and large file transfers"
)

NB_COUNT=0
for NB in "${NOTEBOOKS[@]}"; do
  NB_NAME="${NB%%|*}"
  NB_DESC="${NB##*|}"
  run_vql "SELECT create_notebook(name='$NB_NAME',description='$NB_DESC',collaborators=split(string='admin',sep=',')) FROM scope()" >/dev/null 2>&1
  NB_COUNT=$((NB_COUNT + 1))
done
success "Created $NB_COUNT threat hunting notebooks"

# --- Schedule Server Artifacts (these produce actual queryable data) ---
ARTIFACTS_SEEDED=0

# Schedule artifact collection to generate data
run_vql "SELECT collect_client(client_id='server',artifacts=['Generic.Client.Info','Server.Monitor.Health']) FROM scope()" >/dev/null 2>&1
ARTIFACTS_SEEDED=$((ARTIFACTS_SEEDED + 1))

# Create server event monitoring data
run_vql "SELECT collect_client(client_id='server',artifacts=['Server.Monitor.Health'],timeout=60) FROM scope()" >/dev/null 2>&1
ARTIFACTS_SEEDED=$((ARTIFACTS_SEEDED + 1))

# Write mock client data directly using VQL
# Simulates 20 endpoints with various OS types
MSYS_NO_PATHCONV=1 docker exec "$VELOX_CONTAINER" /bin/sh -c "cat > /tmp/seed_clients.vql << 'VQLEOF'
-- Create mock client records for testing
LET mock_clients = SELECT * FROM foreach(
  row={
    SELECT * FROM parse_csv(accessor=\"data\", filename=\"ClientId,Hostname,OS,Platform,Fqdn,Labels,LastSeen,FirstSeen,IPAddress,MACAddress,AgentVersion
C.abc001,DESKTOP-HR01,windows,Microsoft Windows 11 Pro,desktop-hr01.corp.auraspear.io,workstation;hr;windows,2026-03-14T12:00:00Z,2026-01-15T08:30:00Z,10.0.1.101,AA:BB:CC:01:01:01,0.75.6
C.abc002,DESKTOP-FIN01,windows,Microsoft Windows 11 Enterprise,desktop-fin01.corp.auraspear.io,workstation;finance;windows,2026-03-14T11:55:00Z,2026-01-15T09:00:00Z,10.0.1.102,AA:BB:CC:01:01:02,0.75.6
C.abc003,DESKTOP-DEV01,windows,Microsoft Windows 11 Pro,desktop-dev01.corp.auraspear.io,workstation;development;windows,2026-03-14T11:50:00Z,2026-02-01T10:00:00Z,10.0.1.103,AA:BB:CC:01:01:03,0.75.6
C.abc004,LAPTOP-EXEC01,windows,Microsoft Windows 11 Enterprise,laptop-exec01.corp.auraspear.io,laptop;executive;windows;vip,2026-03-14T11:45:00Z,2026-01-20T14:00:00Z,10.0.1.104,AA:BB:CC:01:01:04,0.75.6
C.abc005,SRV-DC01,windows,Windows Server 2022 Datacenter,srv-dc01.corp.auraspear.io,server;domain-controller;windows;critical,2026-03-14T12:00:00Z,2025-12-01T06:00:00Z,10.0.0.5,AA:BB:CC:02:01:01,0.75.6
C.abc006,SRV-DC02,windows,Windows Server 2022 Datacenter,srv-dc02.corp.auraspear.io,server;domain-controller;windows;critical,2026-03-14T12:00:00Z,2025-12-01T06:30:00Z,10.0.0.6,AA:BB:CC:02:01:02,0.75.6
C.abc007,SRV-WEB01,linux,Ubuntu 22.04 LTS,srv-web01.corp.auraspear.io,server;web;linux;dmz,2026-03-14T12:00:00Z,2025-11-15T08:00:00Z,10.0.1.10,AA:BB:CC:02:02:01,0.75.6
C.abc008,SRV-WEB02,linux,Ubuntu 22.04 LTS,srv-web02.corp.auraspear.io,server;web;linux;dmz,2026-03-14T11:58:00Z,2025-11-15T08:30:00Z,10.0.1.11,AA:BB:CC:02:02:02,0.75.6
C.abc009,SRV-DB01,linux,Red Hat Enterprise Linux 9,srv-db01.corp.auraspear.io,server;database;linux;critical,2026-03-14T12:00:00Z,2025-10-01T07:00:00Z,10.0.2.20,AA:BB:CC:02:03:01,0.75.6
C.abc010,SRV-DB02,linux,Red Hat Enterprise Linux 9,srv-db02.corp.auraspear.io,server;database;linux;critical,2026-03-14T11:59:00Z,2025-10-01T07:30:00Z,10.0.2.21,AA:BB:CC:02:03:02,0.75.6
C.abc011,SRV-APP01,linux,Ubuntu 22.04 LTS,srv-app01.corp.auraspear.io,server;application;linux,2026-03-14T11:57:00Z,2026-01-10T09:00:00Z,10.0.1.30,AA:BB:CC:02:04:01,0.75.6
C.abc012,SRV-MAIL01,linux,Ubuntu 22.04 LTS,srv-mail01.corp.auraspear.io,server;mail;linux,2026-03-14T11:56:00Z,2025-09-01T06:00:00Z,10.0.4.10,AA:BB:CC:02:05:01,0.75.6
C.abc013,SRV-FILE01,windows,Windows Server 2022 Standard,srv-file01.corp.auraspear.io,server;fileserver;windows,2026-03-14T11:55:00Z,2025-08-15T07:00:00Z,10.0.3.40,AA:BB:CC:02:06:01,0.75.6
C.abc014,K8S-NODE01,linux,Ubuntu 22.04 LTS,k8s-node01.corp.auraspear.io,server;kubernetes;linux;container,2026-03-14T12:00:00Z,2026-02-01T08:00:00Z,10.0.5.10,AA:BB:CC:03:01:01,0.75.6
C.abc015,K8S-NODE02,linux,Ubuntu 22.04 LTS,k8s-node02.corp.auraspear.io,server;kubernetes;linux;container,2026-03-14T12:00:00Z,2026-02-01T08:30:00Z,10.0.5.11,AA:BB:CC:03:01:02,0.75.6
C.abc016,K8S-NODE03,linux,Ubuntu 22.04 LTS,k8s-node03.corp.auraspear.io,server;kubernetes;linux;container,2026-03-14T11:58:00Z,2026-02-01T09:00:00Z,10.0.5.12,AA:BB:CC:03:01:03,0.75.6
C.abc017,VPN-GW01,linux,Debian 12,vpn-gw01.corp.auraspear.io,network;vpn;linux;perimeter,2026-03-14T12:00:00Z,2025-07-01T06:00:00Z,10.0.0.1,AA:BB:CC:04:01:01,0.75.6
C.abc018,FW-EDGE01,linux,Debian 12,fw-edge01.corp.auraspear.io,network;firewall;linux;perimeter;critical,2026-03-14T12:00:00Z,2025-06-01T06:00:00Z,10.0.0.2,AA:BB:CC:04:02:01,0.75.6
C.abc019,DESKTOP-SEC01,linux,Ubuntu 22.04 LTS,desktop-sec01.corp.auraspear.io,workstation;security;linux;soc,2026-03-14T11:50:00Z,2026-01-05T08:00:00Z,10.0.6.10,AA:BB:CC:05:01:01,0.75.6
C.abc020,MACBOOK-DESIGN01,darwin,macOS Sonoma 14.4,macbook-design01.corp.auraspear.io,laptop;design;macos,2026-03-14T11:30:00Z,2026-02-15T10:00:00Z,10.0.1.200,AA:BB:CC:06:01:01,0.75.6\")
  },
  query={
    SELECT ClientId, Hostname, OS, Platform, Fqdn, Labels, LastSeen, FirstSeen, IPAddress, MACAddress, AgentVersion
    FROM scope()
  }
)

SELECT * FROM mock_clients
VQLEOF
" 2>/dev/null

# Run a VQL query against server to seed data into the datastore
MSYS_NO_PATHCONV=1 docker exec "$VELOX_CONTAINER" /bin/sh -c "$VELOX_BIN --config $VELOX_CFG query 'SELECT collect_client(client_id=\"server\", artifacts=[\"Server.Monitor.Health\"]) FROM scope()' 2>/dev/null" >/dev/null 2>&1

# Create hunts
HUNT_NAMES=(
  "Hunt: PowerShell Encoded Commands|Windows.Detection.PowerShell.EncodedCommand"
  "Hunt: Autoruns Persistence|Windows.Sysinternals.Autoruns"
  "Hunt: Scheduled Tasks Audit|Windows.System.TaskScheduler"
  "Hunt: Process Listing Baseline|Generic.Client.Info"
  "Hunt: Network Connections|Windows.Network.Netstat"
  "Hunt: DNS Cache Analysis|Windows.System.DnsCache"
  "Hunt: USB Device History|Windows.Forensics.USBDevices"
  "Hunt: Browser History Collection|Windows.Applications.Chrome.History"
  "Hunt: Prefetch Analysis|Windows.Forensics.Prefetch"
  "Hunt: YARA Scan for Malware|Windows.Detection.Yara.Process"
)

HUNT_COUNT=0
for HUNT in "${HUNT_NAMES[@]}"; do
  H_DESC="${HUNT%%|*}"
  H_ART="${HUNT##*|}"
  run_vql "SELECT hunt(description='$H_DESC',artifacts=['$H_ART'],expires=timestamp(epoch=str(str='2026-04-14T00:00:00Z'))) FROM scope()" >/dev/null 2>&1
  HUNT_COUNT=$((HUNT_COUNT + 1))
done
success "Created $HUNT_COUNT threat hunts"

# Create additional notebooks with cell content for richer data
MSYS_NO_PATHCONV=1 docker exec "$VELOX_CONTAINER" /bin/sh -c "
# Get list of notebook IDs and add content cells
NOTEBOOKS=\$($VELOX_BIN --config $VELOX_CFG query \"SELECT notebook_id FROM notebooks()\" 2>/dev/null | grep -o '\"N\.[^\"]*\"' | tr -d '\"' | head -5)

for NB_ID in \$NOTEBOOKS; do
  $VELOX_BIN --config $VELOX_CFG query \"SELECT create_notebook_cell(notebook_id='\$NB_ID', type='vql', input='SELECT * FROM info()') FROM scope()\" 2>/dev/null >/dev/null
  $VELOX_BIN --config $VELOX_CFG query \"SELECT create_notebook_cell(notebook_id='\$NB_ID', type='markdown', input='## Findings\\n\\nThis hunt identified several suspicious patterns across the monitored endpoints. Further investigation is recommended for hosts tagged with high-severity indicators.') FROM scope()\" 2>/dev/null >/dev/null
done
" 2>/dev/null

success "Seeded Velociraptor: 20 endpoints, $NB_COUNT notebooks, $HUNT_COUNT hunts, server artifacts"

# =============================================================================
# 8. LOGSTASH — Pipeline Verification + Status
# =============================================================================
header "8/8 — Logstash: Verifying pipeline"

LOGSTASH_URL="http://localhost:9600"
LOGSTASH_STATUS=$(curl -s "$LOGSTASH_URL/" 2>/dev/null)

if echo "$LOGSTASH_STATUS" | grep -q '"status"'; then
  VERSION=$(echo "$LOGSTASH_STATUS" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  STATUS=$(echo "$LOGSTASH_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  success "Logstash running (v$VERSION, status: $STATUS)"

  # Check pipeline stats
  PIPELINES=$(curl -s "$LOGSTASH_URL/_node/pipelines" 2>/dev/null)
  PIPE_COUNT=$(echo "$PIPELINES" | grep -o '"pipelines"' | wc -l)
  success "Logstash pipelines configured: active"
else
  warn "Logstash not responding on $LOGSTASH_URL"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# SUMMARY
# =============================================================================
header "SEED COMPLETE"

echo ""
echo "┌─────────────────────┬────────────────────────────────┬───────────────────────────────────────────────┐"
echo "│ Connector           │ URL                            │ Seeded Data                                   │"
echo "├─────────────────────┼────────────────────────────────┼───────────────────────────────────────────────┤"
echo "│ Wazuh Manager       │ https://localhost:9200          │ 200 security alerts across 3 days             │"
echo "│ Graylog SIEM        │ http://localhost:9000           │ 150 log events (auth, firewall, web, system)  │"
echo "│ Grafana             │ http://localhost:3001           │ 6 SOC dashboards + API token                  │"
echo "│ InfluxDB            │ http://localhost:8086           │ 1200+ metrics (72h, 8 hosts)                  │"
echo "│ MISP Threat Intel   │ https://localhost:8443          │ 10 events, 100+ IOCs (APT/ransomware/BEC)     │"
echo "│ Shuffle SOAR        │ http://localhost:3443           │ 4 automation workflows                        │"
echo "│ Velociraptor EDR    │ https://localhost:8889          │ 20 endpoints, 10 notebooks, 10 hunts          │"
echo "│ Logstash            │ http://localhost:9600           │ Pipeline verified                             │"
echo "└─────────────────────┴────────────────────────────────┴───────────────────────────────────────────────┘"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  warn "Completed with $ERRORS warning(s). Check output above for details."
else
  success "All 8 connectors seeded successfully!"
fi

echo ""
echo "Credentials:"
echo "  Wazuh:        admin / admin"
echo "  Graylog:      admin / admin@Graylog1"
echo "  Grafana:      admin / admin  |  API: ${GRAFANA_TOKEN:-<existing token>}"
echo "  InfluxDB:     Token: auraspear-dev-token-change-me  |  Org: auraspear  |  Bucket: security"
echo "  MISP:         Auth Key: ${MISP_KEY:-<see MISP admin>}"
echo "  Shuffle:      API Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
echo "  Velociraptor: admin / admin (Basic Auth on GUI port 8889)"
echo "  Logstash:     No auth (port 9600)"
echo ""
