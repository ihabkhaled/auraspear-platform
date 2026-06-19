import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import { ConnectorType } from '@/enums'
import api from '@/lib/api'
import { connectorService } from '@/services/connector.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('connectorService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── list ─────────────────────────────────────────────────────

  describe('list', () => {
    it('should call GET /connectors and extract data.data', async () => {
      const connectors = [
        { id: 'c-1', type: ConnectorType.WAZUH, enabled: true },
        { id: 'c-2', type: 'graylog', enabled: false },
      ]
      mockGet.mockResolvedValue({ data: { data: connectors } })

      const result = await connectorService.list()

      expect(mockGet).toHaveBeenCalledWith('/connectors')
      expect(result).toEqual(connectors)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(connectorService.list()).rejects.toThrow('Network error')
    })
  })

  // ─── getByType ────────────────────────────────────────────────

  describe('getByType', () => {
    it('should call GET /connectors/:type and extract data.data', async () => {
      const connector = { id: 'c-1', type: ConnectorType.WAZUH, enabled: true }
      mockGet.mockResolvedValue({ data: { data: connector } })

      const result = await connectorService.getByType('wazuh')

      expect(mockGet).toHaveBeenCalledWith('/connectors/wazuh')
      expect(result).toEqual(connector)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(connectorService.getByType('unknown')).rejects.toThrow('Not found')
    })
  })

  // ─── getStats ─────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /connectors/stats and extract data.data', async () => {
      const stats = { total: 5, enabled: 3, disabled: 2 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await connectorService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/connectors/stats')
      expect(result).toEqual(stats)
    })
  })

  // ─── update ───────────────────────────────────────────────────

  describe('update', () => {
    it('should call PATCH /connectors/:type and extract data.data', async () => {
      const connector = { id: 'c-1', type: ConnectorType.WAZUH, baseUrl: 'https://new-url.com' }
      mockPatch.mockResolvedValue({ data: { data: connector } })

      const input = { baseUrl: 'https://new-url.com' }
      const result = await connectorService.update('wazuh', input)

      expect(mockPatch).toHaveBeenCalledWith('/connectors/wazuh', input)
      expect(result).toEqual(connector)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(connectorService.update('wazuh', {})).rejects.toThrow('Forbidden')
    })
  })

  // ─── test ─────────────────────────────────────────────────────

  describe('test', () => {
    it('should call POST /connectors/:type/test and extract data.data', async () => {
      const testResult = { success: true, latencyMs: 120 }
      mockPost.mockResolvedValue({ data: { data: testResult } })

      const result = await connectorService.test('wazuh')

      expect(mockPost).toHaveBeenCalledWith('/connectors/wazuh/test')
      expect(result).toEqual(testResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Connection refused'))

      await expect(connectorService.test('wazuh')).rejects.toThrow('Connection refused')
    })
  })

  // ─── toggle ───────────────────────────────────────────────────

  describe('toggle', () => {
    it('should call POST /connectors/:type/toggle with enabled flag', async () => {
      const connector = { id: 'c-1', type: ConnectorType.WAZUH, enabled: false }
      mockPost.mockResolvedValue({ data: { data: connector } })

      const result = await connectorService.toggle({ type: ConnectorType.WAZUH, enabled: false })

      expect(mockPost).toHaveBeenCalledWith('/connectors/wazuh/toggle', { enabled: false })
      expect(result).toEqual(connector)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      await expect(
        connectorService.toggle({ type: ConnectorType.WAZUH, enabled: true })
      ).rejects.toThrow('Server error')
    })
  })

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    it('should call DELETE /connectors/:type', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await connectorService.remove('wazuh')

      expect(mockDelete).toHaveBeenCalledWith('/connectors/wazuh')
      expect(result).toEqual({ data: { deleted: true } })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(connectorService.remove('unknown')).rejects.toThrow('Not found')
    })
  })

  // ─── sync ─────────────────────────────────────────────────────

  describe('sync', () => {
    it('should call POST /connector-sync/:type/sync', async () => {
      const syncResult = { jobId: 'job-1', status: 'queued' }
      mockPost.mockResolvedValue({ data: { data: syncResult } })

      const result = await connectorService.sync('wazuh')

      expect(mockPost).toHaveBeenCalledWith('/connector-sync/wazuh/sync')
      expect(result).toEqual(syncResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Sync already in progress'))

      await expect(connectorService.sync('wazuh')).rejects.toThrow('Sync already in progress')
    })
  })

  // ─── getSyncStatus ────────────────────────────────────────────

  describe('getSyncStatus', () => {
    it('should call GET /connector-sync/status', async () => {
      const statuses = [{ type: ConnectorType.WAZUH, lastSync: '2026-01-01T00:00:00Z' }]
      mockGet.mockResolvedValue({ data: { data: statuses } })

      const result = await connectorService.getSyncStatus()

      expect(mockGet).toHaveBeenCalledWith('/connector-sync/status')
      expect(result).toEqual(statuses)
    })
  })
})
