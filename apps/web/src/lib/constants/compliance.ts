import { ComplianceStandard, ComplianceControlStatus } from '@/enums'

export const COMPLIANCE_STANDARD_LABEL_KEYS: Record<ComplianceStandard, string> = {
  [ComplianceStandard.ISO_27001]: 'standardIso27001',
  [ComplianceStandard.NIST]: 'standardNist',
  [ComplianceStandard.PCI_DSS]: 'standardPciDss',
  [ComplianceStandard.SOC2]: 'standardSoc2',
  [ComplianceStandard.HIPAA]: 'standardHipaa',
  [ComplianceStandard.GDPR]: 'standardGdpr',
}

export const COMPLIANCE_STANDARD_CLASSES: Record<ComplianceStandard, string> = {
  [ComplianceStandard.ISO_27001]: 'bg-primary text-white',
  [ComplianceStandard.NIST]: 'bg-status-info text-white',
  [ComplianceStandard.PCI_DSS]: 'bg-status-warning text-white',
  [ComplianceStandard.SOC2]: 'bg-status-success text-white',
  [ComplianceStandard.HIPAA]: 'bg-severity-high text-white',
  [ComplianceStandard.GDPR]: 'bg-severity-medium text-white',
}

export const COMPLIANCE_CONTROL_STATUS_LABEL_KEYS: Record<ComplianceControlStatus, string> = {
  [ComplianceControlStatus.PASSED]: 'controlPassed',
  [ComplianceControlStatus.FAILED]: 'controlFailed',
  [ComplianceControlStatus.NOT_ASSESSED]: 'controlNotAssessed',
  [ComplianceControlStatus.PARTIALLY_MET]: 'controlPartiallyMet',
}

export const COMPLIANCE_CONTROL_STATUS_CLASSES: Record<ComplianceControlStatus, string> = {
  [ComplianceControlStatus.PASSED]: 'bg-status-success text-white',
  [ComplianceControlStatus.FAILED]: 'bg-status-error text-white',
  [ComplianceControlStatus.NOT_ASSESSED]: 'bg-muted text-muted-foreground',
  [ComplianceControlStatus.PARTIALLY_MET]: 'bg-status-warning text-white',
}
