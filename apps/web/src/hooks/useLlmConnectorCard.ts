import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { deriveConnectorStatus } from '@/lib/connectors.utils'
import type { LlmConnectorCardProps } from '@/types'

export function useLlmConnectorCard({ connector }: Pick<LlmConnectorCardProps, 'connector'>) {
  const router = useRouter()
  const connectorStatus = deriveConnectorStatus(connector.lastTestOk)

  const handleManage = useCallback(() => {
    router.push('/connectors/llm')
  }, [router])

  return {
    connectorStatus,
    handleManage,
  }
}
