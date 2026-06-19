export const REDACTED_PLACEHOLDER = '***REDACTED***'

export const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'apiKey',
  'authKey',
  'auth_key',
  'accessKey',
  'access_key',
  'secretAccessKey',
  'secret_access_key',
  'encryptedConfig',
  'encrypted_config',
  'authorization',
  'indexerPassword',
  'indexer_password',
  'clientKey',
  'client_key',
  // Deprecated key names kept for backward compatibility with existing encrypted configs
  'mispAuthKey',
  'shuffleApiKey',
])
