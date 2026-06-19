#!/bin/sh
# Copy certs to a writable path and patch opensearch_dashboards.yml to reference it
CERT_SRC=/certs-shared
CERT_DST=/usr/share/wazuh-dashboard/certs
INSTALL_DIR=/usr/share/wazuh-dashboard

# Remove stale dir (may have restrictive perms from prior run)
rm -rf "$CERT_DST"
mkdir -p "$CERT_DST"
cp "$CERT_SRC/wazuh.dashboard.pem" "$CERT_DST/dashboard.pem"
cp "$CERT_SRC/wazuh.dashboard-key.pem" "$CERT_DST/dashboard-key.pem"
cp "$CERT_SRC/root-ca.pem" "$CERT_DST/root-ca.pem"
chmod 644 "$CERT_DST"/*
chmod 755 "$CERT_DST"

# Patch config to use the writable cert path
DASHBOARD_YML=$INSTALL_DIR/config/opensearch_dashboards.yml
if [ -f "$DASHBOARD_YML" ]; then
  sed -i 's|/etc/wazuh-dashboard/certs/|/usr/share/wazuh-dashboard/certs/|g' "$DASHBOARD_YML"
  # Point to the indexer container via Docker network hostname (handles both localhost and 127.0.0.1)
  sed -i 's|https://localhost:9200|https://wazuh-indexer:9200|g' "$DASHBOARD_YML"
  sed -i 's|https://127.0.0.1:9200|https://wazuh-indexer:9200|g' "$DASHBOARD_YML"
  sed -i 's|https://0.0.0.0:9200|https://wazuh-indexer:9200|g' "$DASHBOARD_YML"
  echo "Patched opensearch_dashboards.yml cert paths and indexer host"
fi

echo "Dashboard certs installed at $CERT_DST"

# Inline the original entrypoint logic (keystore + app config + start)
DASHBOARD_USERNAME="${DASHBOARD_USERNAME:-kibanaserver}"
DASHBOARD_PASSWORD="${DASHBOARD_PASSWORD:-kibanaserver}"

yes | $INSTALL_DIR/bin/opensearch-dashboards-keystore create --allow-root 2>/dev/null
echo "$DASHBOARD_USERNAME" | $INSTALL_DIR/bin/opensearch-dashboards-keystore add opensearch.username --stdin --allow-root 2>/dev/null
echo "$DASHBOARD_PASSWORD" | $INSTALL_DIR/bin/opensearch-dashboards-keystore add opensearch.password --stdin --allow-root 2>/dev/null

/wazuh_app_config.sh "$WAZUH_UI_REVISION" 2>/dev/null || true

exec $INSTALL_DIR/bin/opensearch-dashboards --allow-root -c $DASHBOARD_YML
