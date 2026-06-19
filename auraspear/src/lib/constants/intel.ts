import { IOCSource, IOCType, StatusBgClass, StatusBorderClass, StatusTextClass } from '@/enums'

/** CSS class for the default/fallback tag styling. */
export const TAG_CLASS_DEFAULT = 'bg-secondary text-secondary-foreground border-border'

/** CSS class for TLP:RED tags. */
export const TAG_CLASS_TLP_RED =
  'bg-[var(--tag-tlp-red-bg)] text-[var(--tag-tlp-red)] border-[var(--tag-tlp-red-border)]'

/** CSS class for TLP:AMBER tags. */
export const TAG_CLASS_TLP_AMBER =
  'bg-[var(--tag-tlp-amber-bg)] text-[var(--tag-tlp-amber)] border-[var(--tag-tlp-amber-border)]'

/** CSS class for TLP:GREEN tags. */
export const TAG_CLASS_TLP_GREEN =
  'bg-[var(--tag-tlp-green-bg)] text-[var(--tag-tlp-green)] border-[var(--tag-tlp-green-border)]'

/** CSS class for TLP:WHITE / TLP:CLEAR tags. */
export const TAG_CLASS_TLP_WHITE = `${StatusBgClass.MUTED} ${StatusTextClass.MUTED} ${StatusBorderClass.BORDER}`

/** CSS class for APT tags. */
export const TAG_CLASS_APT =
  'bg-[var(--tag-apt-bg)] text-[var(--tag-apt)] border-[var(--tag-apt-border)]'

export const IOC_TYPE_OPTIONS: { value: IOCType; labelKey: string }[] = [
  { value: IOCType.IP, labelKey: 'search.typeIP' },
  { value: IOCType.DOMAIN, labelKey: 'search.typeDomain' },
  { value: IOCType.URL, labelKey: 'search.typeURL' },
  { value: IOCType.MD5, labelKey: 'search.typeMd5' },
  { value: IOCType.SHA1, labelKey: 'search.typeSha1' },
  { value: IOCType.SHA256, labelKey: 'search.typeSha256' },
  { value: IOCType.HASH, labelKey: 'search.typeHash' },
  { value: IOCType.FILE_NAME, labelKey: 'search.typeFilename' },
  { value: IOCType.CIDR, labelKey: 'search.typeCidr' },
  { value: IOCType.EMAIL, labelKey: 'search.typeEmail' },
  { value: IOCType.ASN, labelKey: 'search.typeAsn' },
  { value: IOCType.CVE, labelKey: 'search.typeCve' },
  { value: IOCType.REGISTRY_KEY, labelKey: 'search.typeRegistry' },
  { value: IOCType.FILE_PATH, labelKey: 'search.typeFilepath' },
]

export const IOC_SOURCE_OPTIONS: { value: IOCSource; labelKey: string }[] = [
  { value: IOCSource.MISP, labelKey: 'search.sourceMisp' },
  { value: IOCSource.WAZUH, labelKey: 'search.sourceWazuh' },
  { value: IOCSource.MANUAL, labelKey: 'search.sourceManual' },
  { value: IOCSource.THREATFOX, labelKey: 'search.sourceThreatfox' },
  { value: IOCSource.OTX, labelKey: 'search.sourceOtx' },
  { value: IOCSource.VIRUSTOTAL, labelKey: 'search.sourceVirustotal' },
  { value: IOCSource.LOGSTASH, labelKey: 'search.sourceLogstash' },
]
