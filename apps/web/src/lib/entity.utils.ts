import { EntityType, IOCType } from '@/enums'

const ENRICHABLE_TYPES = new Set<string>([
  EntityType.IP,
  EntityType.DOMAIN,
  EntityType.HOSTNAME,
  EntityType.HASH,
  EntityType.URL,
  EntityType.EMAIL,
  EntityType.FILE,
])

export function isEnrichableEntityType(entityType: string): boolean {
  return ENRICHABLE_TYPES.has(entityType)
}

export function resolveIocType(entityType: string): string {
  return normalizeIocType(entityType)
}

/**
 * Maps ANY incoming IOC type string (MISP, entity, frontend enum, raw)
 * to the backend-compatible OsintIocType value.
 * Handles: ip-src, ip-dst, md5, sha1, sha256, filename, hostname,
 * email-src, email-dst, filepath, registry, etc.
 */
const IOC_TYPE_MAP: Record<string, string> = {
  // IP variants
  ip: IOCType.IP,
  'ip-src': IOCType.IP,
  'ip-dst': IOCType.IP,
  'ip-src|port': IOCType.IP,
  'ip-dst|port': IOCType.IP,
  ipv4: IOCType.IP,
  ipv6: IOCType.IP,
  ip_address: IOCType.IP,

  // Domain variants
  domain: IOCType.DOMAIN,
  'domain|ip': IOCType.DOMAIN,
  hostname: IOCType.DOMAIN,
  'hostname|port': IOCType.DOMAIN,

  // URL
  url: IOCType.URL,
  uri: IOCType.URL,
  link: IOCType.URL,

  // Hash variants
  hash: IOCType.HASH,
  file_hash: IOCType.HASH,
  md5: IOCType.MD5,
  sha1: IOCType.SHA1,
  sha256: IOCType.SHA256,
  sha512: IOCType.HASH,
  ssdeep: IOCType.HASH,
  imphash: IOCType.HASH,
  tlsh: IOCType.HASH,
  sha224: IOCType.HASH,
  sha384: IOCType.HASH,
  authentihash: IOCType.HASH,
  pehash: IOCType.HASH,
  'filename|md5': IOCType.MD5,
  'filename|sha1': IOCType.SHA1,
  'filename|sha256': IOCType.SHA256,

  // File variants
  file: IOCType.FILE_NAME,
  filename: IOCType.FILE_NAME,
  file_name: IOCType.FILE_NAME,
  filepath: IOCType.FILE_PATH,
  file_path: IOCType.FILE_PATH,
  attachment: IOCType.FILE_NAME,

  // Email variants
  email: IOCType.EMAIL,
  'email-src': IOCType.EMAIL,
  'email-dst': IOCType.EMAIL,
  'email-subject': IOCType.EMAIL,
  'email-attachment': IOCType.FILE_NAME,

  // Network variants
  cidr: IOCType.CIDR,
  asn: IOCType.ASN,
  as: IOCType.ASN,

  // Misc
  cve: IOCType.CVE,
  vulnerability: IOCType.CVE,
  registry: IOCType.REGISTRY_KEY,
  registry_key: IOCType.REGISTRY_KEY,
  regkey: IOCType.REGISTRY_KEY,
  'regkey|value': IOCType.REGISTRY_KEY,
  'windows-registry-key': IOCType.REGISTRY_KEY,
}

export function normalizeIocType(rawType: string): string {
  const lower = rawType.toLowerCase().trim()
  return (Reflect.get(IOC_TYPE_MAP, lower) as string) ?? lower
}

const FILE_HASH_TYPES = new Set<string>([
  'hash',
  'file',
  'file_hash',
  'file_name',
  'file_path',
  'md5',
  'sha1',
  'sha256',
  'sha512',
  'filename',
  'filepath',
  'attachment',
  'filename|md5',
  'filename|sha1',
  'filename|sha256',
  'ssdeep',
  'imphash',
  'tlsh',
  'authentihash',
  'pehash',
])

export function isFileOrHashType(iocType: string): boolean {
  return FILE_HASH_TYPES.has(iocType.toLowerCase())
}

export function getRiskClasses(score: number): string {
  if (score >= 80) {
    return 'bg-severity-critical text-white'
  }
  if (score >= 60) {
    return 'bg-severity-high text-white'
  }
  if (score >= 30) {
    return 'bg-severity-medium text-white'
  }
  return 'bg-severity-low text-white'
}
