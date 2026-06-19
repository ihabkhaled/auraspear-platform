import { ConnectorStatus } from '@/enums'

export function deriveConnectorStatus(lastTestOk: boolean | null): ConnectorStatus {
  if (lastTestOk === true) return ConnectorStatus.CONNECTED
  if (lastTestOk === false) return ConnectorStatus.DISCONNECTED
  return ConnectorStatus.NOT_CONFIGURED
}
