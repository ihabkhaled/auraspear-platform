import { EntitySortField } from '../../common/enums'

export const MAX_RISK_SCORE = 100
export const RELATION_WEIGHT = 5
export const BASE_EXISTENCE_SCORE = 10

export const ENTITY_SORT_FIELDS: Record<string, string> = {
  [EntitySortField.VALUE]: 'value',
  [EntitySortField.TYPE]: 'type',
  [EntitySortField.RISK_SCORE]: 'riskScore',
  [EntitySortField.FIRST_SEEN]: 'firstSeen',
  [EntitySortField.LAST_SEEN]: 'lastSeen',
  [EntitySortField.CREATED_AT]: 'createdAt',
}

export const ENTITY_TYPE_WEIGHTS: ReadonlyMap<string, number> = new Map<string, number>([
  ['ip', 15],
  ['domain', 12],
  ['hash', 20],
  ['url', 18],
  ['email', 10],
  ['user', 8],
  ['process', 15],
  ['file', 12],
  ['hostname', 8],
  ['asset', 5],
])
