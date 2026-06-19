export const IOC_TYPE_GROUPS = new Map<string, string[]>([
  ['ip', ['ip-src', 'ip-dst']],
  ['hash', ['md5', 'sha1', 'sha256']],
])

export const IOC_SORT_FIELDS: Record<string, string> = {
  lastSeen: 'lastSeen',
  firstSeen: 'firstSeen',
  hitCount: 'hitCount',
  severity: 'severity',
  iocType: 'iocType',
  iocValue: 'iocValue',
  source: 'source',
}

export const MISP_SORT_FIELDS: Record<string, string> = {
  date: 'date',
  organization: 'organization',
  threatLevel: 'threatLevel',
  attributeCount: 'attributeCount',
  published: 'published',
}
