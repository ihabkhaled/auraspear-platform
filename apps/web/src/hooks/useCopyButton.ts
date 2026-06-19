import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { copyToClipboard } from '@/lib/utils'

export function useCopyButton(value: string) {
  const t = useTranslations('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(value)
      setCopied(true)
      Toast.success(t('copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      Toast.error(t('copyId'))
    }
  }

  return { t, copied, handleCopy }
}
