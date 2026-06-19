import { describe, it, expect } from 'vitest'
import { AiAgentStatus, AiAgentTier, AiAgentSessionStatus } from '@/enums/ai-agent.enum'
import { AttackPathSeverity, AttackPathStatus } from '@/enums/attack-path.enum'
import {
  CloudProvider,
  CloudAccountStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
} from '@/enums/cloud-security.enum'
import { ComplianceStandard, ComplianceControlStatus } from '@/enums/compliance.enum'
import { RuleSource, RuleSeverity, RuleStatus } from '@/enums/correlation.enum'
import {
  DetectionRuleType,
  DetectionRuleSeverity,
  DetectionRuleStatus,
} from '@/enums/detection-rule.enum'
import {
  IncidentSeverity,
  IncidentStatus,
  IncidentCategory,
  IncidentActorType,
} from '@/enums/incident.enum'
import { NormalizationSourceType, NormalizationPipelineStatus } from '@/enums/normalization.enum'
import { ReportType, ReportFormat, ReportStatus } from '@/enums/report.enum'
import { SoarPlaybookStatus, SoarTriggerType, SoarExecutionStatus } from '@/enums/soar.enum'
import { ServiceType, HealthCheckStatus, MetricType } from '@/enums/system-health.enum'
import {
  UebaEntityType,
  UebaRiskLevel,
  MlModelStatus,
  MlModelType,
  UebaTab,
} from '@/enums/ueba.enum'
import { VulnerabilitySeverity, PatchStatus } from '@/enums/vulnerability.enum'

// ─── Incident Enums ──────────────────────────────────────────

describe('IncidentSeverity', () => {
  it('should have correct values', () => {
    expect(IncidentSeverity.CRITICAL).toBe('critical')
    expect(IncidentSeverity.HIGH).toBe('high')
    expect(IncidentSeverity.MEDIUM).toBe('medium')
    expect(IncidentSeverity.LOW).toBe('low')
  })

  it('should only have 4 values', () => {
    expect(Object.values(IncidentSeverity)).toHaveLength(4)
  })

  it('should contain all expected values', () => {
    const values = Object.values(IncidentSeverity)
    expect(values).toContain('critical')
    expect(values).toContain('high')
    expect(values).toContain('medium')
    expect(values).toContain('low')
  })
})

describe('IncidentStatus', () => {
  it('should have correct values', () => {
    expect(IncidentStatus.OPEN).toBe('open')
    expect(IncidentStatus.IN_PROGRESS).toBe('in_progress')
    expect(IncidentStatus.CONTAINED).toBe('contained')
    expect(IncidentStatus.RESOLVED).toBe('resolved')
    expect(IncidentStatus.CLOSED).toBe('closed')
  })

  it('should only have 5 values', () => {
    expect(Object.values(IncidentStatus)).toHaveLength(5)
  })

  it('should contain all expected values', () => {
    const values = Object.values(IncidentStatus)
    expect(values).toContain('open')
    expect(values).toContain('in_progress')
    expect(values).toContain('contained')
    expect(values).toContain('resolved')
    expect(values).toContain('closed')
  })
})

describe('IncidentCategory', () => {
  it('should have correct values', () => {
    expect(IncidentCategory.INTRUSION).toBe('intrusion')
    expect(IncidentCategory.INSIDER).toBe('insider')
    expect(IncidentCategory.BRUTE_FORCE).toBe('brute_force')
    expect(IncidentCategory.EXFILTRATION).toBe('exfiltration')
    expect(IncidentCategory.MALWARE).toBe('malware')
    expect(IncidentCategory.CLOUD).toBe('cloud')
    expect(IncidentCategory.PHISHING).toBe('phishing')
    expect(IncidentCategory.DOS).toBe('dos')
    expect(IncidentCategory.OTHER).toBe('other')
  })

  it('should only have 9 values', () => {
    expect(Object.values(IncidentCategory)).toHaveLength(9)
  })
})

describe('IncidentActorType', () => {
  it('should have correct values', () => {
    expect(IncidentActorType.USER).toBe('user')
    expect(IncidentActorType.AI_AGENT).toBe('ai_agent')
    expect(IncidentActorType.SYSTEM).toBe('system')
  })

  it('should only have 3 values', () => {
    expect(Object.values(IncidentActorType)).toHaveLength(3)
  })
})

// ─── Correlation Enums ───────────────────────────────────────

describe('RuleSource', () => {
  it('should have correct values', () => {
    expect(RuleSource.SIGMA).toBe('sigma')
    expect(RuleSource.CUSTOM).toBe('custom')
    expect(RuleSource.AI_GENERATED).toBe('ai_generated')
  })

  it('should only have 3 values', () => {
    expect(Object.values(RuleSource)).toHaveLength(3)
  })

  it('should contain all expected values', () => {
    const values = Object.values(RuleSource)
    expect(values).toContain('sigma')
    expect(values).toContain('custom')
    expect(values).toContain('ai_generated')
  })
})

describe('RuleSeverity', () => {
  it('should have correct values', () => {
    expect(RuleSeverity.CRITICAL).toBe('critical')
    expect(RuleSeverity.HIGH).toBe('high')
    expect(RuleSeverity.MEDIUM).toBe('medium')
    expect(RuleSeverity.LOW).toBe('low')
    expect(RuleSeverity.INFO).toBe('info')
  })

  it('should only have 5 values', () => {
    expect(Object.values(RuleSeverity)).toHaveLength(5)
  })
})

describe('RuleStatus', () => {
  it('should have correct values', () => {
    expect(RuleStatus.ACTIVE).toBe('active')
    expect(RuleStatus.REVIEW).toBe('review')
    expect(RuleStatus.DISABLED).toBe('disabled')
  })

  it('should only have 3 values', () => {
    expect(Object.values(RuleStatus)).toHaveLength(3)
  })
})

// ─── Vulnerability Enums ─────────────────────────────────────

describe('VulnerabilitySeverity', () => {
  it('should have correct values', () => {
    expect(VulnerabilitySeverity.CRITICAL).toBe('critical')
    expect(VulnerabilitySeverity.HIGH).toBe('high')
    expect(VulnerabilitySeverity.MEDIUM).toBe('medium')
    expect(VulnerabilitySeverity.LOW).toBe('low')
    expect(VulnerabilitySeverity.INFO).toBe('info')
  })

  it('should only have 5 values', () => {
    expect(Object.values(VulnerabilitySeverity)).toHaveLength(5)
  })
})

describe('PatchStatus', () => {
  it('should have correct values', () => {
    expect(PatchStatus.PATCH_PENDING).toBe('patch_pending')
    expect(PatchStatus.PATCHING).toBe('patching')
    expect(PatchStatus.MITIGATED).toBe('mitigated')
    expect(PatchStatus.SCHEDULED).toBe('scheduled')
    expect(PatchStatus.NOT_APPLICABLE).toBe('not_applicable')
  })

  it('should only have 5 values', () => {
    expect(Object.values(PatchStatus)).toHaveLength(5)
  })
})

// ─── AI Agent Enums ──────────────────────────────────────────

describe('AiAgentStatus', () => {
  it('should have correct values', () => {
    expect(AiAgentStatus.ONLINE).toBe('online')
    expect(AiAgentStatus.OFFLINE).toBe('offline')
    expect(AiAgentStatus.DEGRADED).toBe('degraded')
    expect(AiAgentStatus.MAINTENANCE).toBe('maintenance')
  })

  it('should only have 4 values', () => {
    expect(Object.values(AiAgentStatus)).toHaveLength(4)
  })
})

describe('AiAgentTier', () => {
  it('should have correct values', () => {
    expect(AiAgentTier.L0).toBe('L0')
    expect(AiAgentTier.L1).toBe('L1')
    expect(AiAgentTier.L2).toBe('L2')
    expect(AiAgentTier.L3).toBe('L3')
  })

  it('should only have 4 values', () => {
    expect(Object.values(AiAgentTier)).toHaveLength(4)
  })
})

describe('AiAgentSessionStatus', () => {
  it('should have correct values', () => {
    expect(AiAgentSessionStatus.RUNNING).toBe('running')
    expect(AiAgentSessionStatus.COMPLETED).toBe('completed')
    expect(AiAgentSessionStatus.FAILED).toBe('failed')
    expect(AiAgentSessionStatus.CANCELLED).toBe('cancelled')
  })

  it('should only have 4 values', () => {
    expect(Object.values(AiAgentSessionStatus)).toHaveLength(4)
  })
})

// ─── UEBA Enums ──────────────────────────────────────────────

describe('UebaEntityType', () => {
  it('should have correct values', () => {
    expect(UebaEntityType.USER).toBe('user')
    expect(UebaEntityType.HOST).toBe('host')
    expect(UebaEntityType.SERVICE_ACCOUNT).toBe('service_account')
    expect(UebaEntityType.APPLICATION).toBe('application')
  })

  it('should only have 4 values', () => {
    expect(Object.values(UebaEntityType)).toHaveLength(4)
  })
})

describe('UebaRiskLevel', () => {
  it('should have correct values', () => {
    expect(UebaRiskLevel.CRITICAL).toBe('critical')
    expect(UebaRiskLevel.HIGH).toBe('high')
    expect(UebaRiskLevel.MEDIUM).toBe('medium')
    expect(UebaRiskLevel.LOW).toBe('low')
    expect(UebaRiskLevel.NORMAL).toBe('normal')
  })

  it('should only have 5 values', () => {
    expect(Object.values(UebaRiskLevel)).toHaveLength(5)
  })
})

describe('MlModelStatus', () => {
  it('should have correct values', () => {
    expect(MlModelStatus.TRAINING).toBe('training')
    expect(MlModelStatus.ACTIVE).toBe('active')
    expect(MlModelStatus.DEGRADED).toBe('degraded')
    expect(MlModelStatus.INACTIVE).toBe('inactive')
  })

  it('should only have 4 values', () => {
    expect(Object.values(MlModelStatus)).toHaveLength(4)
  })
})

describe('MlModelType', () => {
  it('should have correct values', () => {
    expect(MlModelType.ANOMALY_DETECTION).toBe('anomaly_detection')
    expect(MlModelType.CLASSIFICATION).toBe('classification')
    expect(MlModelType.CLUSTERING).toBe('clustering')
    expect(MlModelType.TIME_SERIES).toBe('time_series')
  })

  it('should only have 4 values', () => {
    expect(Object.values(MlModelType)).toHaveLength(4)
  })
})

describe('UebaTab', () => {
  it('should have correct values', () => {
    expect(UebaTab.ENTITIES).toBe('entities')
    expect(UebaTab.ANOMALIES).toBe('anomalies')
    expect(UebaTab.MODELS).toBe('models')
  })

  it('should only have 3 values', () => {
    expect(Object.values(UebaTab)).toHaveLength(3)
  })
})

// ─── Attack Path Enums ───────────────────────────────────────

describe('AttackPathSeverity', () => {
  it('should have correct values', () => {
    expect(AttackPathSeverity.CRITICAL).toBe('critical')
    expect(AttackPathSeverity.HIGH).toBe('high')
    expect(AttackPathSeverity.MEDIUM).toBe('medium')
    expect(AttackPathSeverity.LOW).toBe('low')
  })

  it('should only have 4 values', () => {
    expect(Object.values(AttackPathSeverity)).toHaveLength(4)
  })
})

describe('AttackPathStatus', () => {
  it('should have correct values', () => {
    expect(AttackPathStatus.ACTIVE).toBe('active')
    expect(AttackPathStatus.MITIGATED).toBe('mitigated')
    expect(AttackPathStatus.RESOLVED).toBe('resolved')
  })

  it('should only have 3 values', () => {
    expect(Object.values(AttackPathStatus)).toHaveLength(3)
  })
})

// ─── SOAR Enums ──────────────────────────────────────────────

describe('SoarPlaybookStatus', () => {
  it('should have correct values', () => {
    expect(SoarPlaybookStatus.ACTIVE).toBe('active')
    expect(SoarPlaybookStatus.INACTIVE).toBe('inactive')
    expect(SoarPlaybookStatus.DRAFT).toBe('draft')
  })

  it('should only have 3 values', () => {
    expect(Object.values(SoarPlaybookStatus)).toHaveLength(3)
  })
})

describe('SoarTriggerType', () => {
  it('should have correct values', () => {
    expect(SoarTriggerType.MANUAL).toBe('manual')
    expect(SoarTriggerType.ALERT).toBe('alert')
    expect(SoarTriggerType.INCIDENT).toBe('incident')
    expect(SoarTriggerType.SCHEDULED).toBe('scheduled')
  })

  it('should only have 4 values', () => {
    expect(Object.values(SoarTriggerType)).toHaveLength(4)
  })
})

describe('SoarExecutionStatus', () => {
  it('should have correct values', () => {
    expect(SoarExecutionStatus.RUNNING).toBe('running')
    expect(SoarExecutionStatus.COMPLETED).toBe('completed')
    expect(SoarExecutionStatus.FAILED).toBe('failed')
    expect(SoarExecutionStatus.CANCELLED).toBe('cancelled')
  })

  it('should only have 4 values', () => {
    expect(Object.values(SoarExecutionStatus)).toHaveLength(4)
  })
})

// ─── Compliance Enums ────────────────────────────────────────

describe('ComplianceStandard', () => {
  it('should have correct values', () => {
    expect(ComplianceStandard.ISO_27001).toBe('iso_27001')
    expect(ComplianceStandard.NIST).toBe('nist')
    expect(ComplianceStandard.PCI_DSS).toBe('pci_dss')
    expect(ComplianceStandard.SOC2).toBe('soc2')
    expect(ComplianceStandard.HIPAA).toBe('hipaa')
    expect(ComplianceStandard.GDPR).toBe('gdpr')
  })

  it('should only have 6 values', () => {
    expect(Object.values(ComplianceStandard)).toHaveLength(6)
  })
})

describe('ComplianceControlStatus', () => {
  it('should have correct values', () => {
    expect(ComplianceControlStatus.PASSED).toBe('passed')
    expect(ComplianceControlStatus.FAILED).toBe('failed')
    expect(ComplianceControlStatus.NOT_ASSESSED).toBe('not_assessed')
    expect(ComplianceControlStatus.PARTIALLY_MET).toBe('partially_met')
  })

  it('should only have 4 values', () => {
    expect(Object.values(ComplianceControlStatus)).toHaveLength(4)
  })
})

// ─── Report Enums ────────────────────────────────────────────

describe('ReportType', () => {
  it('should have correct values', () => {
    expect(ReportType.EXECUTIVE).toBe('executive')
    expect(ReportType.COMPLIANCE).toBe('compliance')
    expect(ReportType.INCIDENT).toBe('incident')
    expect(ReportType.THREAT).toBe('threat')
    expect(ReportType.CUSTOM).toBe('custom')
  })

  it('should only have 5 values', () => {
    expect(Object.values(ReportType)).toHaveLength(5)
  })
})

describe('ReportFormat', () => {
  it('should have correct values', () => {
    expect(ReportFormat.PDF).toBe('pdf')
    expect(ReportFormat.CSV).toBe('csv')
    expect(ReportFormat.HTML).toBe('html')
  })

  it('should only have 3 values', () => {
    expect(Object.values(ReportFormat)).toHaveLength(3)
  })
})

describe('ReportStatus', () => {
  it('should have correct values', () => {
    expect(ReportStatus.GENERATING).toBe('generating')
    expect(ReportStatus.COMPLETED).toBe('completed')
    expect(ReportStatus.FAILED).toBe('failed')
  })

  it('should only have 3 values', () => {
    expect(Object.values(ReportStatus)).toHaveLength(3)
  })
})

// ─── System Health Enums ─────────────────────────────────────

describe('ServiceType', () => {
  it('should have correct values', () => {
    expect(ServiceType.CONNECTOR).toBe('connector')
    expect(ServiceType.DATABASE).toBe('database')
    expect(ServiceType.API).toBe('api')
    expect(ServiceType.QUEUE).toBe('queue')
    expect(ServiceType.STORAGE).toBe('storage')
  })

  it('should only have 5 values', () => {
    expect(Object.values(ServiceType)).toHaveLength(5)
  })
})

describe('HealthCheckStatus', () => {
  it('should have correct values', () => {
    expect(HealthCheckStatus.HEALTHY).toBe('healthy')
    expect(HealthCheckStatus.DEGRADED).toBe('degraded')
    expect(HealthCheckStatus.DOWN).toBe('down')
    expect(HealthCheckStatus.UNKNOWN).toBe('unknown')
  })

  it('should only have 4 values', () => {
    expect(Object.values(HealthCheckStatus)).toHaveLength(4)
  })
})

describe('MetricType', () => {
  it('should have correct values', () => {
    expect(MetricType.CPU).toBe('cpu')
    expect(MetricType.MEMORY).toBe('memory')
    expect(MetricType.DISK).toBe('disk')
    expect(MetricType.NETWORK).toBe('network')
    expect(MetricType.QUEUE_DEPTH).toBe('queue_depth')
    expect(MetricType.LATENCY).toBe('latency')
  })

  it('should only have 6 values', () => {
    expect(Object.values(MetricType)).toHaveLength(6)
  })
})

// ─── Normalization Enums ─────────────────────────────────────

describe('NormalizationSourceType', () => {
  it('should have correct values', () => {
    expect(NormalizationSourceType.SYSLOG).toBe('syslog')
    expect(NormalizationSourceType.JSON).toBe('json')
    expect(NormalizationSourceType.CSV).toBe('csv')
    expect(NormalizationSourceType.CEF).toBe('cef')
    expect(NormalizationSourceType.LEEF).toBe('leef')
    expect(NormalizationSourceType.CUSTOM).toBe('custom')
  })

  it('should only have 6 values', () => {
    expect(Object.values(NormalizationSourceType)).toHaveLength(6)
  })
})

describe('NormalizationPipelineStatus', () => {
  it('should have correct values', () => {
    expect(NormalizationPipelineStatus.ACTIVE).toBe('active')
    expect(NormalizationPipelineStatus.INACTIVE).toBe('inactive')
    expect(NormalizationPipelineStatus.ERROR).toBe('error')
  })

  it('should only have 3 values', () => {
    expect(Object.values(NormalizationPipelineStatus)).toHaveLength(3)
  })
})

// ─── Detection Rule Enums ────────────────────────────────────

describe('DetectionRuleType', () => {
  it('should have correct values', () => {
    expect(DetectionRuleType.THRESHOLD).toBe('threshold')
    expect(DetectionRuleType.ANOMALY).toBe('anomaly')
    expect(DetectionRuleType.CHAIN).toBe('chain')
    expect(DetectionRuleType.SCHEDULED).toBe('scheduled')
  })

  it('should only have 4 values', () => {
    expect(Object.values(DetectionRuleType)).toHaveLength(4)
  })
})

describe('DetectionRuleSeverity', () => {
  it('should have correct values', () => {
    expect(DetectionRuleSeverity.CRITICAL).toBe('critical')
    expect(DetectionRuleSeverity.HIGH).toBe('high')
    expect(DetectionRuleSeverity.MEDIUM).toBe('medium')
    expect(DetectionRuleSeverity.LOW).toBe('low')
    expect(DetectionRuleSeverity.INFO).toBe('info')
  })

  it('should only have 5 values', () => {
    expect(Object.values(DetectionRuleSeverity)).toHaveLength(5)
  })
})

describe('DetectionRuleStatus', () => {
  it('should have correct values', () => {
    expect(DetectionRuleStatus.ACTIVE).toBe('active')
    expect(DetectionRuleStatus.TESTING).toBe('testing')
    expect(DetectionRuleStatus.DISABLED).toBe('disabled')
  })

  it('should only have 3 values', () => {
    expect(Object.values(DetectionRuleStatus)).toHaveLength(3)
  })
})

// ─── Cloud Security Enums ────────────────────────────────────

describe('CloudProvider', () => {
  it('should have correct values', () => {
    expect(CloudProvider.AWS).toBe('aws')
    expect(CloudProvider.AZURE).toBe('azure')
    expect(CloudProvider.GCP).toBe('gcp')
    expect(CloudProvider.OCI).toBe('oci')
  })

  it('should only have 4 values', () => {
    expect(Object.values(CloudProvider)).toHaveLength(4)
  })
})

describe('CloudAccountStatus', () => {
  it('should have correct values', () => {
    expect(CloudAccountStatus.CONNECTED).toBe('connected')
    expect(CloudAccountStatus.DISCONNECTED).toBe('disconnected')
    expect(CloudAccountStatus.ERROR).toBe('error')
  })

  it('should only have 3 values', () => {
    expect(Object.values(CloudAccountStatus)).toHaveLength(3)
  })
})

describe('CloudFindingSeverity', () => {
  it('should have correct values', () => {
    expect(CloudFindingSeverity.CRITICAL).toBe('critical')
    expect(CloudFindingSeverity.HIGH).toBe('high')
    expect(CloudFindingSeverity.MEDIUM).toBe('medium')
    expect(CloudFindingSeverity.LOW).toBe('low')
    expect(CloudFindingSeverity.INFO).toBe('info')
  })

  it('should only have 5 values', () => {
    expect(Object.values(CloudFindingSeverity)).toHaveLength(5)
  })
})

describe('CloudFindingStatus', () => {
  it('should have correct values', () => {
    expect(CloudFindingStatus.OPEN).toBe('open')
    expect(CloudFindingStatus.RESOLVED).toBe('resolved')
    expect(CloudFindingStatus.SUPPRESSED).toBe('suppressed')
  })

  it('should only have 3 values', () => {
    expect(Object.values(CloudFindingStatus)).toHaveLength(3)
  })
})
