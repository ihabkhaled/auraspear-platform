import { parse as parseYaml } from 'yaml'
import {
  DETECTION_RULE_SORT_FIELDS,
  DetectionExecutionEngine,
  SIGMA_CONDITION_KEY,
  SIGMA_DETECTION_KEY,
  SIGMA_OBJECT_KEYS,
  SigmaConditionOperator,
  SigmaFieldModifier,
  YARAL_MATCH_KEY,
  YARAL_OBJECT_KEYS,
  YaraLComparator,
  YaraLLogicalOperator,
} from './detection-rules.constants'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  DetectionProgram,
  DetectionRuleRecord,
  DetectionRuleStats,
  EvaluatableDetectionRule,
  FieldMatchProgram,
  ParsedSigmaRule,
  ParsedYaraLRule,
  SigmaConditionNode,
  SigmaFieldMatcher,
  SigmaProgram,
  YaraLClause,
  YaraLGroup,
  YaraLProgram,
} from './detection-rules.types'
import type { UpdateDetectionRuleDto } from './dto/update-detection-rule.dto'
import type {
  DetectionRule,
  Prisma,
  DetectionRuleType as PrismaDetectionRuleType,
  DetectionRuleSeverity as PrismaDetectionRuleSeverity,
  DetectionRuleStatus as PrismaDetectionRuleStatus,
} from '@prisma/client'

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function buildDetectionRuleRecord(r: DetectionRule): DetectionRuleRecord {
  return {
    id: r.id,
    tenantId: r.tenantId,
    ruleNumber: r.ruleNumber,
    name: r.name,
    description: r.description,
    ruleType: r.ruleType,
    severity: r.severity,
    status: r.status,
    conditions: r.conditions as Record<string, unknown>,
    actions: r.actions as Record<string, unknown>,
    hitCount: r.hitCount,
    falsePositiveCount: r.falsePositiveCount,
    lastTriggeredAt: r.lastTriggeredAt,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildRuleListWhere(
  tenantId: string,
  ruleType?: string,
  severity?: string,
  status?: string,
  query?: string
): Prisma.DetectionRuleWhereInput {
  const where: Prisma.DetectionRuleWhereInput = { tenantId }

  if (ruleType) {
    where.ruleType = ruleType as PrismaDetectionRuleType
  }

  if (severity) {
    where.severity = severity as PrismaDetectionRuleSeverity
  }

  if (status) {
    where.status = status as PrismaDetectionRuleStatus
  }

  if (query && query.trim().length > 0) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { ruleNumber: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildRuleOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.DetectionRuleOrderByWithRelationInput {
  return buildOrderBy(DETECTION_RULE_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildRuleUpdateData(
  dto: UpdateDetectionRuleDto
): Prisma.DetectionRuleUncheckedUpdateManyInput {
  const data: Prisma.DetectionRuleUncheckedUpdateManyInput = {}

  if (dto.name !== undefined) {
    data.name = dto.name
  }
  if (dto.description !== undefined) {
    data.description = dto.description
  }
  if (dto.ruleType !== undefined) {
    data.ruleType = dto.ruleType
  }
  if (dto.severity !== undefined) {
    data.severity = dto.severity
  }
  if (dto.status !== undefined) {
    data.status = dto.status
  }
  if (dto.conditions !== undefined) {
    data.conditions = dto.conditions as Prisma.InputJsonValue
  }
  if (dto.actions !== undefined) {
    data.actions = dto.actions as Prisma.InputJsonValue
  }

  return data
}

/* ---------------------------------------------------------------- */
/* STATS BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildDetectionRuleStats(
  total: number,
  active: number,
  testing: number,
  disabled: number,
  aggregates: { _sum: { hitCount: number | null } }
): DetectionRuleStats {
  return {
    totalRules: total,
    activeRules: active,
    testingRules: testing,
    disabledRules: disabled,
    totalMatches: aggregates._sum.hitCount ?? 0,
  }
}

/* ---------------------------------------------------------------- */
/* DETECTION EXECUTION FOUNDATIONS                                   */
/* ---------------------------------------------------------------- */

export function compileDetectionConditions(
  conditions: EvaluatableDetectionRule['conditions']
): DetectionProgram {
  const sigmaSource = findEmbeddedRuleSource(conditions, SIGMA_OBJECT_KEYS)
  if (sigmaSource !== undefined) {
    return {
      engine: DetectionExecutionEngine.SIGMA,
      definition: parseSigmaRuleDefinition(sigmaSource),
    } satisfies SigmaProgram
  }

  const yaraLSource = findEmbeddedRuleSource(conditions, YARAL_OBJECT_KEYS)
  if (yaraLSource !== undefined) {
    return {
      engine: DetectionExecutionEngine.YARAL,
      definition: parseYaraLRuleDefinition(yaraLSource),
    } satisfies YaraLProgram
  }

  return {
    engine: DetectionExecutionEngine.FIELD_MATCH,
    fieldConditions: normalizeFieldMatchConditions(conditions),
  } satisfies FieldMatchProgram
}

export function evaluateDetectionProgram(
  program: DetectionProgram,
  event: Record<string, unknown>
): boolean {
  if (isSigmaProgram(program)) {
    return evaluateSigmaCondition(program.definition, event)
  }

  if (isYaraLProgram(program)) {
    return evaluateYaraLNode(program.definition.match, event)
  }

  return matchesFieldConditions(event, program.fieldConditions)
}

export function buildDetectionMatchDescription(
  ruleName: string,
  engine: DetectionProgram['engine']
): string {
  switch (engine) {
    case DetectionExecutionEngine.SIGMA:
      return `Rule "${ruleName}" matched event via Sigma evaluation`
    case DetectionExecutionEngine.YARAL:
      return `Rule "${ruleName}" matched event via YARA-L evaluation`
    case DetectionExecutionEngine.FIELD_MATCH:
    default:
      return `Rule "${ruleName}" matched event via field evaluation`
  }
}

function findEmbeddedRuleSource(
  conditions: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    const source = Reflect.get(conditions, key)
    if (source !== undefined) {
      return source
    }
  }

  return undefined
}

function parseSigmaRuleDefinition(source: unknown): ParsedSigmaRule {
  const ruleObject = parseStructuredRuleSource(source, DetectionExecutionEngine.SIGMA)
  const detection = asRecord(
    Reflect.get(ruleObject, SIGMA_DETECTION_KEY),
    'Sigma detection block is required'
  )
  const rawCondition = Reflect.get(detection, SIGMA_CONDITION_KEY)

  if (typeof rawCondition !== 'string' || rawCondition.trim().length === 0) {
    throw new Error('Sigma detection.condition must be a non-empty string')
  }

  const selectorGroups: Record<string, SigmaFieldMatcher[][]> = {}
  for (const [key, value] of Object.entries(detection)) {
    if (key === SIGMA_CONDITION_KEY) {
      continue
    }

    Reflect.set(selectorGroups, key, parseSigmaSelectorGroups(key, value))
  }

  const selectorNames = Object.keys(selectorGroups)
  if (selectorNames.length === 0) {
    throw new Error('Sigma detection must define at least one selector')
  }

  return {
    title: toNonEmptyString(ruleObject['title']) ?? 'Sigma Rule',
    selectorGroups,
    condition: parseSigmaCondition(rawCondition, selectorNames),
  }
}

function parseYaraLRuleDefinition(source: unknown): ParsedYaraLRule {
  const ruleObject = parseStructuredRuleSource(source, DetectionExecutionEngine.YARAL)

  return {
    title: toNonEmptyString(ruleObject['title']) ?? 'YARA-L Rule',
    match: parseYaraLNode(Reflect.get(ruleObject, YARAL_MATCH_KEY)),
  }
}

function parseStructuredRuleSource(
  source: unknown,
  engine: DetectionExecutionEngine
): Record<string, unknown> {
  if (typeof source === 'string') {
    const parsed = parseYaml(source)
    return asRecord(parsed, `${engine} source must parse into an object`)
  }

  return asRecord(source, `${engine} source must be an object`)
}

function parseSigmaSelectorGroups(
  selectorName: string,
  rawSelector: unknown
): SigmaFieldMatcher[][] {
  if (Array.isArray(rawSelector)) {
    const groups: SigmaFieldMatcher[][] = []

    for (const rawGroup of rawSelector) {
      groups.push(parseSigmaMatcherGroup(selectorName, rawGroup))
    }

    return groups
  }

  return [parseSigmaMatcherGroup(selectorName, rawSelector)]
}

function parseSigmaMatcherGroup(selectorName: string, rawGroup: unknown): SigmaFieldMatcher[] {
  const selectorObject = asRecord(rawGroup, `Sigma selector "${selectorName}" must be an object`)
  const matcherGroup: SigmaFieldMatcher[] = []

  for (const [rawKey, value] of Object.entries(selectorObject)) {
    const keySegments = rawKey.split('|')
    const fieldPath = keySegments[0]

    if (!fieldPath || fieldPath.trim().length === 0) {
      throw new Error(`Sigma selector "${selectorName}" contains an empty field path`)
    }

    matcherGroup.push({
      fieldPath,
      modifier: parseSigmaModifier(keySegments[1]),
      value,
    })
  }

  if (matcherGroup.length === 0) {
    throw new Error(`Sigma selector "${selectorName}" cannot be empty`)
  }

  return matcherGroup
}

function parseSigmaModifier(rawModifier?: string): SigmaFieldModifier {
  switch (rawModifier) {
    case undefined:
      return SigmaFieldModifier.EQUALS
    case SigmaFieldModifier.CONTAINS:
      return SigmaFieldModifier.CONTAINS
    case SigmaFieldModifier.STARTS_WITH:
      return SigmaFieldModifier.STARTS_WITH
    case SigmaFieldModifier.ENDS_WITH:
      return SigmaFieldModifier.ENDS_WITH
    case SigmaFieldModifier.REGEX:
      return SigmaFieldModifier.REGEX
    case SigmaFieldModifier.EXISTS:
      return SigmaFieldModifier.EXISTS
    default:
      throw new Error(`Unsupported Sigma modifier "${rawModifier}"`)
  }
}

function parseSigmaCondition(conditionText: string, selectorNames: string[]): SigmaConditionNode {
  const tokens = conditionText.match(/\(|\)|\b(?:and|or|not)\b|[A-Za-z0-9_-]+/gi) ?? []
  if (tokens.length === 0) {
    throw new Error('Sigma condition is empty')
  }

  const selectorNameSet = new Set(selectorNames)
  let tokenIndex = 0

  function parseExpression(): SigmaConditionNode {
    return parseOrExpression()
  }

  function parseOrExpression(): SigmaConditionNode {
    let node = parseAndExpression()

    while (normalizeConditionToken(tokens.at(tokenIndex)) === SigmaConditionOperator.OR) {
      tokenIndex += 1
      node = {
        operator: SigmaConditionOperator.OR,
        left: node,
        right: parseAndExpression(),
      }
    }

    return node
  }

  function parseAndExpression(): SigmaConditionNode {
    let node = parseNotExpression()

    while (normalizeConditionToken(tokens.at(tokenIndex)) === SigmaConditionOperator.AND) {
      tokenIndex += 1
      node = {
        operator: SigmaConditionOperator.AND,
        left: node,
        right: parseNotExpression(),
      }
    }

    return node
  }

  function parseNotExpression(): SigmaConditionNode {
    if (normalizeConditionToken(tokens.at(tokenIndex)) === SigmaConditionOperator.NOT) {
      tokenIndex += 1
      return {
        operator: SigmaConditionOperator.NOT,
        operand: parseNotExpression(),
      }
    }

    return parsePrimaryExpression()
  }

  function parsePrimaryExpression(): SigmaConditionNode {
    const currentToken = tokens.at(tokenIndex)

    if (currentToken === '(') {
      tokenIndex += 1
      const expression = parseExpression()
      const nextToken = tokens.at(tokenIndex)

      if (nextToken !== ')') {
        throw new Error('Sigma condition contains an unclosed parenthesis')
      }

      tokenIndex += 1
      return expression
    }

    if (!currentToken || !selectorNameSet.has(currentToken)) {
      throw new Error(`Sigma condition references unknown selector "${currentToken ?? ''}"`)
    }

    tokenIndex += 1
    return {
      operator: SigmaConditionOperator.SELECTOR,
      selectorName: currentToken,
    }
  }

  const condition = parseExpression()
  if (tokenIndex < tokens.length) {
    throw new Error(`Unexpected Sigma condition token "${tokens.at(tokenIndex) ?? ''}"`)
  }

  return condition
}

function normalizeConditionToken(token: string | undefined): string | undefined {
  return token?.toLowerCase()
}

function parseYaraLNode(rawNode: unknown): YaraLGroup | YaraLClause {
  const nodeObject = asRecord(rawNode, 'YARA-L match block must be an object')

  if ('all' in nodeObject) {
    return {
      operator: YaraLLogicalOperator.ALL,
      clauses: parseYaraLChildren(nodeObject['all']),
    }
  }

  if ('any' in nodeObject) {
    return {
      operator: YaraLLogicalOperator.ANY,
      clauses: parseYaraLChildren(nodeObject['any']),
    }
  }

  if ('not' in nodeObject) {
    return {
      operator: YaraLLogicalOperator.NOT,
      clauses: parseYaraLChildren(nodeObject['not']),
    }
  }

  return parseYaraLClause(nodeObject)
}

function parseYaraLChildren(rawChildren: unknown): Array<YaraLGroup | YaraLClause> {
  const rawItems = Array.isArray(rawChildren) ? rawChildren : [rawChildren]
  const clauses: Array<YaraLGroup | YaraLClause> = []

  for (const item of rawItems) {
    clauses.push(parseYaraLNode(item))
  }

  if (clauses.length === 0) {
    throw new Error('YARA-L logical block cannot be empty')
  }

  return clauses
}

function parseYaraLClause(rawClause: Record<string, unknown>): YaraLClause {
  const fieldPath = toNonEmptyString(rawClause['field'])
  if (!fieldPath) {
    throw new Error('YARA-L clause requires a field')
  }

  const explicitOperator = toNonEmptyString(rawClause['operator'])
  if (explicitOperator) {
    return {
      fieldPath,
      comparator: parseYaraLComparator(explicitOperator),
      value: rawClause['value'],
    }
  }

  for (const comparator of Object.values(YaraLComparator)) {
    if (comparator in rawClause) {
      return {
        fieldPath,
        comparator,
        value: Reflect.get(rawClause, comparator),
      }
    }
  }

  throw new Error(`YARA-L clause for field "${fieldPath}" has no supported comparator`)
}

function parseYaraLComparator(rawComparator: string): YaraLComparator {
  switch (rawComparator) {
    case YaraLComparator.EQUALS:
      return YaraLComparator.EQUALS
    case YaraLComparator.CONTAINS:
      return YaraLComparator.CONTAINS
    case YaraLComparator.STARTS_WITH:
      return YaraLComparator.STARTS_WITH
    case YaraLComparator.ENDS_WITH:
      return YaraLComparator.ENDS_WITH
    case YaraLComparator.MATCHES:
      return YaraLComparator.MATCHES
    case YaraLComparator.IN:
      return YaraLComparator.IN
    case YaraLComparator.GREATER_THAN:
      return YaraLComparator.GREATER_THAN
    case YaraLComparator.LESS_THAN:
      return YaraLComparator.LESS_THAN
    case YaraLComparator.EXISTS:
      return YaraLComparator.EXISTS
    default:
      throw new Error(`Unsupported YARA-L comparator "${rawComparator}"`)
  }
}

function normalizeFieldMatchConditions(
  conditions: Record<string, unknown>
): Record<string, unknown> {
  const { fields } = conditions

  if (isRecord(fields)) {
    return fields
  }

  return conditions
}

function matchesFieldConditions(
  event: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  for (const [fieldPath, expectedValue] of Object.entries(conditions)) {
    const eventValue = getValueByPath(event, fieldPath)

    if (!matchesComparatorValue(eventValue, YaraLComparator.CONTAINS, expectedValue, true)) {
      return false
    }
  }

  return true
}

function evaluateSigmaCondition(
  definition: ParsedSigmaRule,
  event: Record<string, unknown>
): boolean {
  return evaluateSigmaNode(definition.condition, definition.selectorGroups, event)
}

function evaluateSigmaNode(
  node: SigmaConditionNode,
  selectorGroups: ParsedSigmaRule['selectorGroups'],
  event: Record<string, unknown>
): boolean {
  switch (node.operator) {
    case SigmaConditionOperator.SELECTOR:
      return matchesSigmaSelector(selectorGroups[node.selectorName ?? ''], event)
    case SigmaConditionOperator.AND: {
      const { left, right } = node
      if (!left || !right) {
        return false
      }

      return (
        evaluateSigmaNode(left, selectorGroups, event) &&
        evaluateSigmaNode(right, selectorGroups, event)
      )
    }
    case SigmaConditionOperator.OR: {
      const { left, right } = node
      if (!left || !right) {
        return false
      }

      return (
        evaluateSigmaNode(left, selectorGroups, event) ||
        evaluateSigmaNode(right, selectorGroups, event)
      )
    }
    case SigmaConditionOperator.NOT: {
      const { operand } = node
      if (!operand) {
        return false
      }

      return !evaluateSigmaNode(operand, selectorGroups, event)
    }
    default:
      return false
  }
}

function isSigmaProgram(program: DetectionProgram): program is SigmaProgram {
  return program.engine === DetectionExecutionEngine.SIGMA
}

function isYaraLProgram(program: DetectionProgram): program is YaraLProgram {
  return program.engine === DetectionExecutionEngine.YARAL
}

function matchesSigmaSelector(
  selectorGroups: SigmaFieldMatcher[][] | undefined,
  event: Record<string, unknown>
): boolean {
  if (!selectorGroups) {
    return false
  }

  for (const matcherGroup of selectorGroups) {
    let matchedGroup = true

    for (const matcher of matcherGroup) {
      const eventValue = getValueByPath(event, matcher.fieldPath)
      if (!matchesSigmaMatcher(eventValue, matcher)) {
        matchedGroup = false
        break
      }
    }

    if (matchedGroup) {
      return true
    }
  }

  return false
}

function matchesSigmaMatcher(eventValue: unknown, matcher: SigmaFieldMatcher): boolean {
  switch (matcher.modifier) {
    case SigmaFieldModifier.EQUALS:
      return matchesComparatorValue(eventValue, YaraLComparator.EQUALS, matcher.value)
    case SigmaFieldModifier.CONTAINS:
      return matchesComparatorValue(eventValue, YaraLComparator.CONTAINS, matcher.value)
    case SigmaFieldModifier.STARTS_WITH:
      return matchesComparatorValue(eventValue, YaraLComparator.STARTS_WITH, matcher.value)
    case SigmaFieldModifier.ENDS_WITH:
      return matchesComparatorValue(eventValue, YaraLComparator.ENDS_WITH, matcher.value)
    case SigmaFieldModifier.REGEX:
      return matchesComparatorValue(eventValue, YaraLComparator.MATCHES, matcher.value)
    case SigmaFieldModifier.EXISTS:
      return matchesComparatorValue(eventValue, YaraLComparator.EXISTS, matcher.value)
    default:
      return false
  }
}

function evaluateYaraLNode(
  node: YaraLGroup | YaraLClause,
  event: Record<string, unknown>
): boolean {
  if ('fieldPath' in node) {
    const eventValue = getValueByPath(event, node.fieldPath)
    return matchesComparatorValue(eventValue, node.comparator, node.value)
  }

  switch (node.operator) {
    case YaraLLogicalOperator.ALL:
      for (const clause of node.clauses) {
        if (!evaluateYaraLNode(clause, event)) {
          return false
        }
      }
      return true
    case YaraLLogicalOperator.ANY:
      for (const clause of node.clauses) {
        if (evaluateYaraLNode(clause, event)) {
          return true
        }
      }
      return false
    case YaraLLogicalOperator.NOT:
      for (const clause of node.clauses) {
        if (evaluateYaraLNode(clause, event)) {
          return false
        }
      }
      return true
    default:
      return false
  }
}

function matchesComparatorValue(
  eventValue: unknown,
  comparator: string,
  expectedValue: unknown,
  allowContainsFallback = false
): boolean {
  switch (comparator) {
    case YaraLComparator.EQUALS:
      return compareExact(eventValue, expectedValue, allowContainsFallback)
    case YaraLComparator.CONTAINS:
      return compareContains(eventValue, expectedValue)
    case YaraLComparator.STARTS_WITH:
      return compareStartsWith(eventValue, expectedValue)
    case YaraLComparator.ENDS_WITH:
      return compareEndsWith(eventValue, expectedValue)
    case YaraLComparator.MATCHES:
      return compareRegex(eventValue, expectedValue)
    case YaraLComparator.IN:
      return compareIn(eventValue, expectedValue)
    case YaraLComparator.GREATER_THAN:
      return compareNumeric(eventValue, expectedValue, YaraLComparator.GREATER_THAN)
    case YaraLComparator.LESS_THAN:
      return compareNumeric(eventValue, expectedValue, YaraLComparator.LESS_THAN)
    case YaraLComparator.EXISTS:
      return compareExists(eventValue, expectedValue)
    default:
      return false
  }
}

function compareExact(
  eventValue: unknown,
  expectedValue: unknown,
  allowContainsFallback = false
): boolean {
  const eventValues = normalizeComparableValues(eventValue)
  const expectedValues = normalizeComparableValues(expectedValue)

  for (const currentEventValue of eventValues) {
    for (const currentExpectedValue of expectedValues) {
      if (
        typeof currentEventValue === 'string' &&
        typeof currentExpectedValue === 'string' &&
        normalizeString(currentEventValue) === normalizeString(currentExpectedValue)
      ) {
        return true
      }

      if (currentEventValue === currentExpectedValue) {
        return true
      }

      if (
        allowContainsFallback &&
        typeof currentEventValue === 'string' &&
        typeof currentExpectedValue === 'string' &&
        normalizeString(currentEventValue).includes(normalizeString(currentExpectedValue))
      ) {
        return true
      }
    }
  }

  return false
}

function compareContains(eventValue: unknown, expectedValue: unknown): boolean {
  const eventValues = normalizeComparableValues(eventValue)
  const expectedValues = normalizeComparableValues(expectedValue)

  for (const currentEventValue of eventValues) {
    for (const currentExpectedValue of expectedValues) {
      if (
        typeof currentEventValue === 'string' &&
        typeof currentExpectedValue === 'string' &&
        normalizeString(currentEventValue).includes(normalizeString(currentExpectedValue))
      ) {
        return true
      }
    }
  }

  return false
}

function compareStartsWith(eventValue: unknown, expectedValue: unknown): boolean {
  const eventValues = normalizeComparableValues(eventValue)
  const expectedValues = normalizeComparableValues(expectedValue)

  for (const currentEventValue of eventValues) {
    for (const currentExpectedValue of expectedValues) {
      if (
        typeof currentEventValue === 'string' &&
        typeof currentExpectedValue === 'string' &&
        normalizeString(currentEventValue).startsWith(normalizeString(currentExpectedValue))
      ) {
        return true
      }
    }
  }

  return false
}

function compareEndsWith(eventValue: unknown, expectedValue: unknown): boolean {
  const eventValues = normalizeComparableValues(eventValue)
  const expectedValues = normalizeComparableValues(expectedValue)

  for (const currentEventValue of eventValues) {
    for (const currentExpectedValue of expectedValues) {
      if (
        typeof currentEventValue === 'string' &&
        typeof currentExpectedValue === 'string' &&
        normalizeString(currentEventValue).endsWith(normalizeString(currentExpectedValue))
      ) {
        return true
      }
    }
  }

  return false
}

function buildSafeRegex(pattern: string, flags: string): RegExp | null {
  try {
    return RegExp(pattern, flags)
  } catch {
    return null
  }
}

function compareRegex(eventValue: unknown, expectedValue: unknown): boolean {
  if (typeof expectedValue !== 'string') {
    return false
  }

  const regex = buildSafeRegex(expectedValue, 'i')
  if (!regex) {
    return false
  }

  const eventValues = normalizeComparableValues(eventValue)
  for (const currentEventValue of eventValues) {
    if (typeof currentEventValue === 'string' && regex.test(currentEventValue)) {
      return true
    }
  }

  return false
}

function compareIn(eventValue: unknown, expectedValue: unknown): boolean {
  if (!Array.isArray(expectedValue)) {
    return false
  }

  return compareExact(eventValue, expectedValue)
}

function compareNumeric(
  eventValue: unknown,
  expectedValue: unknown,
  comparator: YaraLComparator
): boolean {
  const eventNumber = toNumber(eventValue)
  const expectedNumber = toNumber(expectedValue)

  if (eventNumber === null || expectedNumber === null) {
    return false
  }

  if (comparator === YaraLComparator.GREATER_THAN) {
    return eventNumber > expectedNumber
  }

  return eventNumber < expectedNumber
}

function compareExists(eventValue: unknown, expectedValue: unknown): boolean {
  const expectedBoolean = typeof expectedValue === 'boolean' ? expectedValue : true
  return expectedBoolean ? eventValue !== undefined : eventValue === undefined
}

function normalizeComparableValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (value === undefined) {
    return []
  }

  return [value]
}

function getValueByPath(source: Record<string, unknown>, fieldPath: string): unknown {
  const segments = fieldPath.split('.')
  let currentValue: unknown = source

  for (const segment of segments) {
    if (!isRecord(currentValue)) {
      return undefined
    }

    currentValue = Reflect.get(currentValue, segment)
  }

  return currentValue
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(message)
  }

  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeString(value: string): string {
  return value.toLowerCase()
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}
