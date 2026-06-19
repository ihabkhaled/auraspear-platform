import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { CaseCyclesService } from '../../src/modules/case-cycles/case-cycles.service'

const TENANT_ID = 'tenant-001'

const mockUser = {
  sub: 'user-001',
  email: 'analyst@auraspear.com',
  tenantId: TENANT_ID,
  tenantSlug: 'auraspear',
  role: 'TENANT_ADMIN' as const,
}

function createMockAppLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}

function createMockRepository() {
  return {
    findManyWithCasesAndCount: jest.fn(),
    countOrphanedCases: jest.fn(),
    findFirstActive: jest.fn(),
    findFirstByIdAndTenantWithCases: jest.fn(),
    findUsersByIds: jest.fn(),
    create: jest.fn(),
    findFirstByIdAndTenantWithCounts: jest.fn(),
    update: jest.fn(),
    activateCycleTransaction: jest.fn(),
    findFirstByIdAndTenantWithCaseCount: jest.fn(),
    deleteCycleWithCasesTransaction: jest.fn(),
    deleteCycle: jest.fn(),
    findManyForOverlapCheck: jest.fn(),
  }
}

describe('CaseCyclesService', () => {
  let service: CaseCyclesService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    const appLogger = createMockAppLogger()
    service = new CaseCyclesService(repository as never, appLogger as never)
  })

  /* ------------------------------------------------------------------ */
  /* listCycles                                                          */
  /* ------------------------------------------------------------------ */

  describe('listCycles', () => {
    it('should return paginated cycles with case counts', async () => {
      const rawCycles = [
        {
          id: 'cycle-1',
          tenantId: TENANT_ID,
          name: 'Q1 2026',
          description: null,
          status: 'active',
          startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
          endDate: null,
          createdBy: 'admin@test.com',
          closedBy: null,
          closedAt: null,
          createdAt: nowDate(),
          updatedAt: nowDate(),
          _count: { cases: 3 },
          cases: [{ status: 'open' }, { status: 'in_progress' }, { status: 'closed' }],
        },
      ]

      repository.findManyWithCasesAndCount.mockResolvedValue([rawCycles, 1])

      const result = await service.listCycles(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(1)
      const first = result.data[0]
      expect(first).toBeDefined()
      expect(first?.caseCount).toBe(3)
      expect(first?.openCount).toBe(2)
      expect(first?.closedCount).toBe(1)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getActiveCycle                                                       */
  /* ------------------------------------------------------------------ */

  describe('getActiveCycle', () => {
    it('should return active cycle when one exists', async () => {
      const rawCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: null,
        status: 'active',
        startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
        endDate: null,
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 2 },
        cases: [{ status: 'open' }, { status: 'closed' }],
      }

      repository.findFirstActive.mockResolvedValue(rawCycle)

      const result = await service.getActiveCycle(TENANT_ID)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Q1 2026')
      expect(result?.caseCount).toBe(2)
      expect(result?.openCount).toBe(1)
      expect(result?.closedCount).toBe(1)
    })

    it('should return null when no active cycle', async () => {
      repository.findFirstActive.mockResolvedValue(null)

      const result = await service.getActiveCycle(TENANT_ID)

      expect(result).toBeNull()
    })
  })

  /* ------------------------------------------------------------------ */
  /* getCycleById                                                        */
  /* ------------------------------------------------------------------ */

  describe('getCycleById', () => {
    it('should return cycle detail with resolved owners', async () => {
      const rawCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: 'First quarter',
        status: 'active',
        startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
        endDate: null,
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 2 },
        cases: [
          {
            id: 'case-1',
            ownerUserId: 'user-001',
            status: 'open',
            tenant: { name: 'AuraSpear' },
            createdAt: nowDate(),
          },
          {
            id: 'case-2',
            ownerUserId: 'user-002',
            status: 'closed',
            tenant: { name: 'AuraSpear' },
            createdAt: nowDate(),
          },
        ],
      }

      repository.findFirstByIdAndTenantWithCases.mockResolvedValue(rawCycle)
      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Alice', email: 'alice@test.com' },
        { id: 'user-002', name: 'Bob', email: 'bob@test.com' },
      ])

      const result = await service.getCycleById('cycle-1', TENANT_ID)

      expect(result.caseCount).toBe(2)
      expect(result.openCount).toBe(1)
      expect(result.closedCount).toBe(1)
      expect(result.cases).toHaveLength(2)
      const firstCase = result.cases[0]
      const secondCase = result.cases[1]
      expect(firstCase).toBeDefined()
      expect(secondCase).toBeDefined()
      expect(firstCase?.ownerName).toBe('Alice')
      expect(secondCase?.ownerEmail).toBe('bob@test.com')
    })

    it('should throw BusinessException when cycle not found', async () => {
      repository.findFirstByIdAndTenantWithCases.mockResolvedValue(null)

      await expect(service.getCycleById('nonexistent', TENANT_ID)).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* createCycle                                                          */
  /* ------------------------------------------------------------------ */

  describe('createCycle', () => {
    it('should create a new cycle as closed status', async () => {
      // No overlapping cycles
      repository.findManyForOverlapCheck.mockResolvedValue([])

      const createdCycle = {
        id: 'cycle-new',
        tenantId: TENANT_ID,
        name: 'Q2 2026',
        description: 'Second quarter',
        status: 'closed',
        startDate: toDay('2026-04-01T00:00:00.000Z').toDate(),
        endDate: null,
        createdBy: mockUser.email,
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.create.mockResolvedValue(createdCycle)

      const dto = {
        name: 'Q2 2026',
        description: 'Second quarter',
        startDate: toDay('2026-04-01T00:00:00.000Z').toDate(),
      }

      const result = await service.createCycle(dto, mockUser as never)

      expect(result.name).toBe('Q2 2026')
      expect(result.caseCount).toBe(0)
      expect(result.openCount).toBe(0)
      expect(result.closedCount).toBe(0)
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'Q2 2026',
          status: 'closed',
        })
      )
    })

    it('should reject overlapping date ranges', async () => {
      // Existing cycle that would overlap
      repository.findManyForOverlapCheck.mockResolvedValue([
        {
          id: 'cycle-existing',
          name: 'Q1 2026',
          startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
          endDate: toDay('2026-03-31T00:00:00.000Z').toDate(),
        },
      ])

      const dto = {
        name: 'Overlapping cycle',
        startDate: toDay('2026-03-01T00:00:00.000Z').toDate(), // Overlaps with Q1
        endDate: toDay('2026-06-30T00:00:00.000Z').toDate(),
      }

      await expect(service.createCycle(dto, mockUser as never)).rejects.toThrow(BusinessException)

      try {
        await service.createCycle(dto, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(409)
      }
    })

    it('should reject when start date is after end date', async () => {
      const dto = {
        name: 'Bad dates',
        startDate: toDay('2026-06-01T00:00:00.000Z').toDate(),
        endDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
      }

      await expect(service.createCycle(dto, mockUser as never)).rejects.toThrow(BusinessException)

      try {
        await service.createCycle(dto, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* updateCycle                                                          */
  /* ------------------------------------------------------------------ */

  describe('updateCycle', () => {
    it('should update name and description successfully', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: null,
        status: 'closed',
        startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
        endDate: toDay('2026-03-31T00:00:00.000Z').toDate(),
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 2 },
        cases: [{ status: 'open' }, { status: 'closed' }],
      }

      const updatedCycle = {
        ...existingCycle,
        name: 'Q1 2026 Updated',
        description: 'Updated description',
      }

      repository.findFirstByIdAndTenantWithCounts
        .mockResolvedValueOnce(existingCycle)
        .mockResolvedValueOnce(updatedCycle)

      repository.update.mockResolvedValue(updatedCycle)

      const dto = { name: 'Q1 2026 Updated', description: 'Updated description' }
      const result = await service.updateCycle('cycle-1', dto, mockUser as never)

      expect(result.name).toBe('Q1 2026 Updated')
      expect(repository.update).toHaveBeenCalledWith(
        'cycle-1',
        TENANT_ID,
        expect.objectContaining({
          name: 'Q1 2026 Updated',
          description: 'Updated description',
        })
      )
    })

    it('should validate start < end date', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: null,
        status: 'closed',
        startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
        endDate: toDay('2026-03-31T00:00:00.000Z').toDate(),
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 0 },
        cases: [],
      }

      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(existingCycle)

      const dto = {
        startDate: toDay('2026-06-01T00:00:00.000Z').toDate(),
        endDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
      }

      await expect(service.updateCycle('cycle-1', dto, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.updateCycle('cycle-1', dto, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should check date overlap excluding self', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: null,
        status: 'closed',
        startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
        endDate: toDay('2026-03-31T00:00:00.000Z').toDate(),
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 0 },
        cases: [],
      }

      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(existingCycle)

      // Overlapping cycle returned from findManyForOverlapCheck (excludeId should exclude self)
      repository.findManyForOverlapCheck.mockResolvedValue([
        {
          id: 'cycle-other',
          name: 'Q2 2026',
          startDate: toDay('2026-04-01T00:00:00.000Z').toDate(),
          endDate: toDay('2026-06-30T00:00:00.000Z').toDate(),
        },
      ])

      const dto = {
        startDate: toDay('2026-05-01T00:00:00.000Z').toDate(), // overlaps with cycle-other
        endDate: toDay('2026-07-31T00:00:00.000Z').toDate(),
      }

      await expect(service.updateCycle('cycle-1', dto, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.updateCycle('cycle-1', dto, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(409)
      }

      // Verify findManyForOverlapCheck was called with exclusion of self
      expect(repository.findManyForOverlapCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          id: { not: 'cycle-1' },
        })
      )
    })

    it('should auto-deactivate when dates moved outside today', async () => {
      const today = nowDate()
      today.setHours(0, 0, 0, 0)

      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Active Cycle',
        description: null,
        status: 'active',
        startDate: toDay('2025-01-01T00:00:00.000Z').toDate(),
        endDate: null,
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 1 },
        cases: [{ status: 'open' }],
      }

      const updatedCycle = {
        ...existingCycle,
        status: 'closed',
        startDate: toDay('2028-01-01T00:00:00.000Z').toDate(),
        endDate: toDay('2028-06-30T00:00:00.000Z').toDate(),
      }

      repository.findFirstByIdAndTenantWithCounts
        .mockResolvedValueOnce(existingCycle)
        .mockResolvedValueOnce(updatedCycle)
      // No overlapping cycles
      repository.findManyForOverlapCheck.mockResolvedValue([])

      repository.update.mockResolvedValue(updatedCycle)

      // Move dates far into the future (today is outside the range)
      const dto = {
        startDate: toDay('2028-01-01T00:00:00.000Z').toDate(),
        endDate: toDay('2028-06-30T00:00:00.000Z').toDate(),
      }

      await service.updateCycle('cycle-1', dto, mockUser as never)

      expect(repository.update).toHaveBeenCalledWith(
        'cycle-1',
        TENANT_ID,
        expect.objectContaining({
          status: 'closed',
          startDate: dto.startDate,
          endDate: dto.endDate,
        })
      )
    })

    it('should throw when cycle not found', async () => {
      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(null)

      await expect(
        service.updateCycle('nonexistent', { name: 'Updated' }, mockUser as never)
      ).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* activateCycle                                                        */
  /* ------------------------------------------------------------------ */

  describe('activateCycle', () => {
    it('should successfully activate and deactivate previous active cycle', async () => {
      const today = nowDate()
      today.setHours(0, 0, 0, 0)

      // Create a start date in the past and no end date (open-ended)
      const pastStart = toDay(today).toDate()
      pastStart.setMonth(pastStart.getMonth() - 1)

      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: null,
        status: 'closed',
        startDate: pastStart,
        endDate: null,
        createdBy: 'admin@test.com',
        closedBy: mockUser.email,
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 2 },
        cases: [{ status: 'open' }, { status: 'closed' }],
      }

      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(existingCycle)

      const activatedCycle = {
        ...existingCycle,
        status: 'active',
        closedBy: null,
        closedAt: null,
      }

      repository.activateCycleTransaction.mockResolvedValue(activatedCycle)

      const result = await service.activateCycle('cycle-1', mockUser as never)

      expect(result.caseCount).toBe(2)
      expect(result.openCount).toBe(1)
      expect(result.closedCount).toBe(1)
      expect(repository.activateCycleTransaction).toHaveBeenCalledWith(
        'cycle-1',
        TENANT_ID,
        mockUser.email
      )
    })

    it('should reject if today is outside date range (future start)', async () => {
      const futureStart = nowDate()
      futureStart.setFullYear(futureStart.getFullYear() + 2)

      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Future Cycle',
        description: null,
        status: 'closed',
        startDate: futureStart,
        endDate: null,
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 0 },
        cases: [],
      }

      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(existingCycle)

      await expect(service.activateCycle('cycle-1', mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.activateCycle('cycle-1', mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should reject if today is outside date range (past end)', async () => {
      const pastEnd = nowDate()
      pastEnd.setFullYear(pastEnd.getFullYear() - 1)
      const pastStart = toDay(pastEnd).toDate()
      pastStart.setMonth(pastStart.getMonth() - 3)

      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Past Cycle',
        description: null,
        status: 'closed',
        startDate: pastStart,
        endDate: pastEnd,
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 0 },
        cases: [],
      }

      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(existingCycle)

      await expect(service.activateCycle('cycle-1', mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.activateCycle('cycle-1', mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should reject if already active', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Active Cycle',
        description: null,
        status: 'active',
        startDate: toDay('2025-01-01T00:00:00.000Z').toDate(),
        endDate: null,
        createdBy: 'admin@test.com',
        closedBy: null,
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 0 },
        cases: [],
      }

      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(existingCycle)

      await expect(service.activateCycle('cycle-1', mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.activateCycle('cycle-1', mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw when cycle not found', async () => {
      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(null)

      await expect(service.activateCycle('nonexistent', mockUser as never)).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* deleteCycle                                                          */
  /* ------------------------------------------------------------------ */

  describe('deleteCycle', () => {
    it('should delete a closed cycle with no cases', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Empty Cycle',
        status: 'closed',
        _count: { cases: 0 },
      }

      repository.findFirstByIdAndTenantWithCaseCount.mockResolvedValue(existingCycle)
      repository.deleteCycle.mockResolvedValue(existingCycle)

      const result = await service.deleteCycle('cycle-1', mockUser as never)

      expect(result.deleted).toBe(true)
      expect(repository.deleteCycle).toHaveBeenCalledWith('cycle-1', TENANT_ID)
      // Should not use transaction when no cases to unlink
      expect(repository.deleteCycleWithCasesTransaction).not.toHaveBeenCalled()
    })

    it('should unlink cases before deleting', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Cycle With Cases',
        status: 'closed',
        _count: { cases: 3 },
      }

      repository.findFirstByIdAndTenantWithCaseCount.mockResolvedValue(existingCycle)
      repository.deleteCycleWithCasesTransaction.mockResolvedValue(undefined)

      const result = await service.deleteCycle('cycle-1', mockUser as never)

      expect(result.deleted).toBe(true)
      expect(repository.deleteCycleWithCasesTransaction).toHaveBeenCalledWith('cycle-1', TENANT_ID)
    })

    it('should reject deletion of active cycle', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Active Cycle',
        status: 'active',
        _count: { cases: 2 },
      }

      repository.findFirstByIdAndTenantWithCaseCount.mockResolvedValue(existingCycle)

      await expect(service.deleteCycle('cycle-1', mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.deleteCycle('cycle-1', mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw when cycle not found', async () => {
      repository.findFirstByIdAndTenantWithCaseCount.mockResolvedValue(null)

      await expect(service.deleteCycle('nonexistent', mockUser as never)).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* closeCycle                                                           */
  /* ------------------------------------------------------------------ */

  describe('closeCycle', () => {
    it('should close an active cycle', async () => {
      const existingCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        status: 'active',
        _count: { cases: 2 },
        cases: [{ status: 'open' }, { status: 'closed' }],
      }

      const refreshedCycle = {
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        description: null,
        status: 'closed',
        startDate: toDay('2026-01-01T00:00:00.000Z').toDate(),
        endDate: nowDate(),
        createdBy: 'admin@test.com',
        closedBy: mockUser.email,
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        _count: { cases: 2 },
        cases: [{ status: 'open' }, { status: 'closed' }],
      }

      repository.findFirstByIdAndTenantWithCounts
        .mockResolvedValueOnce(existingCycle)
        .mockResolvedValueOnce(refreshedCycle)

      repository.update.mockResolvedValue(refreshedCycle)

      const dto = { endDate: nowDate() }
      const result = await service.closeCycle('cycle-1', dto, mockUser as never)

      expect(result.caseCount).toBe(2)
      expect(result.openCount).toBe(1)
      expect(result.closedCount).toBe(1)
      expect(repository.update).toHaveBeenCalledWith(
        'cycle-1',
        TENANT_ID,
        expect.objectContaining({ status: 'closed' })
      )
    })

    it('should throw when cycle not found', async () => {
      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue(null)

      const dto = { endDate: nowDate() }

      await expect(service.closeCycle('nonexistent', dto, mockUser as never)).rejects.toThrow(
        BusinessException
      )
    })

    it('should throw when cycle already closed', async () => {
      repository.findFirstByIdAndTenantWithCounts.mockResolvedValue({
        id: 'cycle-1',
        tenantId: TENANT_ID,
        name: 'Q1 2026',
        status: 'closed',
        _count: { cases: 0 },
        cases: [],
      })

      const dto = { endDate: nowDate() }

      await expect(service.closeCycle('cycle-1', dto, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.closeCycle('cycle-1', dto, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })
  })
})
