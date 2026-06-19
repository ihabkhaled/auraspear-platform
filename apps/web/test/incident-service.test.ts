import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
import { IncidentStatus } from '@/enums'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { incidentService } from '@/services/incident.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('incidentService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getIncidents ──────────────────────────────────────────────

  describe('getIncidents', () => {
    it('should call GET /incidents without params', async () => {
      const incidents = [{ id: 'inc-1', title: 'Brute force attack' }]
      mockGet.mockResolvedValue({ data: { data: incidents } })

      const result = await incidentService.getIncidents()

      expect(mockGet).toHaveBeenCalledWith('/incidents', { params: undefined })
      expect(result.data).toEqual(incidents)
    })

    it('should call GET /incidents with search params', async () => {
      const incidents = [{ id: 'inc-2', title: 'Ransomware' }]
      mockGet.mockResolvedValue({ data: { data: incidents } })

      const params = { search: 'ransom', severity: 'critical', page: 1, limit: 10 }
      const result = await incidentService.getIncidents(params)

      expect(mockGet).toHaveBeenCalledWith('/incidents', { params })
      expect(result.data).toEqual(incidents)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(incidentService.getIncidents()).rejects.toThrow('Network error')
    })
  })

  // ─── getIncidentById ───────────────────────────────────────────

  describe('getIncidentById', () => {
    it('should call GET /incidents/:id', async () => {
      const incident = { id: 'inc-1', title: 'Phishing campaign' }
      mockGet.mockResolvedValue({ data: { data: incident } })

      const result = await incidentService.getIncidentById('inc-1')

      expect(mockGet).toHaveBeenCalledWith('/incidents/inc-1')
      expect(result.data).toEqual(incident)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(incidentService.getIncidentById('inc-999')).rejects.toThrow('Not found')
    })
  })

  // ─── createIncident ────────────────────────────────────────────

  describe('createIncident', () => {
    it('should call POST /incidents with data', async () => {
      const incident = { id: 'inc-3', title: 'SQL Injection' }
      mockPost.mockResolvedValue({ data: { data: incident } })

      const input = { title: 'SQL Injection', severity: 'high' }
      const result = await incidentService.createIncident(input)

      expect(mockPost).toHaveBeenCalledWith('/incidents', input)
      expect(result.data).toEqual(incident)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(incidentService.createIncident({ title: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── updateIncident ────────────────────────────────────────────

  describe('updateIncident', () => {
    it('should call PATCH /incidents/:id with data', async () => {
      const incident = { id: 'inc-1', title: 'Updated', status: 'resolved' }
      mockPatch.mockResolvedValue({ data: { data: incident } })

      const input = { status: 'resolved' }
      const result = await incidentService.updateIncident('inc-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/incidents/inc-1', input)
      expect(result.data).toEqual(incident)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(incidentService.updateIncident('inc-1', { status: 'resolved' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  // ─── changeIncidentStatus ────────────────────────────────────────────────

  describe('changeIncidentStatus', () => {
    it('should call PATCH /incidents/:id/status with the selected status', async () => {
      const incident = { id: 'inc-1', status: 'resolved' }
      mockPatch.mockResolvedValue({ data: { data: incident } })

      const result = await incidentService.changeIncidentStatus('inc-1', IncidentStatus.RESOLVED)

      expect(mockPatch).toHaveBeenCalledWith('/incidents/inc-1/status', {
        status: 'resolved',
      })
      expect(result.data).toEqual(incident)
    })
  })

  // ─── deleteIncident ────────────────────────────────────────────

  describe('deleteIncident', () => {
    it('should call DELETE /incidents/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await incidentService.deleteIncident('inc-1')

      expect(mockDelete).toHaveBeenCalledWith('/incidents/inc-1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(incidentService.deleteIncident('inc-999')).rejects.toThrow('Not found')
    })
  })

  // ─── getIncidentStats ──────────────────────────────────────────

  describe('getIncidentStats', () => {
    it('should call GET /incidents/stats', async () => {
      const stats = { total: 42, open: 10, resolved: 32 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await incidentService.getIncidentStats()

      expect(mockGet).toHaveBeenCalledWith('/incidents/stats')
      expect(result.data).toEqual(stats)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(incidentService.getIncidentStats()).rejects.toThrow('Server error')
    })
  })

  // ─── getIncidentTimeline ───────────────────────────────────────

  describe('getIncidentTimeline', () => {
    it('should call GET /incidents/:id/timeline', async () => {
      const timeline = [
        { id: 'tl-1', event: 'Created', timestamp: '2026-01-01T00:00:00Z' },
        { id: 'tl-2', event: 'Escalated', timestamp: '2026-01-01T01:00:00Z' },
      ]
      mockGet.mockResolvedValue({ data: { data: timeline } })

      const result = await incidentService.getIncidentTimeline('inc-1')

      expect(mockGet).toHaveBeenCalledWith('/incidents/inc-1/timeline')
      expect(result.data).toEqual(timeline)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(incidentService.getIncidentTimeline('inc-999')).rejects.toThrow('Not found')
    })
  })

  // ─── addTimelineEntry ──────────────────────────────────────────

  describe('addTimelineEntry', () => {
    it('should call POST /incidents/:id/timeline with event data', async () => {
      const entry = { id: 'tl-3', event: 'Comment added', actorType: 'user' }
      mockPost.mockResolvedValue({ data: { data: entry } })

      const input = { event: 'Comment added', actorType: 'user' }
      const result = await incidentService.addTimelineEntry('inc-1', input)

      expect(mockPost).toHaveBeenCalledWith('/incidents/inc-1/timeline', input)
      expect(result.data).toEqual(entry)
    })

    it('should work without actorType', async () => {
      const entry = { id: 'tl-4', event: 'Status changed' }
      mockPost.mockResolvedValue({ data: { data: entry } })

      const input = { event: 'Status changed' }
      await incidentService.addTimelineEntry('inc-2', input)

      expect(mockPost).toHaveBeenCalledWith('/incidents/inc-2/timeline', input)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      await expect(incidentService.addTimelineEntry('inc-1', { event: 'fail' })).rejects.toThrow(
        'Server error'
      )
    })
  })
})
