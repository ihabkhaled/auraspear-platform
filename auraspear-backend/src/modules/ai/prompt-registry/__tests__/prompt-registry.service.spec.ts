jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { AiFeatureKey } from '../../../../common/enums'
import { BusinessException } from '../../../../common/exceptions/business.exception'
import { toDay } from '../../../../common/utils/date-time.utility'
import { DEFAULT_PROMPTS } from '../prompt-registry.constants'
import { PromptRegistryService } from '../prompt-registry.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const NOW = toDay('2026-03-01T00:00:00Z').toDate()

function buildTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    tenantId: 'tenant-1',
    taskType: AiFeatureKey.ALERT_SUMMARIZE,
    version: 1,
    name: 'Summarize v1',
    content: 'Summarize: {{context}}',
    isActive: true,
    createdBy: 'admin@test.com',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findAllByTenant: jest.fn(),
    findById: jest.fn(),
    findActiveByTaskType: jest.fn(),
    getMaxVersion: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivateAllByTaskType: jest.fn(),
    activate: jest.fn(),
    delete: jest.fn(),
  }
}

function createService(repository: ReturnType<typeof createMockRepository>) {
  return new PromptRegistryService(repository as never, mockAppLogger as never)
}

describe('PromptRegistryService', () => {
  let repo: ReturnType<typeof createMockRepository>
  let service: PromptRegistryService

  beforeEach(() => {
    jest.clearAllMocks()
    repo = createMockRepository()
    service = createService(repo)
  })

  /* ------------------------------------------------------------------ */
  /* list                                                                 */
  /* ------------------------------------------------------------------ */

  describe('list', () => {
    it('should return all prompts for the tenant', async () => {
      const templates = [buildTemplate(), buildTemplate({ id: 'tpl-2', version: 2 })]
      repo.findAllByTenant.mockResolvedValue(templates)

      const result = await service.list('tenant-1')

      expect(repo.findAllByTenant).toHaveBeenCalledWith('tenant-1')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(expect.objectContaining({ id: 'tpl-1', version: 1 }))
    })

    it('should return empty array when no prompts exist', async () => {
      repo.findAllByTenant.mockResolvedValue([])

      const result = await service.list('tenant-1')

      expect(result).toHaveLength(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getActivePrompt                                                      */
  /* ------------------------------------------------------------------ */

  describe('getActivePrompt', () => {
    it('should return active prompt content when one exists in DB', async () => {
      repo.findActiveByTaskType.mockResolvedValue(
        buildTemplate({ content: 'Custom prompt: {{context}}' })
      )

      const result = await service.getActivePrompt('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result).toBe('Custom prompt: {{context}}')
      expect(repo.findActiveByTaskType).toHaveBeenCalledWith(
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE
      )
    })

    it('should fall back to default prompt when none in DB', async () => {
      repo.findActiveByTaskType.mockResolvedValue(null)

      const result = await service.getActivePrompt('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result).toBe(DEFAULT_PROMPTS[AiFeatureKey.ALERT_SUMMARIZE])
    })

    it('should fall back to generic prompt when no default exists for task type', async () => {
      repo.findActiveByTaskType.mockResolvedValue(null)

      // Use a feature key that may not have a default prompt
      const result = await service.getActivePrompt('tenant-1', 'custom.unknown' as AiFeatureKey)

      expect(result).toContain('SOC AI assistant')
      expect(result).toContain('{{context}}')
    })
  })

  /* ------------------------------------------------------------------ */
  /* create                                                               */
  /* ------------------------------------------------------------------ */

  describe('create', () => {
    it('should auto-increment version when creating a new prompt', async () => {
      repo.getMaxVersion.mockResolvedValue(3)
      const created = buildTemplate({ version: 4 })
      repo.create.mockResolvedValue(created)

      const dto = {
        taskType: AiFeatureKey.ALERT_SUMMARIZE,
        name: 'New prompt',
        content: 'New content',
      }

      const result = await service.create('tenant-1', dto, 'admin@test.com')

      expect(repo.getMaxVersion).toHaveBeenCalledWith('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          version: 4,
          isActive: true,
        })
      )
      expect(result.id).toBeDefined()
    })

    it('should start at version 1 when no previous versions exist', async () => {
      repo.getMaxVersion.mockResolvedValue(0)
      repo.create.mockResolvedValue(buildTemplate({ version: 1 }))

      await service.create(
        'tenant-1',
        { taskType: AiFeatureKey.ALERT_SUMMARIZE, name: 'First', content: 'Content' },
        'admin@test.com'
      )

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }))
    })

    it('should log the creation via appLogger', async () => {
      repo.getMaxVersion.mockResolvedValue(0)
      repo.create.mockResolvedValue(buildTemplate())

      await service.create(
        'tenant-1',
        { taskType: AiFeatureKey.ALERT_SUMMARIZE, name: 'Test', content: 'C' },
        'admin@test.com'
      )

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Prompt template created'),
        expect.objectContaining({ tenantId: 'tenant-1', actorEmail: 'admin@test.com' })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* activate                                                             */
  /* ------------------------------------------------------------------ */

  describe('activate', () => {
    it('should deactivate siblings and activate the requested prompt', async () => {
      const existing = buildTemplate({ isActive: false })
      repo.findById.mockResolvedValue(existing)
      repo.deactivateAllByTaskType.mockResolvedValue(undefined)
      repo.activate.mockResolvedValue(buildTemplate({ isActive: true }))

      const result = await service.activate('tpl-1', 'tenant-1', 'admin@test.com')

      expect(repo.deactivateAllByTaskType).toHaveBeenCalledWith(
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE
      )
      expect(repo.activate).toHaveBeenCalledWith('tpl-1', 'tenant-1')
      expect(result.isActive).toBe(true)
    })

    it('should throw 404 when prompt not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.activate('nonexistent', 'tenant-1', 'admin@test.com')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.activate('nonexistent', 'tenant-1', 'admin@test.com')
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* delete                                                               */
  /* ------------------------------------------------------------------ */

  describe('delete', () => {
    it('should call repository.delete when prompt exists', async () => {
      repo.findById.mockResolvedValue(buildTemplate())
      repo.delete.mockResolvedValue(undefined)

      await service.delete('tpl-1', 'tenant-1', 'admin@test.com')

      expect(repo.delete).toHaveBeenCalledWith('tpl-1', 'tenant-1')
    })

    it('should throw 404 when prompt not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.delete('nonexistent', 'tenant-1', 'admin@test.com')).rejects.toThrow(
        BusinessException
      )
    })

    it('should log the deletion via appLogger', async () => {
      repo.findById.mockResolvedValue(buildTemplate())
      repo.delete.mockResolvedValue(undefined)

      await service.delete('tpl-1', 'tenant-1', 'admin@test.com')

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Prompt template deleted'),
        expect.objectContaining({ tenantId: 'tenant-1' })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getById                                                              */
  /* ------------------------------------------------------------------ */

  describe('getById', () => {
    it('should return the prompt when found', async () => {
      repo.findById.mockResolvedValue(buildTemplate())

      const result = await service.getById('tpl-1', 'tenant-1')

      expect(result.id).toBe('tpl-1')
      expect(result.taskType).toBe(AiFeatureKey.ALERT_SUMMARIZE)
    })

    it('should throw 404 when prompt not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.getById('missing', 'tenant-1')).rejects.toThrow(BusinessException)
    })
  })
})
