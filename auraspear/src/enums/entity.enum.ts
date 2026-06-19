export enum EntityType {
  IP = 'ip',
  DOMAIN = 'domain',
  HOSTNAME = 'hostname',
  USER = 'user',
  EMAIL = 'email',
  HASH = 'hash',
  URL = 'url',
  PROCESS = 'process',
  FILE = 'file',
  ASSET = 'asset',
}

export enum EntityRelationType {
  COMMUNICATES_WITH = 'communicates_with',
  RESOLVES_TO = 'resolves_to',
  HOSTS = 'hosts',
  BELONGS_TO = 'belongs_to',
  ASSOCIATED_WITH = 'associated_with',
  EXECUTED_BY = 'executed_by',
  TRIGGERED_ALERT = 'triggered_alert',
  MENTIONED_IN_CASE = 'mentioned_in_case',
  OBSERVED_IN_HUNT = 'observed_in_hunt',
}

export enum EntitySortField {
  VALUE = 'value',
  TYPE = 'type',
  RISK_SCORE = 'riskScore',
  FIRST_SEEN = 'firstSeen',
  LAST_SEEN = 'lastSeen',
  CREATED_AT = 'createdAt',
}
