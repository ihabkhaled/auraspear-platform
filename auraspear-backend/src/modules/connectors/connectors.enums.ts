export enum ConnectorServiceName {
  OPENSEARCH = 'opensearch',
}

/** The request body field name used to limit completion token count. */
export enum LlmMaxTokensParameter {
  MAX_TOKENS = 'max_tokens',
  MAX_COMPLETION_TOKENS = 'max_completion_tokens',
}

/** Bedrock model family — determines request/response payload shape. */
export enum BedrockModelFamily {
  ANTHROPIC = 'anthropic',
  AMAZON_NOVA = 'amazon.nova',
  META_LLAMA = 'meta.llama',
  UNKNOWN = 'unknown',
}
