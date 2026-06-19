'use client'

import { AiChatPanel } from '@/components/ai-config'
import { PageHeader } from '@/components/common'
import { useAiChatPage } from '@/hooks'

export default function AiChatPage() {
  const { t } = useAiChatPage()

  return (
    <div className="space-y-6">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')} />
      <AiChatPanel />
    </div>
  )
}
