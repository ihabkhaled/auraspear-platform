import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, SUPPORTED_LOCALES } from '@/lib/constants/locales'

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('locale')?.value ?? ''
  const locale: SupportedLocale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE
  const messages = (await import(`./${locale}.json`)).default as Record<string, unknown>

  return {
    locale,
    messages,
    timeZone: DEFAULT_TIME_ZONE,
  }
})
