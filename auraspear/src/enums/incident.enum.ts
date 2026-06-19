export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentCategory {
  INTRUSION = 'intrusion',
  INSIDER = 'insider',
  BRUTE_FORCE = 'brute_force',
  EXFILTRATION = 'exfiltration',
  MALWARE = 'malware',
  CLOUD = 'cloud',
  PHISHING = 'phishing',
  DOS = 'dos',
  OTHER = 'other',
}

export enum IncidentActorType {
  USER = 'user',
  AI_AGENT = 'ai_agent',
  SYSTEM = 'system',
}
