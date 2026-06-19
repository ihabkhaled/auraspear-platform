import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import { OsintAuthType, OsintSourceType } from '@/enums'
import api from '@/lib/api'
import { agentConfigService } from '@/services/agent-config.service'
import type {
  CreateAiPromptInput,
  CreateOsintSourceInput,
  OsintEnrichInput,
  OsintQueryInput,
  UpdateAgentConfigInput,
} from '@/types'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('agentConfigService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Agent Configs ────────────────────────────────────────────

  describe('getAgentConfigs', () => {
    it('should call GET /agent-config/agents', async () => {
      const configs = [{ agentId: 'orchestrator', enabled: true }]
      mockGet.mockResolvedValue({ data: { data: configs } })

      const result = await agentConfigService.getAgentConfigs()

      expect(mockGet).toHaveBeenCalledWith('/agent-config/agents')
      expect(result.data).toEqual(configs)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'))

      await expect(agentConfigService.getAgentConfigs()).rejects.toThrow('Unauthorized')
    })
  })

  describe('updateAgentConfig', () => {
    it('should call PATCH /agent-config/agents/:agentId', async () => {
      const config = { agentId: 'orchestrator', maxTokensPerDay: 5000 }
      mockPatch.mockResolvedValue({ data: { data: config } })

      const input: UpdateAgentConfigInput = { tokensPerDay: 5000 }
      const result = await agentConfigService.updateAgentConfig('orchestrator', input)

      expect(mockPatch).toHaveBeenCalledWith('/agent-config/agents/orchestrator', input)
      expect(result.data).toEqual(config)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Validation failed'))

      await expect(agentConfigService.updateAgentConfig('orchestrator', {})).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('toggleAgent', () => {
    it('should call POST /agent-config/agents/:agentId/toggle', async () => {
      const config = { agentId: 'orchestrator', enabled: false }
      mockPost.mockResolvedValue({ data: { data: config } })

      const result = await agentConfigService.toggleAgent('orchestrator', false)

      expect(mockPost).toHaveBeenCalledWith('/agent-config/agents/orchestrator/toggle', {
        enabled: false,
      })
      expect(result.data).toEqual(config)
    })
  })

  describe('resetUsage', () => {
    it('should call POST /agent-config/agents/:agentId/reset-usage/:period', async () => {
      const config = { agentId: 'orchestrator', tokensUsedToday: 0 }
      mockPost.mockResolvedValue({ data: { data: config } })

      const result = await agentConfigService.resetUsage('orchestrator', 'daily')

      expect(mockPost).toHaveBeenCalledWith('/agent-config/agents/orchestrator/reset-usage/daily')
      expect(result.data).toEqual(config)
    })
  })

  // ─── OSINT Sources ────────────────────────────────────────────

  describe('getOsintSources', () => {
    it('should call GET /agent-config/osint-sources', async () => {
      const sources = [{ id: 'src-1', name: 'VirusTotal', enabled: true }]
      mockGet.mockResolvedValue({ data: { data: sources } })

      const result = await agentConfigService.getOsintSources()

      expect(mockGet).toHaveBeenCalledWith('/agent-config/osint-sources')
      expect(result.data).toEqual(sources)
    })
  })

  describe('createOsintSource', () => {
    it('should call POST /agent-config/osint-sources', async () => {
      const source = { id: 'src-2', name: 'AbuseIPDB' }
      mockPost.mockResolvedValue({ data: { data: source } })

      const input: CreateOsintSourceInput = {
        name: 'AbuseIPDB',
        sourceType: OsintSourceType.ABUSEIPDB,
        authType: OsintAuthType.API_KEY_HEADER,
      }
      const result = await agentConfigService.createOsintSource(input)

      expect(mockPost).toHaveBeenCalledWith('/agent-config/osint-sources', input)
      expect(result.data).toEqual(source)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(
        agentConfigService.createOsintSource({
          name: '',
          sourceType: OsintSourceType.CUSTOM,
          authType: OsintAuthType.NONE,
        })
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('testOsintSource', () => {
    it('should call POST /agent-config/osint-sources/:id/test', async () => {
      const testResult = { success: true, message: 'Connection OK' }
      mockPost.mockResolvedValue({ data: { data: testResult } })

      const result = await agentConfigService.testOsintSource('src-1')

      expect(mockPost).toHaveBeenCalledWith('/agent-config/osint-sources/src-1/test')
      expect(result.data).toEqual(testResult)
    })
  })

  describe('deleteOsintSource', () => {
    it('should call DELETE /agent-config/osint-sources/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await agentConfigService.deleteOsintSource('src-1')

      expect(mockDelete).toHaveBeenCalledWith('/agent-config/osint-sources/src-1')
      expect(result.data).toEqual({ deleted: true })
    })
  })

  // ─── Prompts ──────────────────────────────────────────────────

  describe('getPrompts', () => {
    it('should call GET /ai-prompts', async () => {
      const prompts = [{ id: 'p-1', name: 'Triage Prompt' }]
      mockGet.mockResolvedValue({ data: { data: prompts } })

      const result = await agentConfigService.getPrompts()

      expect(mockGet).toHaveBeenCalledWith('/ai-prompts')
      expect(result.data).toEqual(prompts)
    })
  })

  describe('createPrompt', () => {
    it('should call POST /ai-prompts', async () => {
      const prompt = { id: 'p-2', name: 'New Prompt' }
      mockPost.mockResolvedValue({ data: { data: prompt } })

      const input: CreateAiPromptInput = {
        name: 'New Prompt',
        taskType: 'triage',
        content: 'Summarize: {{context}}',
      }
      const result = await agentConfigService.createPrompt(input)

      expect(mockPost).toHaveBeenCalledWith('/ai-prompts', input)
      expect(result.data).toEqual(prompt)
    })
  })

  describe('activatePrompt', () => {
    it('should call POST /ai-prompts/:id/activate', async () => {
      const prompt = { id: 'p-1', isActive: true }
      mockPost.mockResolvedValue({ data: { data: prompt } })

      const result = await agentConfigService.activatePrompt('p-1')

      expect(mockPost).toHaveBeenCalledWith('/ai-prompts/p-1/activate')
      expect(result.data).toEqual(prompt)
    })
  })

  describe('deletePrompt', () => {
    it('should call DELETE /ai-prompts/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await agentConfigService.deletePrompt('p-1')

      expect(mockDelete).toHaveBeenCalledWith('/ai-prompts/p-1')
      expect(result.data).toEqual({ deleted: true })
    })
  })

  // ─── Features ─────────────────────────────────────────────────

  describe('getFeatures', () => {
    it('should call GET /ai-features', async () => {
      const features = [{ featureKey: 'triage', enabled: true }]
      mockGet.mockResolvedValue({ data: { data: features } })

      const result = await agentConfigService.getFeatures()

      expect(mockGet).toHaveBeenCalledWith('/ai-features')
      expect(result.data).toEqual(features)
    })
  })

  describe('updateFeature', () => {
    it('should call PATCH /ai-features/:featureKey', async () => {
      const feature = { featureKey: 'triage', enabled: false }
      mockPatch.mockResolvedValue({ data: { data: feature } })

      const input = { enabled: false }
      const result = await agentConfigService.updateFeature('triage', input)

      expect(mockPatch).toHaveBeenCalledWith('/ai-features/triage', input)
      expect(result.data).toEqual(feature)
    })
  })

  // ─── OSINT Query & Enrich ────────────────────────────────────

  describe('queryOsintSource', () => {
    it('should call POST /osint/query', async () => {
      const queryResult = { results: [{ ioc: '1.2.3.4', score: 85 }] }
      mockPost.mockResolvedValue({ data: { data: queryResult } })

      const input: OsintQueryInput = { sourceId: 'src-1', iocType: 'ip', iocValue: '1.2.3.4' }
      const result = await agentConfigService.queryOsintSource(input)

      expect(mockPost).toHaveBeenCalledWith('/osint/query', input)
      expect(result.data).toEqual(queryResult)
    })
  })

  describe('enrichIoc', () => {
    it('should call POST /osint/enrich', async () => {
      const enrichResult = { enrichments: [{ source: 'VT', score: 10 }] }
      mockPost.mockResolvedValue({ data: { data: enrichResult } })

      const input: OsintEnrichInput = { iocType: 'ip', iocValue: '1.2.3.4', sourceIds: ['src-1'] }
      const result = await agentConfigService.enrichIoc(input)

      expect(mockPost).toHaveBeenCalledWith('/osint/enrich', input)
      expect(result.data).toEqual(enrichResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Source unavailable'))

      await expect(
        agentConfigService.enrichIoc({ iocType: 'ip', iocValue: '1.2.3.4', sourceIds: ['src-1'] })
      ).rejects.toThrow('Source unavailable')
    })
  })
})
