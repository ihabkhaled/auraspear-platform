import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/lib/api'
import { aiUsageService } from '@/services/ai-usage.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockPut = api.put as Mock
const mockDelete = api.delete as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('aiUsageService', () => {
  // ─── getUsageSummary ──────────────────────────────────────────

  describe('getUsageSummary', () => {
    it('calls GET /ai-usage with date params and extracts data', async () => {
      const summary = { totalRequests: 500, totalTokens: 120000, costUsd: 12.5 }
      mockGet.mockResolvedValueOnce({ data: { data: summary } })

      const result = await aiUsageService.getUsageSummary('2024-01-01', '2024-01-31')

      expect(mockGet).toHaveBeenCalledWith('/ai-usage', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      })
      expect(result).toEqual(summary)
    })

    it('calls GET /ai-usage without date params', async () => {
      const summary = { totalRequests: 100, totalTokens: 25000, costUsd: 3.2 }
      mockGet.mockResolvedValueOnce({ data: { data: summary } })

      const result = await aiUsageService.getUsageSummary()

      expect(mockGet).toHaveBeenCalledWith('/ai-usage', {
        params: { startDate: undefined, endDate: undefined },
      })
      expect(result).toEqual(summary)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'))

      await expect(aiUsageService.getUsageSummary()).rejects.toThrow('Server error')
    })
  })

  // ─── getMonthlyUsage ─────────────────────────────────────────

  describe('getMonthlyUsage', () => {
    it('calls GET /ai-usage/monthly and extracts data', async () => {
      const monthly = { months: [{ month: '2024-01', requests: 200, tokens: 50000 }] }
      mockGet.mockResolvedValueOnce({ data: { data: monthly } })

      const result = await aiUsageService.getMonthlyUsage()

      expect(mockGet).toHaveBeenCalledWith('/ai-usage/monthly')
      expect(result).toEqual(monthly)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiUsageService.getMonthlyUsage()).rejects.toThrow('Forbidden')
    })
  })

  // ─── getFinopsDashboard ───────────────────────────────────────

  describe('getFinopsDashboard', () => {
    it('calls GET /ai-usage/finops and extracts data', async () => {
      const dashboard = { totalCost: 45.5, byProvider: [], byModel: [] }
      mockGet.mockResolvedValueOnce({ data: { data: dashboard } })

      const result = await aiUsageService.getFinopsDashboard()

      expect(mockGet).toHaveBeenCalledWith('/ai-usage/finops')
      expect(result).toEqual(dashboard)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Internal Server Error'))

      await expect(aiUsageService.getFinopsDashboard()).rejects.toThrow('Internal Server Error')
    })
  })

  // ─── listCostRates ────────────────────────────────────────────

  describe('listCostRates', () => {
    it('calls GET /ai-usage/cost-rates and returns array', async () => {
      const rates = [
        { id: 'r1', provider: 'openai', model: 'gpt-4', inputCostPer1k: 0.03, outputCostPer1k: 0.06 },
        { id: 'r2', provider: 'anthropic', model: 'claude-3', inputCostPer1k: 0.01, outputCostPer1k: 0.03 },
      ]
      mockGet.mockResolvedValueOnce({ data: { data: rates } })

      const result = await aiUsageService.listCostRates()

      expect(mockGet).toHaveBeenCalledWith('/ai-usage/cost-rates')
      expect(result).toEqual(rates)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(aiUsageService.listCostRates()).rejects.toThrow('Unauthorized')
    })
  })

  // ─── upsertCostRate ───────────────────────────────────────────

  describe('upsertCostRate', () => {
    it('calls PUT /ai-usage/cost-rates and extracts data', async () => {
      const input = { provider: 'openai', model: 'gpt-4', inputCostPer1k: 0.03, outputCostPer1k: 0.06 }
      const created = { id: 'r1', ...input }
      mockPut.mockResolvedValueOnce({ data: { data: created } })

      const result = await aiUsageService.upsertCostRate(input)

      expect(mockPut).toHaveBeenCalledWith('/ai-usage/cost-rates', input)
      expect(result).toEqual(created)
    })

    it('propagates API errors', async () => {
      mockPut.mockRejectedValueOnce(new Error('Validation error'))

      await expect(
        aiUsageService.upsertCostRate({ provider: '', model: '', inputCostPer1k: 0, outputCostPer1k: 0 })
      ).rejects.toThrow('Validation error')
    })
  })

  // ─── deleteCostRate ───────────────────────────────────────────

  describe('deleteCostRate', () => {
    it('calls DELETE /ai-usage/cost-rates/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: { data: null } })

      await aiUsageService.deleteCostRate('r1')

      expect(mockDelete).toHaveBeenCalledWith('/ai-usage/cost-rates/r1')
    })

    it('propagates API errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Not found'))

      await expect(aiUsageService.deleteCostRate('bad-id')).rejects.toThrow('Not found')
    })
  })

  // ─── listBudgetAlerts ─────────────────────────────────────────

  describe('listBudgetAlerts', () => {
    it('calls GET /ai-usage/budget-alerts and returns array', async () => {
      const alerts = [
        { id: 'ba1', scope: 'tenant', monthlyBudget: 100, alertThresholds: '50,80,100', enabled: true },
      ]
      mockGet.mockResolvedValueOnce({ data: { data: alerts } })

      const result = await aiUsageService.listBudgetAlerts()

      expect(mockGet).toHaveBeenCalledWith('/ai-usage/budget-alerts')
      expect(result).toEqual(alerts)
    })

    it('propagates API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'))

      await expect(aiUsageService.listBudgetAlerts()).rejects.toThrow('Server error')
    })
  })

  // ─── upsertBudgetAlert ────────────────────────────────────────

  describe('upsertBudgetAlert', () => {
    it('calls PUT /ai-usage/budget-alerts and extracts data', async () => {
      const input = { scope: 'tenant', monthlyBudget: 200, alertThresholds: '50,80' }
      const created = { id: 'ba1', ...input, enabled: true }
      mockPut.mockResolvedValueOnce({ data: { data: created } })

      const result = await aiUsageService.upsertBudgetAlert(input)

      expect(mockPut).toHaveBeenCalledWith('/ai-usage/budget-alerts', input)
      expect(result).toEqual(created)
    })

    it('propagates API errors', async () => {
      mockPut.mockRejectedValueOnce(new Error('Bad Request'))

      await expect(
        aiUsageService.upsertBudgetAlert({ scope: '', monthlyBudget: 0, alertThresholds: '' })
      ).rejects.toThrow('Bad Request')
    })
  })

  // ─── updateBudgetAlert ────────────────────────────────────────

  describe('updateBudgetAlert', () => {
    it('calls PATCH /ai-usage/budget-alerts/:id and extracts data', async () => {
      const data = { monthlyBudget: 300, alertThresholds: '60,90' }
      const updated = { id: 'ba1', scope: 'tenant', ...data, enabled: true }
      mockPatch.mockResolvedValueOnce({ data: { data: updated } })

      const result = await aiUsageService.updateBudgetAlert('ba1', data)

      expect(mockPatch).toHaveBeenCalledWith('/ai-usage/budget-alerts/ba1', data)
      expect(result).toEqual(updated)
    })

    it('propagates API errors', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Not found'))

      await expect(aiUsageService.updateBudgetAlert('bad-id', {})).rejects.toThrow('Not found')
    })
  })

  // ─── deleteBudgetAlert ────────────────────────────────────────

  describe('deleteBudgetAlert', () => {
    it('calls DELETE /ai-usage/budget-alerts/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: { data: null } })

      await aiUsageService.deleteBudgetAlert('ba1')

      expect(mockDelete).toHaveBeenCalledWith('/ai-usage/budget-alerts/ba1')
    })

    it('propagates API errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Forbidden'))

      await expect(aiUsageService.deleteBudgetAlert('bad-id')).rejects.toThrow('Forbidden')
    })
  })

  // ─── toggleBudgetAlert ────────────────────────────────────────

  describe('toggleBudgetAlert', () => {
    it('calls POST /ai-usage/budget-alerts/:id/toggle with enabled flag', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: null } })

      await aiUsageService.toggleBudgetAlert('ba1', true)

      expect(mockPost).toHaveBeenCalledWith('/ai-usage/budget-alerts/ba1/toggle', { enabled: true })
    })

    it('calls POST with enabled=false to disable', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: null } })

      await aiUsageService.toggleBudgetAlert('ba1', false)

      expect(mockPost).toHaveBeenCalledWith('/ai-usage/budget-alerts/ba1/toggle', { enabled: false })
    })

    it('propagates API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      await expect(aiUsageService.toggleBudgetAlert('bad-id', true)).rejects.toThrow('Server error')
    })
  })
})
