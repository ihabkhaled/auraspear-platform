import {
  mapSeverityToOcsf,
  mapAlertToOcsfFinding,
  buildOcsfMetadata,
  OcsfSeverity,
  OcsfCategory,
  OcsfClassUid,
} from '../../src/common/ocsf'

describe('OCSF Mapper', () => {
  describe('mapSeverityToOcsf', () => {
    it('maps critical', () => {
      expect(mapSeverityToOcsf('critical')).toBe(OcsfSeverity.CRITICAL)
    })

    it('maps high', () => {
      expect(mapSeverityToOcsf('high')).toBe(OcsfSeverity.HIGH)
    })

    it('maps medium', () => {
      expect(mapSeverityToOcsf('medium')).toBe(OcsfSeverity.MEDIUM)
    })

    it('maps low', () => {
      expect(mapSeverityToOcsf('low')).toBe(OcsfSeverity.LOW)
    })

    it('maps info', () => {
      expect(mapSeverityToOcsf('info')).toBe(OcsfSeverity.INFORMATIONAL)
    })

    it('maps informational', () => {
      expect(mapSeverityToOcsf('informational')).toBe(OcsfSeverity.INFORMATIONAL)
    })

    it('maps unknown severity to UNKNOWN', () => {
      expect(mapSeverityToOcsf('foo')).toBe(OcsfSeverity.UNKNOWN)
    })

    it('handles case insensitivity', () => {
      expect(mapSeverityToOcsf('CRITICAL')).toBe(OcsfSeverity.CRITICAL)
      expect(mapSeverityToOcsf('High')).toBe(OcsfSeverity.HIGH)
      expect(mapSeverityToOcsf('MeDiUm')).toBe(OcsfSeverity.MEDIUM)
    })
  })

  describe('buildOcsfMetadata', () => {
    it('creates metadata with product info', () => {
      const meta = buildOcsfMetadata('Wazuh', 'Wazuh Inc.', 'tenant-1', 'event-1')
      expect(meta.version).toBe('1.3.0')
      expect(meta.product.name).toBe('Wazuh')
      expect(meta.product.vendor_name).toBe('Wazuh Inc.')
      expect(meta.tenant_uid).toBe('tenant-1')
      expect(meta.uid).toBe('event-1')
    })

    it('creates metadata without optional fields', () => {
      const meta = buildOcsfMetadata('Graylog', 'Graylog Inc.')
      expect(meta.version).toBe('1.3.0')
      expect(meta.product.name).toBe('Graylog')
      expect(meta.tenant_uid).toBeUndefined()
      expect(meta.uid).toBeUndefined()
    })
  })

  describe('mapAlertToOcsfFinding', () => {
    it('maps a basic alert to OCSF finding', () => {
      const finding = mapAlertToOcsfFinding({
        title: 'Suspicious login detected',
        description: 'Multiple failed logins',
        severity: 'high',
        timestamp: '2026-03-18T08:00:00Z',
        source: { product: 'Wazuh', vendor: 'Wazuh Inc.' },
        tenantId: 'tenant-1',
        eventId: 'alert-001',
      })

      expect(finding.category_uid).toBe(OcsfCategory.FINDINGS)
      expect(finding.class_uid).toBe(OcsfClassUid.SECURITY_FINDING)
      expect(finding.severity_id).toBe(OcsfSeverity.HIGH)
      expect(finding.message).toBe('Suspicious login detected')
      expect(finding.finding_info?.title).toBe('Suspicious login detected')
      expect(finding.finding_info?.desc).toBe('Multiple failed logins')
      expect(finding.metadata.product.name).toBe('Wazuh')
      expect(finding.metadata.tenant_uid).toBe('tenant-1')
      expect(finding.metadata.uid).toBe('alert-001')
    })

    it('includes MITRE mapping when provided', () => {
      const finding = mapAlertToOcsfFinding({
        title: 'Test',
        severity: 'medium',
        timestamp: '2026-03-18T08:00:00Z',
        source: { product: 'Test', vendor: 'Test' },
        mitreTacticId: 'TA0001',
        mitreTacticName: 'Initial Access',
        mitreTechniqueId: 'T1566',
        mitreTechniqueName: 'Phishing',
      })

      expect(finding.attacks).toHaveLength(1)
      expect(finding.attacks?.[0]?.technique.uid).toBe('T1566')
      expect(finding.attacks?.[0]?.technique.name).toBe('Phishing')
      expect(finding.attacks?.[0]?.tactic.uid).toBe('TA0001')
      expect(finding.attacks?.[0]?.tactic.name).toBe('Initial Access')
    })

    it('excludes MITRE mapping when not provided', () => {
      const finding = mapAlertToOcsfFinding({
        title: 'Test',
        severity: 'low',
        timestamp: '2026-03-18T08:00:00Z',
        source: { product: 'Test', vendor: 'Test' },
      })

      expect(finding.attacks).toBeUndefined()
    })

    it('includes resources when affectedAsset is provided', () => {
      const finding = mapAlertToOcsfFinding({
        title: 'Test',
        severity: 'high',
        timestamp: '2026-03-18T08:00:00Z',
        source: { product: 'Test', vendor: 'Test' },
        affectedAsset: 'web-server-01',
      })

      expect(finding.resources).toHaveLength(1)
      expect(finding.resources?.[0]?.name).toBe('web-server-01')
      expect(finding.resources?.[0]?.type).toBe('host')
    })

    it('excludes resources when affectedAsset is not provided', () => {
      const finding = mapAlertToOcsfFinding({
        title: 'Test',
        severity: 'low',
        timestamp: '2026-03-18T08:00:00Z',
        source: { product: 'Test', vendor: 'Test' },
      })

      expect(finding.resources).toBeUndefined()
    })

    it('stores raw data when provided', () => {
      const rawData = '{"original": "event"}'
      const finding = mapAlertToOcsfFinding({
        title: 'Test',
        severity: 'medium',
        timestamp: '2026-03-18T08:00:00Z',
        source: { product: 'Test', vendor: 'Test' },
        rawData,
      })

      expect(finding.raw_data).toBe(rawData)
    })
  })
})
