#!/bin/sh
# Copy certs to the Java-security-allowed path under /usr/share/wazuh-indexer/
# then patch opensearch.yml to reference that path instead of /etc/wazuh-indexer/certs/
# Runs as root (user: 0:0 in docker-compose) so cert copy always succeeds
CERT_SRC=/certs-shared
CERT_DST=/usr/share/wazuh-indexer/certs

# Remove stale dir (may have restrictive perms from prior run)
rm -rf "$CERT_DST"
mkdir -p "$CERT_DST"

cp "$CERT_SRC/wazuh.indexer.pem" "$CERT_DST/indexer.pem"
cp "$CERT_SRC/wazuh.indexer-key.pem" "$CERT_DST/indexer-key.pem"
cp "$CERT_SRC/root-ca.pem" "$CERT_DST/root-ca.pem"
cp "$CERT_SRC/admin.pem" "$CERT_DST/admin.pem"
cp "$CERT_SRC/admin-key.pem" "$CERT_DST/admin-key.pem"
chmod 644 "$CERT_DST"/*.pem
chmod 755 "$CERT_DST"
chown -R 1000:1000 "$CERT_DST"

# Fix data dir ownership so indexer can write
chown -R 1000:1000 /var/lib/wazuh-indexer 2>/dev/null || true
chown -R 1000:1000 /var/log/wazuh-indexer 2>/dev/null || true

# Patch opensearch.yml: redirect cert paths from /etc/ to the Java-allowed /usr/share/ tree
OPENSEARCH_YML=/usr/share/wazuh-indexer/opensearch.yml
if [ -f "$OPENSEARCH_YML" ]; then
  sed -i 's|/etc/wazuh-indexer/certs/|/usr/share/wazuh-indexer/certs/|g' "$OPENSEARCH_YML"
  echo "Patched opensearch.yml cert paths"
fi

echo "Indexer certs installed at $CERT_DST"

# Run securityadmin in background after indexer starts (only on first boot)
# This initializes the .opendistro_security index with internal users, roles, etc.
SECURITY_INIT_MARKER=/var/lib/wazuh-indexer/.security_initialized
if [ ! -f "$SECURITY_INIT_MARKER" ]; then
  (
    echo "Waiting for indexer to become ready before initializing security..."
    sleep 30
    for i in $(seq 1 12); do
      if curl -sk https://localhost:9200/ >/dev/null 2>&1; then
        echo "Indexer is up, running securityadmin..."
        export JAVA_HOME=/usr/share/wazuh-indexer/jdk
        bash /usr/share/wazuh-indexer/plugins/opensearch-security/tools/securityadmin.sh \
          -cd /usr/share/wazuh-indexer/opensearch-security/ \
          -nhnv \
          -cacert "$CERT_DST/root-ca.pem" \
          -cert "$CERT_DST/admin.pem" \
          -key "$CERT_DST/admin-key.pem" \
          -icl -h localhost && touch "$SECURITY_INIT_MARKER"
        break
      fi
      echo "Indexer not ready yet, retrying in 10s..."
      sleep 10
    done
  ) &
fi

exec /entrypoint.sh
