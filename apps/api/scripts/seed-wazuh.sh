#!/bin/bash
# =============================================================================
# AuraSpear SOC — Seed Wazuh Indexer with 10,000 Security Alerts
# =============================================================================
# Seeds realistic security alerts into the Wazuh Indexer (OpenSearch) across
# the last 7 days so threat hunting, alerts dashboard, and sync all work.
#
# Usage:
#   bash scripts/seed-wazuh.sh
#
# Prerequisites:
#   docker compose -f docker-compose.connectors.yml up -d
#   Wait ~60s for the Wazuh Indexer to initialize
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; }
header()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

WAZUH_URL="https://localhost:9200"
WAZUH_AUTH="admin:admin"
TARGET_TOTAL=10000
BATCH_SIZE=500
DAYS=7

header "Seeding Wazuh Indexer with ${TARGET_TOTAL} alerts across ${DAYS} days"

# ── Wait for Wazuh Indexer ──────────────────────────────────────────────────
echo "Checking Wazuh Indexer connectivity..."
for attempt in $(seq 1 15); do
  if curl -sk -u "$WAZUH_AUTH" "$WAZUH_URL/_cluster/health" >/dev/null 2>&1; then
    success "Wazuh Indexer is reachable"
    break
  fi
  echo "  Waiting for Wazuh Indexer... ($attempt/15)"
  sleep 4
  if [ "$attempt" -eq 15 ]; then
    fail "Could not connect to Wazuh Indexer at $WAZUH_URL"
    exit 1
  fi
done

# ── Alert templates ─────────────────────────────────────────────────────────

DESCS=(
  "SSH brute force attack detected"
  "SQL injection attempt on web application"
  "Rootkit detection: hidden process found"
  "Authentication failure — invalid credentials"
  "Malware signature detected in downloaded file"
  "XSS attack payload in HTTP request"
  "Privilege escalation via sudo abuse"
  "Network port scan from external IP"
  "Ransomware encryption behavior detected"
  "Command and control beacon communication"
  "Lateral movement via SMB/WMI"
  "Credential dumping using Mimikatz"
  "Web shell uploaded to public directory"
  "DLL sideloading in trusted application"
  "DNS tunneling exfiltration attempt"
  "Unauthorized registry modification for persistence"
  "PowerShell encoded command execution"
  "Suspicious scheduled task creation"
  "Process injection via WriteProcessMemory"
  "Large outbound data transfer detected"
  "Failed RDP login from external IP"
  "Anomalous DNS query volume spike"
  "USB device insertion on critical server"
  "Windows event log cleared by non-SYSTEM"
  "Phishing email with malicious attachment"
  "LDAP enumeration from non-service account"
  "TLS certificate mismatch detected"
  "Kerberoasting attack pattern identified"
  "Pass-the-hash authentication attempt"
  "Suspicious cron job created by root"
)

LEVELS=(12 14 15 10 13 14 12 10 15 10 12 15 14 12 11 13 14 12 15 11 10 13 14 12 15 11 13 14 15 12)

IDS=(
  "5763" "31103" "510" "5720" "52502" "31104" "5401" "4002" "87103" "87401"
  "92601" "92701" "31170" "93001" "87501" "5402" "5403" "5404" "92602" "87502"
  "5764" "87503" "5765" "5766" "31171" "92603" "31105" "92604" "92605" "5405"
)

GROUPS=(
  "authentication_failed,sshd"
  "web,attack,sql_injection"
  "rootcheck,rootkit"
  "authentication_failed"
  "virustotal,malware"
  "web,attack,xss"
  "syslog,sudo"
  "firewall,scan"
  "syscheck,ransomware"
  "network,c2"
  "lateral_movement,smb"
  "credential_access,mimikatz"
  "web,webshell"
  "defense_evasion,dll"
  "network,dns_tunneling"
  "persistence,registry"
  "execution,powershell"
  "persistence,scheduled_task"
  "defense_evasion,injection"
  "exfiltration,data_transfer"
  "authentication_failed,rdp"
  "anomaly,dns"
  "policy,usb"
  "defense_evasion,log_cleared"
  "phishing,email"
  "discovery,ldap"
  "network,tls"
  "credential_access,kerberoasting"
  "credential_access,pth"
  "persistence,cron"
)

AGENTS=("web-server-01" "web-server-02" "db-server-01" "db-server-02" "app-server-01" "app-server-02" "file-server-01" "dc-server-01" "dc-server-02" "mail-server-01" "vpn-gateway" "k8s-node-01" "k8s-node-02" "k8s-node-03" "proxy-01" "ids-sensor-01" "dns-server-01" "backup-server-01" "endpoint-win-01" "endpoint-win-02")
AGENT_IPS=("10.0.1.10" "10.0.1.11" "10.0.2.20" "10.0.2.21" "10.0.1.30" "10.0.1.31" "10.0.3.40" "10.0.0.5" "10.0.0.6" "10.0.4.10" "10.0.0.1" "10.0.5.10" "10.0.5.11" "10.0.5.12" "10.0.0.50" "10.0.6.10" "10.0.0.53" "10.0.7.10" "10.0.8.100" "10.0.8.101")

SRC_IPS=(
  "192.168.1.105" "203.0.113.42" "45.33.32.156" "185.220.101.1" "77.247.181.163"
  "91.189.92.11" "198.51.100.77" "172.16.0.88" "104.248.50.87" "159.89.173.104"
  "23.129.64.210" "176.10.99.200" "185.56.83.100" "5.188.86.250" "89.248.167.131"
  "46.166.139.111" "62.102.148.68" "194.88.105.5" "212.83.129.99" "95.216.107.148"
)

DST_USERS=("admin" "root" "jdoe" "svc_backup" "contractor01" "devops" "db_admin" "web_server" "marketing_intern" "ciso" "" "" "" "" "")

DECODERS=("sshd" "nginx-errorlog" "web-accesslog" "syslog" "ossec" "windows-eventlog" "suricata" "pam" "auditd" "iptables")

MITRE_IDS=("T1110" "T1190" "T1014" "T1078" "T1204" "T1189" "T1548" "T1046" "T1486" "T1071" "T1021" "T1003" "T1505" "T1574" "T1572" "T1547" "T1059" "T1053" "T1055" "T1041" "T1021.001" "T1071.001" "T1200" "T1070" "T1566" "T1087" "T1557" "T1558" "T1550" "T1168")

# ── Compute dynamic dates ───────────────────────────────────────────────────

DATES_INDEX=()
DATES_TS=()

for d in $(seq 0 $((DAYS - 1))); do
  IDX_DATE=$(date -d "-${d} days" +%Y.%m.%d 2>/dev/null || date -v-${d}d +%Y.%m.%d)
  TS_DATE=$(date -d "-${d} days" +%Y-%m-%d 2>/dev/null || date -v-${d}d +%Y-%m-%d)
  DATES_INDEX+=("$IDX_DATE")
  DATES_TS+=("$TS_DATE")
done

echo "Date range: ${DATES_TS[$((DAYS-1))]} to ${DATES_TS[0]}"

# ── Generate and seed alerts ────────────────────────────────────────────────

TMPFILE=$(mktemp)
TOTAL_SEEDED=0
ERRORS=0
DESC_COUNT=${#DESCS[@]}
AGENT_COUNT=${#AGENTS[@]}
SRC_COUNT=${#SRC_IPS[@]}
GROUP_COUNT=${#GROUPS[@]}
USER_COUNT=${#DST_USERS[@]}
DECODER_COUNT=${#DECODERS[@]}
MITRE_COUNT=${#MITRE_IDS[@]}

ALERTS_PER_DAY=$((TARGET_TOTAL / DAYS))
echo "Generating ~${ALERTS_PER_DAY} alerts per day (${TARGET_TOTAL} total)..."

for DAY_IDX in $(seq 0 $((DAYS - 1))); do
  INDEX="wazuh-alerts-4.x-${DATES_INDEX[$DAY_IDX]}"
  TS_BASE="${DATES_TS[$DAY_IDX]}"
  DAY_SEEDED=0

  # Generate in batches of BATCH_SIZE
  REMAINING=$ALERTS_PER_DAY
  BATCH_NUM=0

  while [ "$REMAINING" -gt 0 ]; do
    CURRENT_BATCH=$REMAINING
    if [ "$CURRENT_BATCH" -gt "$BATCH_SIZE" ]; then
      CURRENT_BATCH=$BATCH_SIZE
    fi

    > "$TMPFILE"

    for i in $(seq 0 $((CURRENT_BATCH - 1))); do
      GLOBAL_IDX=$((DAY_IDX * ALERTS_PER_DAY + BATCH_NUM * BATCH_SIZE + i))
      DI=$((GLOBAL_IDX % DESC_COUNT))
      AI=$((GLOBAL_IDX % AGENT_COUNT))
      SI=$((GLOBAL_IDX % SRC_COUNT))
      GI=$((GLOBAL_IDX % GROUP_COUNT))
      UI=$((GLOBAL_IDX % USER_COUNT))
      DECI=$((GLOBAL_IDX % DECODER_COUNT))
      MI=$((GLOBAL_IDX % MITRE_COUNT))

      H=$(( (GLOBAL_IDX * 7 + i * 3) % 24 ))
      M=$(( (GLOBAL_IDX * 13 + i * 7) % 60 ))
      S=$(( (GLOBAL_IDX * 17 + i * 11) % 60 ))
      MS=$(( (GLOBAL_IDX * 31) % 1000 ))

      SRCPORT=$((1024 + (GLOBAL_IDX * 37) % 64000))
      DSTPORT_POOL=(22 80 443 3389 445 8080 3306 5432 8443 53 25 110 143 993 995 1433 27017 6379 9200 5601)
      DSTPORT=${DSTPORT_POOL[$((GLOBAL_IDX % ${#DSTPORT_POOL[@]}))]}

      DSTUSER="${DST_USERS[$UI]}"
      DSTUSER_FIELD=""
      if [ -n "$DSTUSER" ]; then
        DSTUSER_FIELD=",\"dstuser\":\"$DSTUSER\""
      fi

      SRCUSER_POOL=("jdoe" "admin" "root" "svc_scan" "attacker" "unknown" "" "" "")
      SRCUSER="${SRCUSER_POOL[$((GLOBAL_IDX % ${#SRCUSER_POOL[@]}))]}"
      SRCUSER_FIELD=""
      if [ -n "$SRCUSER" ]; then
        SRCUSER_FIELD=",\"srcuser\":\"$SRCUSER\""
      fi

      echo "{\"index\":{\"_index\":\"$INDEX\"}}" >> "$TMPFILE"
      echo "{\"timestamp\":\"${TS_BASE}T$(printf '%02d' $H):$(printf '%02d' $M):$(printf '%02d' $S).$(printf '%03d' $MS)+0000\",\"rule\":{\"level\":${LEVELS[$DI]},\"description\":\"${DESCS[$DI]}\",\"id\":\"${IDS[$DI]}\",\"mitre\":{\"id\":[\"${MITRE_IDS[$MI]}\"]},\"groups\":[\"${GROUPS[$GI]}\"]},\"agent\":{\"id\":\"$(printf '%03d' $((AI+1)))\",\"name\":\"${AGENTS[$AI]}\",\"ip\":\"${AGENT_IPS[$AI]}\"},\"data\":{\"srcip\":\"${SRC_IPS[$SI]}\",\"dstip\":\"${AGENT_IPS[$AI]}\"${DSTUSER_FIELD}${SRCUSER_FIELD},\"srcport\":${SRCPORT},\"dstport\":${DSTPORT}},\"decoder\":{\"name\":\"${DECODERS[$DECI]}\"},\"manager\":{\"name\":\"wazuh-manager\"},\"id\":\"$(printf '%020d' $((1710000000 + GLOBAL_IDX)))\"}" >> "$TMPFILE"
    done

    RESULT=$(curl -sk -u "$WAZUH_AUTH" -X POST "$WAZUH_URL/_bulk" \
      -H "Content-Type: application/x-ndjson" \
      --data-binary "@$TMPFILE" 2>/dev/null)

    if echo "$RESULT" | grep -q '"errors":false'; then
      DAY_SEEDED=$((DAY_SEEDED + CURRENT_BATCH))
    else
      ERROR_COUNT=$(echo "$RESULT" | grep -o '"error"' | wc -l)
      if [ "$ERROR_COUNT" -eq 0 ]; then
        DAY_SEEDED=$((DAY_SEEDED + CURRENT_BATCH))
      else
        warn "  ${ERROR_COUNT} errors in batch for $INDEX"
        ERRORS=$((ERRORS + 1))
        # Still count partial success
        DAY_SEEDED=$((DAY_SEEDED + CURRENT_BATCH - ERROR_COUNT))
      fi
    fi

    REMAINING=$((REMAINING - CURRENT_BATCH))
    BATCH_NUM=$((BATCH_NUM + 1))
  done

  TOTAL_SEEDED=$((TOTAL_SEEDED + DAY_SEEDED))
  echo "  ${DATES_TS[$DAY_IDX]}: ${DAY_SEEDED} alerts → index ${INDEX}"
done

rm -f "$TMPFILE"

if [ "$ERRORS" -gt 0 ]; then
  warn "Completed with ${ERRORS} batch warnings"
else
  success "All batches succeeded"
fi

# ── Refresh indices for immediate searchability ─────────────────────────────

header "Refreshing indices"
curl -sk -u "$WAZUH_AUTH" -X POST "$WAZUH_URL/wazuh-alerts-*/_refresh" >/dev/null 2>&1
success "Indices refreshed"

# ── Verification ────────────────────────────────────────────────────────────

header "Verification"

COUNT_RESULT=$(curl -sk -u "$WAZUH_AUTH" "$WAZUH_URL/wazuh-alerts-*/_count" 2>/dev/null)
DOC_COUNT=$(echo "$COUNT_RESULT" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

echo "  Total documents in wazuh-alerts-* indices: ${DOC_COUNT:-unknown}"
echo "  Seeded this run: ${TOTAL_SEEDED}"

# Show per-index counts
for DAY_IDX in $(seq 0 $((DAYS - 1))); do
  INDEX="wazuh-alerts-4.x-${DATES_INDEX[$DAY_IDX]}"
  IDX_COUNT=$(curl -sk -u "$WAZUH_AUTH" "$WAZUH_URL/${INDEX}/_count" 2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
  echo "  ${INDEX}: ${IDX_COUNT:-0} documents"
done

if [ "${DOC_COUNT:-0}" -ge "$TARGET_TOTAL" ]; then
  success "Wazuh seeding complete! ${DOC_COUNT} alerts available for hunting."
else
  warn "Expected at least ${TARGET_TOTAL} alerts but found ${DOC_COUNT:-0}. Some batches may have failed."
fi
