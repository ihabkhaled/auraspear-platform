export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export enum JobType {
  CONNECTOR_SYNC = 'connector_sync',
  DETECTION_RULE_EXECUTION = 'detection_rule_execution',
  CORRELATION_RULE_EXECUTION = 'correlation_rule_execution',
  NORMALIZATION_PIPELINE = 'normalization_pipeline',
  SOAR_PLAYBOOK = 'soar_playbook',
  HUNT_EXECUTION = 'hunt_execution',
  AI_AGENT_TASK = 'ai_agent_task',
  REPORT_GENERATION = 'report_generation',
  MEMORY_EXTRACTION = 'memory_extraction',
}
