export enum HuntStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum MessageRole {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export enum ReasoningStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum HuntMobileTab {
  CHAT = 'chat',
  RESULTS = 'results',
}
