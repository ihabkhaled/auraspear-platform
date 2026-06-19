import { BadgeVariant, MlModelStatus, MlModelType, UebaEntityType, UebaRiskLevel } from '@/enums'

export const UEBA_ENTITY_TYPE_LABEL_KEYS: Record<UebaEntityType, string> = {
  [UebaEntityType.USER]: 'entityUser',
  [UebaEntityType.HOST]: 'entityHost',
  [UebaEntityType.SERVICE_ACCOUNT]: 'entityServiceAccount',
  [UebaEntityType.APPLICATION]: 'entityApplication',
}

export const UEBA_ENTITY_TYPE_CLASSES: Record<UebaEntityType, string> = {
  [UebaEntityType.USER]: 'bg-severity-info text-white',
  [UebaEntityType.HOST]: 'bg-severity-medium text-white',
  [UebaEntityType.SERVICE_ACCOUNT]: 'bg-severity-high text-white',
  [UebaEntityType.APPLICATION]: 'bg-severity-low text-white',
}

export const UEBA_RISK_LEVEL_LABEL_KEYS: Record<UebaRiskLevel, string> = {
  [UebaRiskLevel.CRITICAL]: 'riskCritical',
  [UebaRiskLevel.HIGH]: 'riskHigh',
  [UebaRiskLevel.MEDIUM]: 'riskMedium',
  [UebaRiskLevel.LOW]: 'riskLow',
  [UebaRiskLevel.NORMAL]: 'riskNormal',
}

export const UEBA_RISK_LEVEL_CLASSES: Record<UebaRiskLevel, string> = {
  [UebaRiskLevel.CRITICAL]: 'bg-severity-critical text-white',
  [UebaRiskLevel.HIGH]: 'bg-severity-high text-white',
  [UebaRiskLevel.MEDIUM]: 'bg-severity-medium text-white',
  [UebaRiskLevel.LOW]: 'bg-severity-low text-white',
  [UebaRiskLevel.NORMAL]: 'bg-muted text-muted-foreground',
}

export const ML_MODEL_STATUS_LABEL_KEYS: Record<MlModelStatus, string> = {
  [MlModelStatus.TRAINING]: 'modelTraining',
  [MlModelStatus.ACTIVE]: 'modelActive',
  [MlModelStatus.DEGRADED]: 'modelDegraded',
  [MlModelStatus.INACTIVE]: 'modelInactive',
}

export const ML_MODEL_STATUS_CLASSES: Record<MlModelStatus, string> = {
  [MlModelStatus.TRAINING]: 'bg-status-warning text-white',
  [MlModelStatus.ACTIVE]: 'bg-status-success text-white',
  [MlModelStatus.DEGRADED]: 'bg-status-warning text-white',
  [MlModelStatus.INACTIVE]: 'bg-muted text-muted-foreground',
}

export const ML_MODEL_TYPE_LABEL_KEYS: Record<MlModelType, string> = {
  [MlModelType.ANOMALY_DETECTION]: 'typeAnomalyDetection',
  [MlModelType.CLASSIFICATION]: 'typeClassification',
  [MlModelType.CLUSTERING]: 'typeClustering',
  [MlModelType.TIME_SERIES]: 'typeTimeSeries',
}

export const ML_MODEL_TYPE_CLASSES: Record<MlModelType, string> = {
  [MlModelType.ANOMALY_DETECTION]: 'bg-severity-high text-white',
  [MlModelType.CLASSIFICATION]: 'bg-severity-info text-white',
  [MlModelType.CLUSTERING]: 'bg-severity-medium text-white',
  [MlModelType.TIME_SERIES]: 'bg-severity-low text-white',
}

export const SEVERITY_VARIANT_MAP: Record<UebaRiskLevel, BadgeVariant> = {
  [UebaRiskLevel.CRITICAL]: BadgeVariant.DESTRUCTIVE,
  [UebaRiskLevel.HIGH]: BadgeVariant.DESTRUCTIVE,
  [UebaRiskLevel.MEDIUM]: BadgeVariant.DEFAULT,
  [UebaRiskLevel.LOW]: BadgeVariant.SECONDARY,
  [UebaRiskLevel.NORMAL]: BadgeVariant.OUTLINE,
}
