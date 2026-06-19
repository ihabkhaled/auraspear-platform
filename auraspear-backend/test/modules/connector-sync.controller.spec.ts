import { toDay } from '../../src/common/utils/date-time.utility'
import { ConnectorSyncController } from '../../src/modules/connector-sync/connector-sync.controller'

const TENANT_ID = 'tenant-001'

const mockSyncService = {
  syncConnector: jest.fn(),
}

function createMockPrisma() {
  return {
    connectorConfig: {
      findMany: jest.fn(),
    },
  }
}

describe('ConnectorSyncController', () => {
  let controller: ConnectorSyncController
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = createMockPrisma()
    controller = new ConnectorSyncController(mockSyncService as never, prisma as never)
  })

  describe('triggerSync', () => {
    it('should delegate to sync service', async () => {
      mockSyncService.syncConnector.mockResolvedValue({
        success: true,
        message: 'Synced 10 records from wazuh',
        ingested: 10,
      })

      const result = await controller.triggerSync(TENANT_ID, 'wazuh')

      expect(result).toEqual({
        success: true,
        message: 'Synced 10 records from wazuh',
        ingested: 10,
      })
      expect(mockSyncService.syncConnector).toHaveBeenCalledWith(TENANT_ID, 'wazuh')
    })

    it('should return failure for unsupported type', async () => {
      mockSyncService.syncConnector.mockResolvedValue({
        success: false,
        message: "Connector type 'grafana' does not support data sync",
      })

      const result = await controller.triggerSync(TENANT_ID, 'grafana')

      expect(result.success).toBe(false)
    })
  })

  describe('getSyncStatus', () => {
    it('should return formatted sync status for all connectors', async () => {
      const now = toDay('2026-03-14T12:00:00Z').toDate()
      prisma.connectorConfig.findMany.mockResolvedValue([
        { type: 'graylog', lastSyncAt: now, syncEnabled: true, enabled: true },
        { type: 'wazuh', lastSyncAt: null, syncEnabled: false, enabled: true },
        { type: 'misp', lastSyncAt: now, syncEnabled: true, enabled: false },
      ])

      const result = await controller.getSyncStatus(TENANT_ID)

      expect(result).toEqual([
        {
          type: 'graylog',
          lastSyncAt: '2026-03-14T12:00:00.000Z',
          syncEnabled: true,
          enabled: true,
        },
        { type: 'wazuh', lastSyncAt: null, syncEnabled: false, enabled: true },
        { type: 'misp', lastSyncAt: '2026-03-14T12:00:00.000Z', syncEnabled: true, enabled: false },
      ])

      expect(prisma.connectorConfig.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        select: { type: true, lastSyncAt: true, syncEnabled: true, enabled: true },
        orderBy: { type: 'asc' },
      })
    })

    it('should return empty array when no connectors exist', async () => {
      prisma.connectorConfig.findMany.mockResolvedValue([])

      const result = await controller.getSyncStatus(TENANT_ID)

      expect(result).toEqual([])
    })
  })
})
