import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'

export interface DetectionRuleRecord {
  id: string
  tenantId: string
  ruleNumber: string
  name: string
  description: string | null
  ruleType: string
  severity: string
  status: string
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  hitCount: number
  falsePositiveCount: number
  lastTriggeredAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type PaginatedDetectionRules = PaginatedResponse<DetectionRuleRecord>

export interface DetectionRuleStats {
  totalRules: number
  activeRules: number
  testingRules: number
  disabledRules: number
  totalMatches: number
}

export interface EvaluatableDetectionRule {
  id: string
  name: string
  severity: string
  conditions: Record<string, unknown>
}

export interface DetectionRuleMatch {
  ruleId: string
  ruleName: string
  severity: string
  matchedEvent: Record<string, unknown>
  matchedAt: string
  description: string
}

export interface DetectionExecutionResult {
  ruleId: string
  status: 'matched' | 'no_match' | 'error'
  matchCount: number
  matches: DetectionRuleMatch[]
  executedAt: string
  durationMs: number
  engine: string
  error?: string
}

export interface SigmaFieldMatcher {
  fieldPath: string
  modifier: string
  value: unknown
}

export interface SigmaConditionNode {
  operator: string
  selectorName?: string
  left?: SigmaConditionNode
  right?: SigmaConditionNode
  operand?: SigmaConditionNode
}

export interface ParsedSigmaRule {
  title: string
  selectorGroups: Record<string, SigmaFieldMatcher[][]>
  condition: SigmaConditionNode
}

export interface YaraLClause {
  fieldPath: string
  comparator: string
  value?: unknown
}

export interface YaraLGroup {
  operator: string
  clauses: Array<YaraLGroup | YaraLClause>
}

export interface ParsedYaraLRule {
  title: string
  match: YaraLGroup | YaraLClause
}

export interface FieldMatchProgram {
  engine: string
  fieldConditions: Record<string, unknown>
}

export interface SigmaProgram {
  engine: string
  definition: ParsedSigmaRule
}

export interface YaraLProgram {
  engine: string
  definition: ParsedYaraLRule
}

export type DetectionProgram = FieldMatchProgram | SigmaProgram | YaraLProgram
