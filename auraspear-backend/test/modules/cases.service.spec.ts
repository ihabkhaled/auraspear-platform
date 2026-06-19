import { BusinessException } from '../../src/common/exceptions/business.exception'
import { nowDate } from '../../src/common/utils/date-time.utility'
import { CasesService } from '../../src/modules/cases/cases.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockNotificationsService = {
  createMentionNotifications: jest.fn().mockResolvedValue(undefined),
  notifyCaseAssigned: jest.fn().mockResolvedValue(undefined),
  notifyCaseUnassigned: jest.fn().mockResolvedValue(undefined),
  notifyCaseActivity: jest.fn().mockResolvedValue(undefined),
}

function createMockRepository() {
  return {
    findUserById: jest.fn(),
    findUserNameById: jest.fn(),
    findUserByEmail: jest.fn(),
    findUsersByEmails: jest.fn(),
    findUsersByIds: jest.fn(),
    findCasesAndCount: jest.fn(),
    findCaseByIdAndTenant: jest.fn(),
    countAlertsByTenantAndIds: jest.fn(),
    countAlertByTenantAndId: jest.fn(),
    findMembershipByUserAndTenant: jest.fn(),
    countActiveMentionMemberships: jest.fn(),
    searchMentionableMembers: jest.fn(),
    createCaseTransaction: jest.fn(),
    updateCaseTransaction: jest.fn(),
    softDeleteCaseTransaction: jest.fn(),
    linkAlertTransaction: jest.fn(),
    findCaseNotesAndCount: jest.fn(),
    addNoteTransaction: jest.fn(),
    findCommentsAndCount: jest.fn(),
    findCommentByIdAndCase: jest.fn(),
    addCommentTransaction: jest.fn(),
    updateCommentTransaction: jest.fn(),
    softDeleteCommentTransaction: jest.fn(),
    createTask: jest.fn(),
    findTaskByIdAndCase: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    createTimeline: jest.fn(),
    findArtifactDuplicate: jest.fn(),
    createArtifact: jest.fn(),
    findArtifactByIdAndCase: jest.fn(),
    deleteArtifact: jest.fn(),
    findCaseCycleById: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'

const mockUser = {
  sub: 'user-001',
  email: 'analyst@auraspear.com',
  tenantId: TENANT_ID,
  tenantSlug: 'auraspear',
  role: 'TENANT_ADMIN' as const,
}

describe('CasesService', () => {
  let service: CasesService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    service = new CasesService(
      repository as never,
      mockAppLogger as never,
      mockNotificationsService as never,
      { extractFromArtifact: jest.fn().mockResolvedValue(undefined) } as never,
      { findByIdAndTenant: jest.fn().mockResolvedValue(null) } as never
    )
  })

  /* ------------------------------------------------------------------ */
  /* listCases                                                            */
  /* ------------------------------------------------------------------ */

  describe('listCases', () => {
    it('should return paginated cases with owner names resolved', async () => {
      const rawCases = [
        {
          id: 'case-1',
          tenantId: TENANT_ID,
          caseNumber: 'SOC-2026-001',
          title: 'Suspicious login',
          description: 'Multiple failed logins',
          severity: 'high',
          status: 'open',
          ownerUserId: 'user-001',
          createdBy: 'admin@test.com',
          cycleId: 'cycle-1',
          linkedAlerts: [],
          closedAt: null,
          createdAt: nowDate(),
          updatedAt: nowDate(),
          tenant: { name: 'AuraSpear' },
        },
        {
          id: 'case-2',
          tenantId: TENANT_ID,
          caseNumber: 'SOC-2026-002',
          title: 'Malware detected',
          description: 'Ransomware payload',
          severity: 'critical',
          status: 'in_progress',
          ownerUserId: null,
          createdBy: 'admin@test.com',
          cycleId: 'cycle-1',
          linkedAlerts: [],
          closedAt: null,
          createdAt: nowDate(),
          updatedAt: nowDate(),
          tenant: { name: 'AuraSpear' },
        },
      ]

      repository.findCasesAndCount.mockResolvedValue([rawCases, 2])
      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Alice', email: 'alice@test.com' },
      ])
      repository.findUsersByEmails.mockResolvedValue([{ email: 'admin@test.com', name: 'Admin' }])

      const result = await service.listCases(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      const first = result.data[0]
      const second = result.data[1]
      expect(first).toBeDefined()
      expect(second).toBeDefined()
      expect(first?.ownerName).toBe('Alice')
      expect(first?.ownerEmail).toBe('alice@test.com')
      expect(first?.tenantName).toBe('AuraSpear')
      expect(second?.ownerName).toBeNull()
      expect(second?.ownerEmail).toBeNull()
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)
    })
  })

  /* ------------------------------------------------------------------ */
  /* createCase                                                           */
  /* ------------------------------------------------------------------ */

  describe('createCase', () => {
    it('should create case and auto-assign to active cycle', async () => {
      const createdCase = {
        id: 'case-new',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'New incident',
        description: 'Something happened',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: 'cycle-active',
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.createCaseTransaction.mockResolvedValue(createdCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const dto = {
        title: 'New incident',
        description: 'Something happened',
        severity: 'medium',
      }

      const result = await service.createCase(dto as never, mockUser as never)

      expect(result.caseNumber).toBe('SOC-2026-001')
      expect(result.tenantName).toBe('AuraSpear')
      expect(repository.createCaseTransaction).toHaveBeenCalled()
    })

    it('should create case without cycle when no active cycle', async () => {
      const createdCase = {
        id: 'case-new',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'New incident',
        description: 'Something happened',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.createCaseTransaction.mockResolvedValue(createdCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const dto = {
        title: 'New incident',
        description: 'Something happened',
        severity: 'medium',
      }

      const result = await service.createCase(dto as never, mockUser as never)

      expect(result.cycleId).toBeNull()
      expect(result.tenantName).toBe('AuraSpear')
    })
  })

  /* ------------------------------------------------------------------ */
  /* getCaseById                                                          */
  /* ------------------------------------------------------------------ */

  describe('getCaseById', () => {
    it('should return case with owner details', async () => {
      const rawCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Suspicious login',
        description: 'Multiple failed logins',
        severity: 'high',
        status: 'open',
        ownerUserId: 'user-001',
        createdBy: 'admin@test.com',
        cycleId: 'cycle-1',
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(rawCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-001',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue({ name: 'Admin' })

      const result = await service.getCaseById('case-1', TENANT_ID)

      expect(result.ownerName).toBe('Alice')
      expect(result.ownerEmail).toBe('alice@test.com')
      expect(result.tenantName).toBe('AuraSpear')
      expect(repository.findCaseByIdAndTenant).toHaveBeenCalledWith('case-1', TENANT_ID)
    })

    it('should throw when case not found', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(null)

      await expect(service.getCaseById('nonexistent', TENANT_ID)).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* updateCase                                                           */
  /* ------------------------------------------------------------------ */

  describe('updateCase', () => {
    it('should update case status and create timeline entry', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Suspicious login',
        description: 'Multiple failed logins',
        severity: 'high',
        status: 'open',
        ownerUserId: 'user-001',
        createdBy: 'admin@test.com',
        cycleId: 'cycle-1',
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-001',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue({ name: 'Admin' })
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })

      const updatedCase = {
        ...existingCase,
        status: 'in_progress',
        notes: [],
        timeline: [
          {
            id: 'tl-1',
            caseId: 'case-1',
            type: 'status_changed',
            actor: mockUser.email,
            description: 'Status changed from open to in_progress',
            timestamp: nowDate(),
          },
        ],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(updatedCase)

      const dto = { status: 'in_progress' }

      const result = await service.updateCase('case-1', dto as never, mockUser as never)

      expect(result.tenantName).toBe('AuraSpear')
      expect(repository.updateCaseTransaction).toHaveBeenCalled()
    })

    it('should reject updating a closed case (non-reopen, non-assignee change)', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'high',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      // Attempt to update title on a closed case (not a reopen or assignee change)
      const dto = { title: 'Updated title' }

      await expect(service.updateCase('case-1', dto as never, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.updateCase('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toBe('Cannot update a closed case')
      }

      expect(repository.updateCaseTransaction).not.toHaveBeenCalled()
    })

    it('should allow re-opening a closed case', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'high',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })

      const reopenedCase = {
        ...closedCase,
        status: 'open',
        closedAt: null,
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(reopenedCase)

      const dto = { status: 'open' }

      // Should NOT throw — re-opening is allowed
      const result = await service.updateCase('case-1', dto as never, mockUser as never)
      expect(result.tenantName).toBe('AuraSpear')
      expect(repository.updateCaseTransaction).toHaveBeenCalled()
    })

    it('should allow assignee change on a closed case', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'high',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-002',
        name: 'Bob',
        email: 'bob@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: 'user-002',
        tenantId: TENANT_ID,
        status: 'active',
      })

      const updatedCase = {
        ...closedCase,
        ownerUserId: 'user-002',
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(updatedCase)

      const dto = { ownerUserId: 'user-002' }

      // Should NOT throw — assignee change is allowed on closed cases
      const result = await service.updateCase('case-1', dto as never, mockUser as never)
      expect(result.tenantName).toBe('AuraSpear')
      expect(repository.updateCaseTransaction).toHaveBeenCalled()
    })

    it('should notify new assignee when ownerUserId changes', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test',
        description: 'Test',
        severity: 'high',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-002',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: 'user-002',
        tenantId: TENANT_ID,
        status: 'active',
      })

      const updatedCase = {
        ...existingCase,
        ownerUserId: 'user-002',
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(updatedCase)

      await service.updateCase('case-1', { ownerUserId: 'user-002' } as never, mockUser as never)

      expect(mockNotificationsService.notifyCaseAssigned).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'user-002',
        mockUser.sub,
        mockUser.email
      )
    })

    it('should notify previous assignee when ownerUserId changes', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test',
        description: 'Test',
        severity: 'high',
        status: 'open',
        ownerUserId: 'user-003',
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-002',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: 'user-002',
        tenantId: TENANT_ID,
        status: 'active',
      })

      const updatedCase = {
        ...existingCase,
        ownerUserId: 'user-002',
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(updatedCase)

      await service.updateCase('case-1', { ownerUserId: 'user-002' } as never, mockUser as never)

      expect(mockNotificationsService.notifyCaseUnassigned).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'user-003',
        mockUser.sub,
        mockUser.email
      )
    })

    it('should notify case owner about status change', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test',
        description: 'Test',
        severity: 'high',
        status: 'open',
        ownerUserId: 'user-005',
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-005',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })

      const updatedCase = {
        ...existingCase,
        status: 'in_progress',
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(updatedCase)

      await service.updateCase('case-1', { status: 'in_progress' } as never, mockUser as never)

      expect(mockNotificationsService.notifyCaseActivity).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'user-005',
        'case_status_changed',
        JSON.stringify({
          key: 'caseStatusChangedMessage',
          params: { caseRef: 'SOC-2026-001', status: 'in_progress' },
        }),
        mockUser.sub,
        mockUser.email
      )
    })

    it('should notify case owner about field edits (title/description/severity)', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Old title',
        description: 'Test',
        severity: 'high',
        status: 'open',
        ownerUserId: 'user-005',
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue({
        id: 'user-005',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findUserNameById.mockResolvedValue({ name: 'Analyst' })

      const updatedCase = {
        ...existingCase,
        title: 'New title',
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.updateCaseTransaction.mockResolvedValue(updatedCase)

      await service.updateCase('case-1', { title: 'New title' } as never, mockUser as never)

      expect(mockNotificationsService.notifyCaseActivity).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'user-005',
        'case_updated',
        JSON.stringify({
          key: 'caseUpdatedMessage',
          params: { caseRef: 'SOC-2026-001', detail: 'has been updated' },
        }),
        mockUser.sub,
        mockUser.email
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* linkAlert (closed-case guard)                                        */
  /* ------------------------------------------------------------------ */

  describe('linkAlert', () => {
    it('should reject linking alert to a closed case', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'medium',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const dto = { alertId: 'alert-1' }

      await expect(service.linkAlert('case-1', dto as never, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.linkAlert('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toBe('Cannot link alerts to a closed case')
      }

      expect(repository.linkAlertTransaction).not.toHaveBeenCalled()
    })

    it('should link alert to an open case', async () => {
      const openCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Open case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(openCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.countAlertByTenantAndId.mockResolvedValue(1)

      const updatedCase = {
        ...openCase,
        linkedAlerts: ['alert-1'],
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.linkAlertTransaction.mockResolvedValue(updatedCase)

      const dto = { alertId: 'alert-1' }

      const result = await service.linkAlert('case-1', dto as never, mockUser as never)
      expect(result.tenantName).toBe('AuraSpear')
      expect(repository.linkAlertTransaction).toHaveBeenCalled()
    })

    it('should reject duplicate alert link', async () => {
      const caseWithAlert = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Case with alert',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: ['alert-1'],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(caseWithAlert)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.countAlertByTenantAndId.mockResolvedValue(1)

      const dto = { alertId: 'alert-1' }

      await expect(service.linkAlert('case-1', dto as never, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.linkAlert('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(409)
      }
    })

    it('should reject linking alert that does not belong to tenant', async () => {
      const openCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Open case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(openCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      // Alert does not belong to tenant
      repository.countAlertByTenantAndId.mockResolvedValue(0)

      const dto = { alertId: 'alert-foreign' }

      await expect(service.linkAlert('case-1', dto as never, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.linkAlert('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* addCaseNote (closed-case guard)                                      */
  /* ------------------------------------------------------------------ */

  describe('addCaseNote', () => {
    it('should reject adding note to a closed case', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'medium',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const dto = { body: 'This is a note' }

      await expect(service.addCaseNote('case-1', dto as never, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.addCaseNote('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toBe('Cannot add notes to a closed case')
      }

      expect(repository.addNoteTransaction).not.toHaveBeenCalled()
    })

    it('should add note to an open case', async () => {
      const openCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Open case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(openCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const createdNote = {
        id: 'note-1',
        caseId: 'case-1',
        author: mockUser.email,
        body: 'Investigation note',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.addNoteTransaction.mockResolvedValue(createdNote)

      const dto = { body: 'Investigation note' }

      const result = await service.addCaseNote('case-1', dto as never, mockUser as never)
      expect(result.body).toBe('Investigation note')
      expect(result.author).toBe(mockUser.email)
      expect(repository.addNoteTransaction).toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* deleteCase                                                           */
  /* ------------------------------------------------------------------ */

  describe('deleteCase', () => {
    it('should soft-delete case', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Suspicious login',
        description: 'Multiple failed logins',
        severity: 'high',
        status: 'open',
        ownerUserId: null,
        createdBy: 'admin@test.com',
        cycleId: 'cycle-1',
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      repository.softDeleteCaseTransaction.mockResolvedValue(undefined)

      const result = await service.deleteCase('case-1', TENANT_ID, mockUser.email)

      expect(result.deleted).toBe(true)
      expect(repository.softDeleteCaseTransaction).toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* createTask                                                           */
  /* ------------------------------------------------------------------ */

  describe('createTask', () => {
    it('should create task with timeline entry', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const createdTask = {
        id: 'task-1',
        caseId: 'case-1',
        title: 'Review logs',
        status: 'pending',
        assignee: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.createTask.mockResolvedValue(createdTask)
      repository.createTimeline.mockResolvedValue({})

      const dto = { title: 'Review logs' }

      const result = await service.createTask('case-1', dto as never, mockUser as never)

      expect(result.title).toBe('Review logs')
      expect(result.status).toBe('pending')
      expect(repository.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          title: 'Review logs',
          status: 'pending',
        })
      )
      expect(repository.createTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          actor: mockUser.email,
        })
      )
    })

    it('should create task with custom status and assignee', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const createdTask = {
        id: 'task-1',
        caseId: 'case-1',
        title: 'Analyze malware',
        status: 'in_progress',
        assignee: 'bob@test.com',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.createTask.mockResolvedValue(createdTask)
      repository.createTimeline.mockResolvedValue({})

      const dto = {
        title: 'Analyze malware',
        status: 'in_progress',
        assignee: 'bob@test.com',
      }

      const result = await service.createTask('case-1', dto as never, mockUser as never)

      expect(result.title).toBe('Analyze malware')
      expect(result.status).toBe('in_progress')
      expect(result.assignee).toBe('bob@test.com')
    })

    it('should notify case owner about new task', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: 'owner-user',
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue({
        id: 'owner-user',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)

      repository.createTask.mockResolvedValue({
        id: 'task-1',
        caseId: 'case-1',
        title: 'Investigate',
        status: 'pending',
        assignee: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
      })
      repository.createTimeline.mockResolvedValue({})

      await service.createTask('case-1', { title: 'Investigate' } as never, mockUser as never)

      expect(mockNotificationsService.notifyCaseActivity).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'owner-user',
        'case_task_added',
        expect.stringContaining('Investigate'),
        mockUser.sub,
        mockUser.email
      )
    })

    it('should reject creating task on a closed case', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'medium',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const dto = { title: 'New task' }

      await expect(service.createTask('case-1', dto as never, mockUser as never)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.createTask('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toBe('Cannot add tasks to a closed case')
      }

      // Ensure no task was created
      expect(repository.createTask).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* updateTask                                                           */
  /* ------------------------------------------------------------------ */

  describe('updateTask', () => {
    it('should update task status and add timeline entry', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const existingTask = {
        id: 'task-1',
        caseId: 'case-1',
        title: 'Review logs',
        status: 'pending',
        assignee: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      const updatedTask = {
        ...existingTask,
        status: 'completed',
      }
      repository.findTaskByIdAndCase
        .mockResolvedValueOnce(existingTask)
        .mockResolvedValueOnce(updatedTask)

      repository.updateTask.mockResolvedValue(updatedTask)
      repository.createTimeline.mockResolvedValue({})

      const dto = { status: 'completed' }

      const result = await service.updateTask('case-1', 'task-1', dto as never, mockUser as never)

      expect(result.status).toBe('completed')
      expect(repository.updateTask).toHaveBeenCalledWith(
        'task-1',
        'case-1',
        expect.objectContaining({ status: 'completed' })
      )
      // Timeline should be created because status changed
      expect(repository.createTimeline).toHaveBeenCalled()
    })

    it('should update task title without timeline when status unchanged', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const existingTask = {
        id: 'task-1',
        caseId: 'case-1',
        title: 'Review logs',
        status: 'pending',
        assignee: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      const updatedTask = {
        ...existingTask,
        title: 'Review all logs',
      }
      repository.findTaskByIdAndCase
        .mockResolvedValueOnce(existingTask)
        .mockResolvedValueOnce(updatedTask)

      repository.updateTask.mockResolvedValue(updatedTask)

      const dto = { title: 'Review all logs' }

      const result = await service.updateTask('case-1', 'task-1', dto as never, mockUser as never)

      expect(result.title).toBe('Review all logs')
      // Timeline should NOT be created when only title changed (no status change)
      expect(repository.createTimeline).not.toHaveBeenCalled()
    })

    it('should throw when task not found', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findTaskByIdAndCase.mockResolvedValue(null)

      await expect(
        service.updateTask('case-1', 'nonexistent', { title: 'x' } as never, mockUser as never)
      ).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* deleteTask                                                           */
  /* ------------------------------------------------------------------ */

  describe('deleteTask', () => {
    it('should delete task and add timeline entry', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const existingTask = {
        id: 'task-1',
        caseId: 'case-1',
        title: 'Review logs',
        status: 'pending',
        assignee: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.findTaskByIdAndCase.mockResolvedValue(existingTask)
      repository.deleteTask.mockResolvedValue(existingTask)
      repository.createTimeline.mockResolvedValue({})

      const result = await service.deleteTask('case-1', 'task-1', mockUser as never)

      expect(result.deleted).toBe(true)
      expect(repository.deleteTask).toHaveBeenCalledWith('task-1', 'case-1')
      expect(repository.createTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          actor: mockUser.email,
        })
      )
    })

    it('should throw when task not found', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findTaskByIdAndCase.mockResolvedValue(null)

      await expect(service.deleteTask('case-1', 'nonexistent', mockUser as never)).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* createArtifact                                                       */
  /* ------------------------------------------------------------------ */

  describe('createArtifact', () => {
    it('should create artifact with timeline entry', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      // No duplicate
      repository.findArtifactDuplicate.mockResolvedValue(null)

      const createdArtifact = {
        id: 'artifact-1',
        caseId: 'case-1',
        type: 'ip',
        value: '192.168.1.1',
        source: 'manual',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.createArtifact.mockResolvedValue(createdArtifact)
      repository.createTimeline.mockResolvedValue({})

      const dto = { type: 'ip', value: '192.168.1.1' }

      const result = await service.createArtifact('case-1', dto as never, mockUser as never)

      expect(result.type).toBe('ip')
      expect(result.value).toBe('192.168.1.1')
      expect(result.source).toBe('manual')
      expect(repository.createArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          type: 'ip',
          value: '192.168.1.1',
          source: 'manual',
        })
      )
      expect(repository.createTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          actor: mockUser.email,
        })
      )
    })

    it('should notify case owner about new artifact', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: 'owner-user',
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findArtifactDuplicate.mockResolvedValue(null)
      repository.findUserById.mockResolvedValue({
        id: 'owner-user',
        name: 'Alice',
        email: 'alice@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)

      repository.createArtifact.mockResolvedValue({
        id: 'artifact-1',
        caseId: 'case-1',
        type: 'ip',
        value: '10.0.0.1',
        source: 'manual',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      })
      repository.createTimeline.mockResolvedValue({})

      await service.createArtifact(
        'case-1',
        { type: 'ip', value: '10.0.0.1' } as never,
        mockUser as never
      )

      expect(mockNotificationsService.notifyCaseActivity).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'owner-user',
        'case_artifact_added',
        expect.stringContaining('10.0.0.1'),
        mockUser.sub,
        mockUser.email
      )
    })

    it('should reject creating artifact on a closed case', async () => {
      const closedCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Closed case',
        description: 'Test',
        severity: 'medium',
        status: 'closed',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: nowDate(),
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const dto = { type: 'ip', value: '10.0.0.1' }

      await expect(
        service.createArtifact('case-1', dto as never, mockUser as never)
      ).rejects.toThrow(BusinessException)

      try {
        await service.createArtifact('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toBe('Cannot add artifacts to a closed case')
      }

      // Ensure no artifact was created
      expect(repository.createArtifact).not.toHaveBeenCalled()
    })

    it('should reject duplicate artifact (same type + value)', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      // Duplicate exists
      repository.findArtifactDuplicate.mockResolvedValue({
        id: 'artifact-existing',
        caseId: 'case-1',
        type: 'ip',
        value: '192.168.1.1',
        source: 'manual',
      })

      const dto = { type: 'ip', value: '192.168.1.1' }

      await expect(
        service.createArtifact('case-1', dto as never, mockUser as never)
      ).rejects.toThrow(BusinessException)

      try {
        await service.createArtifact('case-1', dto as never, mockUser as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(409)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* deleteArtifact                                                       */
  /* ------------------------------------------------------------------ */

  describe('deleteArtifact', () => {
    it('should delete artifact and add timeline entry', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const existingArtifact = {
        id: 'artifact-1',
        caseId: 'case-1',
        type: 'hash',
        value: 'abc123def456',
        source: 'manual',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      }

      repository.findArtifactByIdAndCase.mockResolvedValue(existingArtifact)
      repository.deleteArtifact.mockResolvedValue(existingArtifact)
      repository.createTimeline.mockResolvedValue({})

      const result = await service.deleteArtifact('case-1', 'artifact-1', mockUser as never)

      expect(result.deleted).toBe(true)
      expect(repository.deleteArtifact).toHaveBeenCalledWith('artifact-1', 'case-1')
      expect(repository.createTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          actor: mockUser.email,
        })
      )
    })

    it('should throw when artifact not found', async () => {
      const existingCase = {
        id: 'case-1',
        tenantId: TENANT_ID,
        caseNumber: 'SOC-2026-001',
        title: 'Test case',
        description: 'Test',
        severity: 'medium',
        status: 'open',
        ownerUserId: null,
        createdBy: mockUser.email,
        cycleId: null,
        linkedAlerts: [],
        closedAt: null,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        notes: [],
        timeline: [],
        tasks: [],
        artifacts: [],
        tenant: { name: 'AuraSpear' },
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findArtifactByIdAndCase.mockResolvedValue(null)

      await expect(
        service.deleteArtifact('case-1', 'nonexistent', mockUser as never)
      ).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* COMMENTS                                                             */
  /* ------------------------------------------------------------------ */

  describe('listCaseComments', () => {
    const existingCase = {
      id: 'case-1',
      tenantId: TENANT_ID,
      caseNumber: 'SOC-2026-001',
      title: 'Test Case',
      status: 'open',
      severity: 'medium',
      ownerUserId: null,
      createdBy: 'analyst@auraspear.com',
      linkedAlerts: [],
      cycleId: null,
      closedAt: null,
      description: 'desc',
      createdAt: nowDate(),
      updatedAt: nowDate(),
      notes: [],
      timeline: [],
      tasks: [],
      artifacts: [],
      tenant: { name: 'AuraSpear' },
    }

    it('should return paginated comments', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const mockComments = [
        {
          id: 'comment-1',
          caseId: 'case-1',
          authorId: 'user-001',
          body: 'Hello world',
          isEdited: false,
          isDeleted: false,
          createdAt: nowDate(),
          updatedAt: nowDate(),
          mentions: [],
        },
      ]

      repository.findCommentsAndCount.mockResolvedValue([mockComments, 1])
      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Analyst', email: 'analyst@auraspear.com' },
      ])

      const result = await service.listCaseComments('case-1', TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].body).toBe('Hello world')
      expect(result.data[0].author.name).toBe('Analyst')
      expect(result.pagination.total).toBe(1)
    })

    it('should return empty list for case with no comments', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentsAndCount.mockResolvedValue([[], 0])

      const result = await service.listCaseComments('case-1', TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should throw if case not found', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(null)

      await expect(service.listCaseComments('nonexistent', TENANT_ID)).rejects.toThrow(
        BusinessException
      )
    })

    it('should resolve mention users in batch', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const mockComments = [
        {
          id: 'comment-1',
          caseId: 'case-1',
          authorId: 'user-001',
          body: 'Hey @user2',
          isEdited: false,
          isDeleted: false,
          createdAt: nowDate(),
          updatedAt: nowDate(),
          mentions: [
            { id: 'mention-1', commentId: 'comment-1', userId: 'user-002', createdAt: nowDate() },
          ],
        },
      ]

      repository.findCommentsAndCount.mockResolvedValue([mockComments, 1])
      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Author', email: 'author@test.com' },
        { id: 'user-002', name: 'Mentioned', email: 'mentioned@test.com' },
      ])

      const result = await service.listCaseComments('case-1', TENANT_ID)

      expect(result.data[0].mentions).toHaveLength(1)
      expect(result.data[0].mentions[0].name).toBe('Mentioned')
    })
  })

  describe('addCaseComment', () => {
    const existingCase = {
      id: 'case-1',
      tenantId: TENANT_ID,
      caseNumber: 'SOC-2026-001',
      title: 'Test Case',
      status: 'open',
      severity: 'medium',
      ownerUserId: null,
      createdBy: 'analyst@auraspear.com',
      linkedAlerts: [],
      cycleId: null,
      closedAt: null,
      description: 'desc',
      createdAt: nowDate(),
      updatedAt: nowDate(),
      notes: [],
      timeline: [],
      tasks: [],
      artifacts: [],
      tenant: { name: 'AuraSpear' },
    }

    it('should create a comment successfully', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      const createdComment = {
        id: 'comment-new',
        caseId: 'case-1',
        authorId: 'user-001',
        body: 'New comment',
        isEdited: false,
        isDeleted: false,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        mentions: [],
      }

      repository.addCommentTransaction.mockResolvedValue(createdComment)

      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Analyst', email: 'analyst@auraspear.com' },
      ])

      const result = await service.addCaseComment(
        'case-1',
        { body: 'New comment', mentionedUserIds: [] },
        mockUser as never
      )

      expect(result.body).toBe('New comment')
      expect(result.author.id).toBe('user-001')
    })

    it('should reject comment on closed case', async () => {
      const closedCase = { ...existingCase, status: 'closed' }
      repository.findCaseByIdAndTenant.mockResolvedValue(closedCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)

      await expect(
        service.addCaseComment(
          'case-1',
          { body: 'Comment', mentionedUserIds: [] },
          mockUser as never
        )
      ).rejects.toThrow(BusinessException)
    })

    it('should reject invalid mentioned users', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.countActiveMentionMemberships.mockResolvedValue(0)

      await expect(
        service.addCaseComment(
          'case-1',
          { body: 'Hello @user', mentionedUserIds: ['invalid-user-id'] },
          mockUser as never
        )
      ).rejects.toThrow(BusinessException)
    })

    it('should create mentions when valid users provided', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.countActiveMentionMemberships.mockResolvedValue(1)

      const createdComment = {
        id: 'comment-new',
        caseId: 'case-1',
        authorId: 'user-001',
        body: 'Hello @user2',
        isEdited: false,
        isDeleted: false,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        mentions: [
          { id: 'mention-1', commentId: 'comment-new', userId: 'user-002', createdAt: nowDate() },
        ],
      }

      repository.addCommentTransaction.mockResolvedValue(createdComment)

      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Analyst', email: 'analyst@auraspear.com' },
        { id: 'user-002', name: 'Mentioned', email: 'mentioned@test.com' },
      ])

      const result = await service.addCaseComment(
        'case-1',
        { body: 'Hello @user2', mentionedUserIds: ['user-002'] },
        mockUser as never
      )

      expect(result.mentions).toHaveLength(1)
      expect(repository.addCommentTransaction).toHaveBeenCalledWith(
        'case-1',
        'user-001',
        'Hello @user2',
        ['user-002'],
        expect.objectContaining({ type: expect.anything() })
      )
    })

    it('should deduplicate mention ids', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.countActiveMentionMemberships.mockResolvedValue(1)

      const createdComment = {
        id: 'comment-new',
        caseId: 'case-1',
        authorId: 'user-001',
        body: 'test',
        isEdited: false,
        isDeleted: false,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        mentions: [
          { id: 'mention-1', commentId: 'comment-new', userId: 'user-002', createdAt: nowDate() },
        ],
      }

      repository.addCommentTransaction.mockResolvedValue(createdComment)

      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Analyst', email: 'analyst@auraspear.com' },
        { id: 'user-002', name: 'Mentioned', email: 'mentioned@test.com' },
      ])

      await service.addCaseComment(
        'case-1',
        { body: 'test', mentionedUserIds: ['user-002', 'user-002', 'user-002'] },
        mockUser as never
      )

      expect(repository.countActiveMentionMemberships).toHaveBeenCalledWith(
        ['user-002'],
        TENANT_ID,
        expect.anything()
      )
    })

    it('should notify case owner about new comment', async () => {
      const caseWithOwner = {
        ...existingCase,
        ownerUserId: 'owner-user',
      }

      repository.findCaseByIdAndTenant.mockResolvedValue(caseWithOwner)
      repository.findUserById.mockResolvedValue({
        id: 'owner-user',
        name: 'Owner',
        email: 'owner@test.com',
      })
      repository.findUserByEmail.mockResolvedValue(null)

      const createdComment = {
        id: 'comment-new',
        caseId: 'case-1',
        authorId: 'user-001',
        body: 'Hello world',
        isEdited: false,
        isDeleted: false,
        createdAt: nowDate(),
        updatedAt: nowDate(),
        mentions: [],
      }

      repository.addCommentTransaction.mockResolvedValue(createdComment)

      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Analyst', email: 'analyst@auraspear.com' },
      ])

      await service.addCaseComment(
        'case-1',
        { body: 'Hello world', mentionedUserIds: [] },
        mockUser as never
      )

      expect(mockNotificationsService.notifyCaseActivity).toHaveBeenCalledWith(
        TENANT_ID,
        'case-1',
        'SOC-2026-001',
        'owner-user',
        'case_comment_added',
        expect.stringContaining('Hello world'),
        mockUser.sub,
        mockUser.email
      )
    })
  })

  describe('updateCaseComment', () => {
    const existingCase = {
      id: 'case-1',
      tenantId: TENANT_ID,
      caseNumber: 'SOC-2026-001',
      title: 'Test',
      status: 'open',
      severity: 'medium',
      ownerUserId: null,
      createdBy: 'analyst@auraspear.com',
      linkedAlerts: [],
      cycleId: null,
      closedAt: null,
      description: 'desc',
      createdAt: nowDate(),
      updatedAt: nowDate(),
      notes: [],
      timeline: [],
      tasks: [],
      artifacts: [],
      tenant: { name: 'AuraSpear' },
    }

    const existingComment = {
      id: 'comment-1',
      caseId: 'case-1',
      authorId: 'user-001',
      body: 'Original',
      isEdited: false,
      isDeleted: false,
      createdAt: nowDate(),
      updatedAt: nowDate(),
    }

    it('should update own comment', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentByIdAndCase.mockResolvedValue(existingComment)

      const updatedComment = {
        ...existingComment,
        body: 'Updated',
        isEdited: true,
        mentions: [],
      }

      repository.updateCommentTransaction.mockResolvedValue(updatedComment)

      repository.findUsersByIds.mockResolvedValue([
        { id: 'user-001', name: 'Analyst', email: 'analyst@auraspear.com' },
      ])

      const result = await service.updateCaseComment(
        'case-1',
        'comment-1',
        { body: 'Updated', mentionedUserIds: [] },
        mockUser as never
      )

      expect(result.body).toBe('Updated')
      expect(result.isEdited).toBe(true)
    })

    it('should reject editing another user comment when not admin', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentByIdAndCase.mockResolvedValue({
        ...existingComment,
        authorId: 'other-user',
      })

      const lowRoleUser = { ...mockUser, sub: 'user-003', role: 'SOC_ANALYST_L1' as const }

      await expect(
        service.updateCaseComment(
          'case-1',
          'comment-1',
          { body: 'Hacked', mentionedUserIds: [] },
          lowRoleUser as never
        )
      ).rejects.toThrow(BusinessException)
    })

    it('should throw if comment not found', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentByIdAndCase.mockResolvedValue(null)

      await expect(
        service.updateCaseComment(
          'case-1',
          'nonexistent',
          { body: 'Updated', mentionedUserIds: [] },
          mockUser as never
        )
      ).rejects.toThrow(BusinessException)
    })
  })

  describe('deleteCaseComment', () => {
    const existingCase = {
      id: 'case-1',
      tenantId: TENANT_ID,
      caseNumber: 'SOC-2026-001',
      title: 'Test',
      status: 'open',
      severity: 'medium',
      ownerUserId: null,
      createdBy: 'analyst@auraspear.com',
      linkedAlerts: [],
      cycleId: null,
      closedAt: null,
      description: 'desc',
      createdAt: nowDate(),
      updatedAt: nowDate(),
      notes: [],
      timeline: [],
      tasks: [],
      artifacts: [],
      tenant: { name: 'AuraSpear' },
    }

    it('should soft-delete own comment', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentByIdAndCase.mockResolvedValue({
        id: 'comment-1',
        caseId: 'case-1',
        authorId: 'user-001',
        body: 'Test',
        isEdited: false,
        isDeleted: false,
      })

      repository.softDeleteCommentTransaction.mockResolvedValue(undefined)

      const result = await service.deleteCaseComment('case-1', 'comment-1', mockUser as never)

      expect(result.deleted).toBe(true)
    })

    it('should reject deleting another user comment when not admin', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentByIdAndCase.mockResolvedValue({
        id: 'comment-1',
        caseId: 'case-1',
        authorId: 'other-user',
        body: 'Test',
        isEdited: false,
        isDeleted: false,
      })

      const lowRoleUser = { ...mockUser, sub: 'user-003', role: 'SOC_ANALYST_L1' as const }

      await expect(
        service.deleteCaseComment('case-1', 'comment-1', lowRoleUser as never)
      ).rejects.toThrow(BusinessException)
    })

    it('should throw if comment not found', async () => {
      repository.findCaseByIdAndTenant.mockResolvedValue(existingCase)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      repository.findCommentByIdAndCase.mockResolvedValue(null)

      await expect(
        service.deleteCaseComment('case-1', 'nonexistent', mockUser as never)
      ).rejects.toThrow(BusinessException)
    })
  })

  describe('searchMentionableUsers', () => {
    it('should return matching users in tenant', async () => {
      repository.searchMentionableMembers.mockResolvedValue([
        {
          id: 'membership-1',
          userId: 'user-001',
          tenantId: TENANT_ID,
          user: { id: 'user-001', name: 'John Doe', email: 'john@test.com' },
        },
      ])

      const result = await service.searchMentionableUsers(TENANT_ID, 'john', 10)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John Doe')
    })

    it('should return empty array when no match', async () => {
      repository.searchMentionableMembers.mockResolvedValue([])

      const result = await service.searchMentionableUsers(TENANT_ID, 'nonexistent', 10)

      expect(result).toHaveLength(0)
    })
  })
})
