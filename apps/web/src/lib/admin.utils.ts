import { AppLogLevel, StatusBgClass, StatusBorderClass, StatusTextClass } from '@/enums'

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z\d\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
}

export function getLevelClasses(level: string): string {
  switch (level) {
    case AppLogLevel.ERROR:
      return `${StatusBgClass.ERROR} ${StatusTextClass.WHITE} ${StatusBorderClass.ERROR}`
    case AppLogLevel.WARN:
      return `${StatusBgClass.WARNING} ${StatusTextClass.WHITE} ${StatusBorderClass.WARNING}`
    case AppLogLevel.INFO:
      return `${StatusBgClass.INFO} ${StatusTextClass.WHITE} ${StatusBorderClass.INFO}`
    case AppLogLevel.DEBUG:
      return `${StatusBgClass.MUTED} ${StatusTextClass.MUTED} ${StatusBorderClass.BORDER}`
    default:
      return ''
  }
}
