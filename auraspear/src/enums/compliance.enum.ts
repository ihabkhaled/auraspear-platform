export enum ComplianceStandard {
  ISO_27001 = 'iso_27001',
  NIST = 'nist',
  PCI_DSS = 'pci_dss',
  SOC2 = 'soc2',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
}

export enum ComplianceControlStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  NOT_ASSESSED = 'not_assessed',
  PARTIALLY_MET = 'partially_met',
}
