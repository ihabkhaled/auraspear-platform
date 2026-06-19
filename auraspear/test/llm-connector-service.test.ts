import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { llmConnectorService } from '@/services/llm-connector.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('llmConnectorService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAll ─────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should call GET /llm-connectors and return data', async () => {
      const connectors = [
        { id: 'c1', name: 'OpenAI', enabled: true },
        { id: 'c2', name: 'Anthropic', enabled: false },
      ]
      mockGet.mockResolvedValue({ data: { data: connectors } })

      const result = await llmConnectorService.getAll()

      expect(mockGet).toHaveBeenCalledWith('/llm-connectors')
      expect(result.data).toEqual(connectors)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(llmConnectorService.getAll()).rejects.toThrow('Network error')
    })
  })

  // ─── getById ────────────────────────────────────────────────────

  describe('getById', () => {
    it('should call GET /llm-connectors/:id and return data', async () => {
      const connector = { id: 'c1', name: 'OpenAI', enabled: true }
      mockGet.mockResolvedValue({ data: { data: connector } })

      const result = await llmConnectorService.getById('c1')

      expect(mockGet).toHaveBeenCalledWith('/llm-connectors/c1')
      expect(result.data).toEqual(connector)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(llmConnectorService.getById('missing')).rejects.toThrow('Not found')
    })
  })

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('should call POST /llm-connectors with data', async () => {
      const input = {
        name: 'New LLM',
        baseUrl: 'https://api.example.com',
        apiKey: 'sk-test-key-123456',
      }
      const created = { id: 'c3', ...input, enabled: true }
      mockPost.mockResolvedValue({ data: { data: created } })

      const result = await llmConnectorService.create(input)

      expect(mockPost).toHaveBeenCalledWith('/llm-connectors', input)
      expect(result.data).toEqual(created)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(
        llmConnectorService.create({
          name: '',
          baseUrl: 'https://api.example.com',
          apiKey: 'sk-key',
        })
      ).rejects.toThrow('Validation failed')
    })
  })

  // ─── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('should call PATCH /llm-connectors/:id with data', async () => {
      const updateData = { name: 'Updated LLM', timeout: 60000 }
      const updated = { id: 'c1', ...updateData, enabled: true }
      mockPatch.mockResolvedValue({ data: { data: updated } })

      const result = await llmConnectorService.update('c1', updateData)

      expect(mockPatch).toHaveBeenCalledWith('/llm-connectors/c1', updateData)
      expect(result.data).toEqual(updated)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(llmConnectorService.update('c1', { name: 'X' })).rejects.toThrow('Forbidden')
    })
  })

  // ─── delete ─────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call DELETE /llm-connectors/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await llmConnectorService.delete('c1')

      expect(mockDelete).toHaveBeenCalledWith('/llm-connectors/c1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(llmConnectorService.delete('missing')).rejects.toThrow('Not found')
    })
  })

  // ─── test ───────────────────────────────────────────────────────

  describe('test', () => {
    it('should call POST /llm-connectors/:id/test', async () => {
      const testResult = {
        id: 'c1',
        ok: true,
        details: 'Connection successful',
        testedAt: '2026-03-21T12:00:00Z',
      }
      mockPost.mockResolvedValue({ data: { data: testResult } })

      const result = await llmConnectorService.test('c1')

      expect(mockPost).toHaveBeenCalledWith('/llm-connectors/c1/test')
      expect(result.data).toEqual(testResult)
    })

    it('should return failed test result', async () => {
      const testResult = {
        id: 'c1',
        ok: false,
        details: 'Connection refused',
        testedAt: '2026-03-21T12:00:00Z',
      }
      mockPost.mockResolvedValue({ data: { data: testResult } })

      const result = await llmConnectorService.test('c1')

      expect(result.data.ok).toBe(false)
      expect(result.data.details).toBe('Connection refused')
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Timeout'))

      await expect(llmConnectorService.test('c1')).rejects.toThrow('Timeout')
    })
  })

  // ─── toggle ─────────────────────────────────────────────────────

  describe('toggle', () => {
    it('should call POST /llm-connectors/:id/toggle', async () => {
      const toggled = { id: 'c1', name: 'OpenAI', enabled: false }
      mockPost.mockResolvedValue({ data: { data: toggled } })

      const result = await llmConnectorService.toggle('c1')

      expect(mockPost).toHaveBeenCalledWith('/llm-connectors/c1/toggle')
      expect(result.data).toEqual(toggled)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      await expect(llmConnectorService.toggle('c1')).rejects.toThrow('Server error')
    })
  })

  // ─── getAvailable ───────────────────────────────────────────────

  describe('getAvailable', () => {
    it('should call GET /connectors/ai-available and extract data.data', async () => {
      const available = [
        { key: 'openai', label: 'OpenAI', type: 'llm_apis', enabled: true },
        { key: 'bedrock', label: 'Bedrock', type: 'bedrock', enabled: false },
      ]
      mockGet.mockResolvedValue({ data: { data: available } })

      const result = await llmConnectorService.getAvailable()

      expect(mockGet).toHaveBeenCalledWith('/connectors/ai-available')
      expect(result).toEqual(available)
    })

    it('should return empty array when data.data is null', async () => {
      mockGet.mockResolvedValue({ data: { data: null } })

      const result = await llmConnectorService.getAvailable()

      expect(result).toEqual([])
    })

    it('should return empty array when data.data is undefined', async () => {
      mockGet.mockResolvedValue({ data: {} })

      const result = await llmConnectorService.getAvailable()

      expect(result).toEqual([])
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'))

      await expect(llmConnectorService.getAvailable()).rejects.toThrow('Unauthorized')
    })
  })
})
