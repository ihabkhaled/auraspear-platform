import { type ConnectorAuthType, type ConnectorCategory, type ConnectorType } from '@/enums'
import type { LucideIcon } from 'lucide-react'

/** Backend connector response shape */
export interface ConnectorRecord {
  type: ConnectorType
  name: string
  enabled: boolean
  authType: ConnectorAuthType
  config: Record<string, unknown>
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
}

export interface ConnectorTestResult {
  type: string
  ok: boolean
  latencyMs: number
  details: string
  testedAt: string
}

export interface ConnectorTestResult {
  type: string
  ok: boolean
  latencyMs: number
  details: string
  testedAt: string
}

export interface ConnectorMeta {
  label: string
  descriptionKey: string
  category: ConnectorCategory
}

export interface SecurityPosture {
  mTLS: boolean
  iam: boolean
  encryption: boolean
}

export interface ConnectorIcon {
  type: ConnectorType
  icon: LucideIcon
}
