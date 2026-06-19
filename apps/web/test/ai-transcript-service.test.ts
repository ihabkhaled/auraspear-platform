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
import { aiTranscriptService } from '@/services/ai-transcript.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('aiTranscriptService', () => {
  // ─── getStats ─────────────────────────────────────────────────

  describe('getStats', () => {
    it('calls GET /ai-transcripts/stats and extracts data', async () => {
      const stats = { totalThreads: 50, totalMessages: 320, totalAuditLogs: 120 }
      mockGet.mockResolvedValueOnce({ data: { data: stats } })

      const result = await aiTranscriptService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/stats')
      expect(result).toEqual(stats)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiTranscriptService.getStats()).rejects.toThrow('Forbidden')
    })
  })

  // ─── listThreads ──────────────────────────────────────────────

  describe('listThreads', () => {
    it('calls GET /ai-transcripts/threads with params and returns { data, total }', async () => {
      const threads = [
        { id: 't1', title: 'Thread 1', createdAt: '2024-01-01T00:00:00Z' },
        { id: 't2', title: 'Thread 2', createdAt: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce({ data: { data: threads, total: 2 } })

      const result = await aiTranscriptService.listThreads({ limit: 10, offset: 0 })

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/threads', {
        params: { limit: 10, offset: 0 },
      })
      expect(result).toEqual({ data: threads, total: 2 })
    })

    it('handles empty response', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } })

      const result = await aiTranscriptService.listThreads()

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/threads', { params: undefined })
      expect(result).toEqual({ data: [], total: 0 })
    })

    it('returns empty array when data is not an array', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: null, total: 0 } })

      const result = await aiTranscriptService.listThreads()

      expect(result).toEqual({ data: [], total: 0 })
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'))

      await expect(aiTranscriptService.listThreads()).rejects.toThrow('Server error')
    })
  })

  // ─── getThreadMessages ────────────────────────────────────────

  describe('getThreadMessages', () => {
    it('calls GET /ai-transcripts/threads/:id/messages and extracts data', async () => {
      const messages = [
        { id: 'msg1', role: 'user', content: 'Hello' },
        { id: 'msg2', role: 'assistant', content: 'Hi there' },
      ]
      mockGet.mockResolvedValueOnce({ data: { data: messages } })

      const result = await aiTranscriptService.getThreadMessages('t1')

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/threads/t1/messages')
      expect(result).toEqual(messages)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'))

      await expect(aiTranscriptService.getThreadMessages('bad-id')).rejects.toThrow('Not found')
    })
  })

  // ─── listAuditLogs ────────────────────────────────────────────

  describe('listAuditLogs', () => {
    it('calls GET /ai-transcripts/audit-logs with params and returns { data, total }', async () => {
      const logs = [
        { id: 'log1', action: 'chat_message', createdAt: '2024-01-01T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce({ data: { data: logs, total: 1 } })

      const result = await aiTranscriptService.listAuditLogs({ limit: 20, offset: 0 })

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/audit-logs', {
        params: { limit: 20, offset: 0 },
      })
      expect(result).toEqual({ data: logs, total: 1 })
    })

    it('returns empty array when data is not an array', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: null, total: 0 } })

      const result = await aiTranscriptService.listAuditLogs()

      expect(result).toEqual({ data: [], total: 0 })
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiTranscriptService.listAuditLogs()).rejects.toThrow('Forbidden')
    })
  })

  // ─── toggleLegalHold ──────────────────────────────────────────

  describe('toggleLegalHold', () => {
    it('calls POST /ai-transcripts/threads/:id/legal-hold and extracts data', async () => {
      const thread = { id: 't1', title: 'Thread 1', legalHold: true }
      mockPost.mockResolvedValueOnce({ data: { data: thread } })

      const result = await aiTranscriptService.toggleLegalHold('t1', true)

      expect(mockPost).toHaveBeenCalledWith('/ai-transcripts/threads/t1/legal-hold', {
        legalHold: true,
      })
      expect(result).toEqual(thread)
    })

    it('calls with legalHold=false to release hold', async () => {
      const thread = { id: 't1', title: 'Thread 1', legalHold: false }
      mockPost.mockResolvedValueOnce({ data: { data: thread } })

      const result = await aiTranscriptService.toggleLegalHold('t1', false)

      expect(mockPost).toHaveBeenCalledWith('/ai-transcripts/threads/t1/legal-hold', {
        legalHold: false,
      })
      expect(result).toEqual(thread)
    })

    it('propagates API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Not found'))

      await expect(aiTranscriptService.toggleLegalHold('bad-id', true)).rejects.toThrow('Not found')
    })
  })

  // ─── redactThread ─────────────────────────────────────────────

  describe('redactThread', () => {
    it('calls POST /ai-transcripts/threads/:id/redact and extracts data', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: { redacted: 5 } } })

      const result = await aiTranscriptService.redactThread('t1')

      expect(mockPost).toHaveBeenCalledWith('/ai-transcripts/threads/t1/redact')
      expect(result).toEqual({ redacted: 5 })
    })

    it('propagates API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiTranscriptService.redactThread('bad-id')).rejects.toThrow('Forbidden')
    })
  })

  // ─── exportThread ─────────────────────────────────────────────

  describe('exportThread', () => {
    it('calls GET /ai-transcripts/export/thread/:id and extracts data', async () => {
      const exported = {
        thread: { id: 't1', title: 'Thread 1' },
        messages: [{ id: 'msg1', role: 'user', content: 'Hello' }],
      }
      mockGet.mockResolvedValueOnce({ data: { data: exported } })

      const result = await aiTranscriptService.exportThread('t1')

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/export/thread/t1')
      expect(result).toEqual(exported)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'))

      await expect(aiTranscriptService.exportThread('bad-id')).rejects.toThrow('Not found')
    })
  })

  // ─── exportAuditLogs ──────────────────────────────────────────

  describe('exportAuditLogs', () => {
    it('calls GET /ai-transcripts/export/audit-logs with from/to params', async () => {
      const logs = [{ id: 'log1', action: 'chat_message' }]
      mockGet.mockResolvedValueOnce({ data: { data: logs } })

      const result = await aiTranscriptService.exportAuditLogs('2024-01-01', '2024-01-31')

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/export/audit-logs', {
        params: { from: '2024-01-01', to: '2024-01-31' },
      })
      expect(result).toEqual(logs)
    })

    it('calls without params when none provided', async () => {
      const logs = [{ id: 'log1', action: 'chat_message' }]
      mockGet.mockResolvedValueOnce({ data: { data: logs } })

      const result = await aiTranscriptService.exportAuditLogs()

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/export/audit-logs', { params: {} })
      expect(result).toEqual(logs)
    })

    it('calls with only from param', async () => {
      const logs: unknown[] = []
      mockGet.mockResolvedValueOnce({ data: { data: logs } })

      const result = await aiTranscriptService.exportAuditLogs('2024-01-01')

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/export/audit-logs', {
        params: { from: '2024-01-01' },
      })
      expect(result).toEqual([])
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiTranscriptService.exportAuditLogs()).rejects.toThrow('Forbidden')
    })
  })

  // ─── getPolicy ────────────────────────────────────────────────

  describe('getPolicy', () => {
    it('calls GET /ai-transcripts/policy and extracts data', async () => {
      const policy = {
        chatRetentionDays: 90,
        auditRetentionDays: 365,
        autoRedactPii: true,
        requireLegalHold: false,
      }
      mockGet.mockResolvedValueOnce({ data: { data: policy } })

      const result = await aiTranscriptService.getPolicy()

      expect(mockGet).toHaveBeenCalledWith('/ai-transcripts/policy')
      expect(result).toEqual(policy)
    })

    it('returns null when no policy exists', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: null } })

      const result = await aiTranscriptService.getPolicy()

      expect(result).toBeNull()
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'))

      await expect(aiTranscriptService.getPolicy()).rejects.toThrow('Server error')
    })
  })

  // ─── upsertPolicy ────────────────────────────────────────────

  describe('upsertPolicy', () => {
    it('calls PATCH /ai-transcripts/policy and extracts data', async () => {
      const input = {
        chatRetentionDays: 60,
        auditRetentionDays: 180,
        autoRedactPii: false,
        requireLegalHold: true,
      }
      const saved = { id: 'pol1', ...input }
      mockPatch.mockResolvedValueOnce({ data: { data: saved } })

      const result = await aiTranscriptService.upsertPolicy(input)

      expect(mockPatch).toHaveBeenCalledWith('/ai-transcripts/policy', input)
      expect(result).toEqual(saved)
    })

    it('propagates API errors', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Validation error'))

      await expect(
        aiTranscriptService.upsertPolicy({
          chatRetentionDays: -1,
          auditRetentionDays: 0,
          autoRedactPii: false,
          requireLegalHold: false,
        })
      ).rejects.toThrow('Validation error')
    })
  })

  // ─── runCleanup ───────────────────────────────────────────────

  describe('runCleanup', () => {
    it('calls POST /ai-transcripts/cleanup and extracts data', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: { chats: 3, audits: 7 } } })

      const result = await aiTranscriptService.runCleanup()

      expect(mockPost).toHaveBeenCalledWith('/ai-transcripts/cleanup')
      expect(result).toEqual({ chats: 3, audits: 7 })
    })

    it('propagates API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiTranscriptService.runCleanup()).rejects.toThrow('Forbidden')
    })
  })
})
