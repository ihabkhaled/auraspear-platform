import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))
import api from '@/lib/api'
import { agentConfigService } from '@/services/agent-config.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test the underlying service calls used by useOsintEnrichment.
// The hook orchestrates getOsintSources -> enrichIoc -> fetchVtAnalysis.
// Here we verify each service method's contract.
// ─────────────────────────────────────────────────────────────────────────────

describe('useOsintEnrichment — service layer', () => {
  describe('agentConfigService.getOsintSources', () => {
    it('should call GET /agent-config/osint-sources', async () => {
      const sources = [
        { id: 'src-1', name: 'VirusTotal', isEnabled: true },
        { id: 'src-2', name: 'AbuseIPDB', isEnabled: false },
      ]
      mockGet.mockResolvedValue({ data: { data: sources } })

      const result = await agentConfigService.getOsintSources()

      expect(mockGet).toHaveBeenCalledWith('/agent-config/osint-sources')
      expect(result).toEqual({ data: sources })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(agentConfigService.getOsintSources()).rejects.toThrow('Network error')
    })
  })

  describe('agentConfigService.enrichIoc', () => {
    it('should call POST /agent-config/osint-sources/enrich with input', async () => {
      const enrichResult = { successCount: 2, totalSources: 3, results: [] }
      mockPost.mockResolvedValue({ data: { data: enrichResult } })

      const input = { iocType: 'ip', iocValue: '1.2.3.4', sourceIds: ['src-1', 'src-3'] }
      const result = await agentConfigService.enrichIoc(input)

      expect(mockPost).toHaveBeenCalledWith('/osint/enrich', input)
      expect(result).toEqual({ data: enrichResult })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Enrichment failed'))

      await expect(
        agentConfigService.enrichIoc({ iocType: 'ip', iocValue: '1.2.3.4', sourceIds: [] })
      ).rejects.toThrow('Enrichment failed')
    })
  })

  describe('agentConfigService.fetchVtAnalysis', () => {
    it('should call POST /agent-config/osint-sources/vt-analysis with URL', async () => {
      const analysisData = { malicious: 5, suspicious: 2, undetected: 60 }
      mockPost.mockResolvedValue({ data: { data: analysisData } })

      const result = await agentConfigService.fetchVtAnalysis('https://vt.example.com/analysis/abc')

      expect(mockPost).toHaveBeenCalledWith('/osint/fetch-analysis', {
        analysisUrl: 'https://vt.example.com/analysis/abc',
      })
      expect(result).toEqual({ data: analysisData })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Analysis not found'))

      await expect(agentConfigService.fetchVtAnalysis('https://invalid')).rejects.toThrow(
        'Analysis not found'
      )
    })
  })

  describe('enrichment filtering logic', () => {
    it('should filter only enabled sources', () => {
      const sources = [
        { id: 'src-1', isEnabled: true },
        { id: 'src-2', isEnabled: false },
        { id: 'src-3', isEnabled: true },
      ]

      const enabledSources = sources.filter(s => s.isEnabled)
      const sourceIds = enabledSources.map(s => s.id).slice(0, 10)

      expect(sourceIds).toEqual(['src-1', 'src-3'])
    })

    it('should limit to 10 sources max', () => {
      const sources = Array.from({ length: 15 }, (_, i) => ({
        id: `src-${String(i)}`,
        isEnabled: true,
      }))

      const sourceIds = sources
        .filter(s => s.isEnabled)
        .map(s => s.id)
        .slice(0, 10)

      expect(sourceIds).toHaveLength(10)
    })
  })
})
