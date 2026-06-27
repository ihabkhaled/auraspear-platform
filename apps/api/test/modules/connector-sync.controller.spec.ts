import { ConnectorSyncController } from '../../src/modules/connector-sync/connector-sync.controller'

const TENANT_ID = 'tenant-001'

const mockSyncService = {
  syncConnector: jest.fn(),
  getSyncStatus: jest.fn(),
}

describe('ConnectorSyncController', () => {
  let controller: ConnectorSyncController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ConnectorSyncController(mockSyncService as never)
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
    it('should return formatted sync status for all connectors via service', async () => {
      const mockStatus = [
        {
          type: 'graylog',
          lastSyncAt: '2026-03-14T12:00:00.000Z',
          syncEnabled: true,
          enabled: true,
        },
        { type: 'wazuh', lastSyncAt: null, syncEnabled: false, enabled: true },
        {
          type: 'misp',
          lastSyncAt: '2026-03-14T12:00:00.000Z',
          syncEnabled: true,
          enabled: false,
        },
      ]
      mockSyncService.getSyncStatus.mockResolvedValue(mockStatus)

      const result = await controller.getSyncStatus(TENANT_ID)

      expect(result).toEqual(mockStatus)
      expect(mockSyncService.getSyncStatus).toHaveBeenCalledWith(TENANT_ID)
    })

    it('should return empty array when no connectors exist', async () => {
      mockSyncService.getSyncStatus.mockResolvedValue([])

      const result = await controller.getSyncStatus(TENANT_ID)

      expect(result).toEqual([])
    })
  })
})
