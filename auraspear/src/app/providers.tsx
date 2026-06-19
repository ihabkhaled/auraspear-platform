'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { useProviders } from '@/hooks'
import { DEFAULT_TIME_ZONE } from '@/lib/constants/locales'
import { SerwistProvider } from '@/lib/serwist-client'
import type { ProvidersProps } from '@/types'

export function Providers({ children, messages, locale }: ProvidersProps) {
  const { queryClient } = useProviders()

  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      <NextIntlClientProvider messages={messages} locale={locale} timeZone={DEFAULT_TIME_ZONE}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    </SerwistProvider>
  )
}
