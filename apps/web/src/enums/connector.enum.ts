export enum ConnectorType {
  WAZUH = 'wazuh',
  GRAYLOG = 'graylog',
  LOGSTASH = 'logstash',
  VELOCIRAPTOR = 'velociraptor',
  GRAFANA = 'grafana',
  INFLUXDB = 'influxdb',
  MISP = 'misp',
  SHUFFLE = 'shuffle',
  BEDROCK = 'bedrock',
  LLM_APIS = 'llm_apis',
  OPENCLAW_GATEWAY = 'openclaw_gateway',
}

export enum ConnectorStatus {
  NOT_CONFIGURED = 'not_configured',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  TESTING = 'testing',
}

export enum ConnectorAuthType {
  API_KEY = 'api_key',
  BASIC = 'basic',
  TOKEN = 'token',
  IAM = 'iam',
}

export enum LlmMaxTokensParameter {
  MAX_TOKENS = 'max_tokens',
  MAX_COMPLETION_TOKENS = 'max_completion_tokens',
}

export enum AiConnectorType {
  SYSTEM = 'system',
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
}

export enum ConnectorCategory {
  SIEM = 'siem',
  EDR = 'edr',
  OBSERVABILITY = 'observability',
  THREAT_INTEL = 'threat_intel',
  SOAR = 'soar',
  AI = 'ai',
}
