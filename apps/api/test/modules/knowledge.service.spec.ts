jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { KnowledgeService } from '../../src/modules/knowledge/knowledge.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-1'
const USER_EMAIL = 'analyst@test.com'

function buildRunbook(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rb-1',
    tenantId: TENANT_ID,
    title: 'Incident Response Runbook',
    content: '# Steps\n1. Assess\n2. Contain\n3. Eradicate',
    category: 'incident_response',
    tags: ['incident', 'response'],
    createdBy: USER_EMAIL,
    updatedBy: null,
    createdAt: toDay('2026-01-01T00:00:00.000Z').toDate().toISOString(),
    updatedAt: toDay('2026-01-01T00:00:00.000Z').toDate().toISOString(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findAllByTenant: jest.fn(),
    countByTenant: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  }
}

function createService(repository: ReturnType<typeof createMockRepository>) {
  return new KnowledgeService(repository as never, mockAppLogger as never)
}

describe('KnowledgeService', () => {
  let repo: ReturnType<typeof createMockRepository>
  let service: KnowledgeService

  beforeEach(() => {
    jest.clearAllMocks()
    repo = createMockRepository()
    service = createService(repo)
  })

  /* ------------------------------------------------------------------ */
  /* list                                                                 */
  /* ------------------------------------------------------------------ */

  describe('list', () => {
    it('should return paginated runbooks', async () => {
      const runbooks = [buildRunbook(), buildRunbook({ id: 'rb-2' })]
      repo.findAllByTenant.mockResolvedValue(runbooks)
      repo.countByTenant.mockResolvedValue(2)

      const params = { page: 1, limit: 20 }
      const result = await service.list(TENANT_ID, params as never)

      expect(repo.findAllByTenant).toHaveBeenCalledWith(TENANT_ID, params)
      expect(result.data).toHaveLength(2)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.total).toBe(2)
    })

    it('should return empty list when no runbooks exist', async () => {
      repo.findAllByTenant.mockResolvedValue([])
      repo.countByTenant.mockResolvedValue(0)

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 } as never)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getById                                                              */
  /* ------------------------------------------------------------------ */

  describe('getById', () => {
    it('should return runbook when found', async () => {
      repo.findById.mockResolvedValue(buildRunbook())

      const result = await service.getById(TENANT_ID, 'rb-1')

      expect(result.id).toBe('rb-1')
      expect(result.title).toBe('Incident Response Runbook')
    })

    it('should throw 404 when runbook not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.getById(TENANT_ID, 'nonexistent')).rejects.toThrow(BusinessException)

      try {
        await service.getById(TENANT_ID, 'nonexistent')
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
        expect((error as BusinessException).messageKey).toBe('errors.knowledge.notFound')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* create                                                               */
  /* ------------------------------------------------------------------ */

  describe('create', () => {
    it('should create a runbook and log the action', async () => {
      const created = buildRunbook({ id: 'rb-new' })
      repo.create.mockResolvedValue(created)

      const dto = {
        title: 'New Runbook',
        content: '# Steps',
        category: 'general',
        tags: ['new'],
      }
      const result = await service.create(TENANT_ID, dto as never, USER_EMAIL)

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          title: 'New Runbook',
          content: '# Steps',
          createdBy: USER_EMAIL,
        })
      )
      expect(result.id).toBe('rb-new')
      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'KnowledgeService => create completed',
        expect.objectContaining({ tenantId: TENANT_ID, outcome: 'success' })
      )
    })

    it('should default category to general when not provided', async () => {
      repo.create.mockResolvedValue(buildRunbook({ category: 'general' }))

      const dto = { title: 'No Category', content: 'Content' }
      await service.create(TENANT_ID, dto as never, USER_EMAIL)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ category: 'general' }))
    })
  })

  /* ------------------------------------------------------------------ */
  /* update                                                               */
  /* ------------------------------------------------------------------ */

  describe('update', () => {
    it('should update an existing runbook', async () => {
      repo.findById.mockResolvedValue(buildRunbook())
      const updated = buildRunbook({ title: 'Updated Title' })
      repo.update.mockResolvedValue(updated)

      const dto = { title: 'Updated Title' }
      const result = await service.update(TENANT_ID, 'rb-1', dto as never, USER_EMAIL)

      expect(repo.update).toHaveBeenCalledWith(
        'rb-1',
        TENANT_ID,
        expect.objectContaining({ title: 'Updated Title', updatedBy: USER_EMAIL })
      )
      expect(result.title).toBe('Updated Title')
    })

    it('should throw 404 when updating non-existent runbook', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(
        service.update(TENANT_ID, 'nonexistent', { title: 'X' } as never, USER_EMAIL)
      ).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* delete                                                               */
  /* ------------------------------------------------------------------ */

  describe('delete', () => {
    it('should remove the runbook and return success', async () => {
      repo.findById.mockResolvedValue(buildRunbook())
      repo.delete.mockResolvedValue(undefined)

      const result = await service.delete(TENANT_ID, 'rb-1', USER_EMAIL)

      expect(repo.delete).toHaveBeenCalledWith('rb-1', TENANT_ID)
      expect(result.deleted).toBe(true)
    })

    it('should throw 404 when deleting non-existent runbook', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.delete(TENANT_ID, 'nonexistent', USER_EMAIL)).rejects.toThrow(
        BusinessException
      )
    })

    it('should log the deletion', async () => {
      repo.findById.mockResolvedValue(buildRunbook())
      repo.delete.mockResolvedValue(undefined)

      await service.delete(TENANT_ID, 'rb-1', USER_EMAIL)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'KnowledgeService => delete completed',
        expect.objectContaining({ tenantId: TENANT_ID, outcome: 'success' })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* search                                                               */
  /* ------------------------------------------------------------------ */

  describe('search', () => {
    it('should perform text search on title and content', async () => {
      const results = [buildRunbook({ title: 'Phishing Response' })]
      repo.search.mockResolvedValue(results)

      const result = await service.search(TENANT_ID, 'phishing')

      expect(repo.search).toHaveBeenCalledWith(TENANT_ID, 'phishing', 50)
      expect(result).toHaveLength(1)
    })

    it('should return empty array when no matches', async () => {
      repo.search.mockResolvedValue([])

      const result = await service.search(TENANT_ID, 'nonexistent query')

      expect(result).toHaveLength(0)
    })
  })
})
