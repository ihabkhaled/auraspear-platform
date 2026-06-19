import { Test } from '@nestjs/testing'
import { AuthGuard } from '../../../../common/guards/auth.guard'
import { TenantGuard } from '../../../../common/guards/tenant.guard'
import { AiChatController } from '../ai-chat.controller'
import { AiChatService } from '../ai-chat.service'
import type { JwtPayload } from '../../../../common/interfaces/authenticated-request.interface'
import type { AiChatMessage, AiChatThread } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* Constants                                                         */
/* ---------------------------------------------------------------- */

const TENANT_ID = 'tenant-1'
const USER_ID = 'user-1'
const THREAD_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

const mockUser: JwtPayload = {
  sub: USER_ID,
  email: 'user@test.com',
  tenantId: TENANT_ID,
  role: 'analyst',
} as never

/* ---------------------------------------------------------------- */
/* Mock service                                                      */
/* ---------------------------------------------------------------- */

const mockService = {
  listThreads: jest.fn(),
  createThread: jest.fn(),
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  updateThreadSettings: jest.fn(),
  archiveThread: jest.fn(),
}

/* ---------------------------------------------------------------- */
/* Mock responses                                                    */
/* ---------------------------------------------------------------- */

const mockThread = {
  id: THREAD_ID,
  tenantId: TENANT_ID,
  userId: USER_ID,
  connectorId: null,
  title: 'Test thread',
  model: 'gpt-4',
  provider: 'llm_apis',
} as unknown as AiChatThread

const mockMessage = {
  id: 'msg-1',
  threadId: THREAD_ID,
  tenantId: TENANT_ID,
  role: 'assistant',
  content: 'Hello there',
} as unknown as AiChatMessage

/* ---------------------------------------------------------------- */
/* Test suite                                                        */
/* ---------------------------------------------------------------- */

describe('AiChatController', () => {
  let controller: AiChatController
  let service: jest.Mocked<typeof mockService>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module = await Test.createTestingModule({
      controllers: [AiChatController],
      providers: [{ provide: AiChatService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(AiChatController)
    service = module.get(AiChatService) as never
  })

  /* ---------------------------------------------------------------- */
  /* GET /ai-chat/threads                                              */
  /* ---------------------------------------------------------------- */

  describe('listThreads', () => {
    const paginatedResponse = {
      data: [mockThread],
      nextCursor: null,
      hasMore: false,
    }

    it('parses limit and cursor from query', async () => {
      service.listThreads.mockResolvedValue(paginatedResponse)

      const result = await controller.listThreads(TENANT_ID, mockUser, '10', 'some-cursor')

      expect(service.listThreads).toHaveBeenCalledWith(TENANT_ID, USER_ID, 10, 'some-cursor')
      expect(result).toEqual(paginatedResponse)
    })

    it('clamps limit to max 50', async () => {
      service.listThreads.mockResolvedValue(paginatedResponse)

      await controller.listThreads(TENANT_ID, mockUser, '999')

      expect(service.listThreads).toHaveBeenCalledWith(TENANT_ID, USER_ID, 50, undefined)
    })

    it('falls back to 20 when limit is 0 (falsy)', async () => {
      service.listThreads.mockResolvedValue(paginatedResponse)

      await controller.listThreads(TENANT_ID, mockUser, '0')

      expect(service.listThreads).toHaveBeenCalledWith(TENANT_ID, USER_ID, 20, undefined)
    })

    it('defaults limit to 20 when not provided', async () => {
      service.listThreads.mockResolvedValue(paginatedResponse)

      await controller.listThreads(TENANT_ID, mockUser)

      expect(service.listThreads).toHaveBeenCalledWith(TENANT_ID, USER_ID, 20, undefined)
    })

    it('defaults limit to 20 for non-numeric input', async () => {
      service.listThreads.mockResolvedValue(paginatedResponse)

      await controller.listThreads(TENANT_ID, mockUser, 'abc')

      expect(service.listThreads).toHaveBeenCalledWith(TENANT_ID, USER_ID, 20, undefined)
    })
  })

  /* ---------------------------------------------------------------- */
  /* POST /ai-chat/threads                                             */
  /* ---------------------------------------------------------------- */

  describe('createThread', () => {
    it('passes body to service', async () => {
      const body = { connectorId: 'some-uuid', model: 'gpt-4', systemPrompt: 'Be helpful' }
      service.createThread.mockResolvedValue(mockThread)

      const result = await controller.createThread(TENANT_ID, mockUser, body)

      expect(service.createThread).toHaveBeenCalledWith(TENANT_ID, USER_ID, body)
      expect(result).toEqual(mockThread)
    })

    it('passes empty body to service', async () => {
      service.createThread.mockResolvedValue(mockThread)

      await controller.createThread(TENANT_ID, mockUser, {})

      expect(service.createThread).toHaveBeenCalledWith(TENANT_ID, USER_ID, {})
    })
  })

  /* ---------------------------------------------------------------- */
  /* GET /ai-chat/threads/:id/messages                                 */
  /* ---------------------------------------------------------------- */

  describe('getMessages', () => {
    const paginatedMessages = {
      data: [mockMessage],
      nextCursor: null,
      hasMore: false,
    }

    it('parses direction and passes to service', async () => {
      service.getMessages.mockResolvedValue(paginatedMessages)

      const result = await controller.getMessages(
        TENANT_ID,
        mockUser,
        THREAD_ID,
        '15',
        'some-cursor',
        'newer'
      )

      expect(service.getMessages).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        THREAD_ID,
        15,
        'some-cursor',
        'newer'
      )
      expect(result).toEqual(paginatedMessages)
    })

    it('defaults direction to older', async () => {
      service.getMessages.mockResolvedValue(paginatedMessages)

      await controller.getMessages(TENANT_ID, mockUser, THREAD_ID)

      expect(service.getMessages).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        THREAD_ID,
        30,
        undefined,
        'older'
      )
    })

    it('falls back to older for invalid direction', async () => {
      service.getMessages.mockResolvedValue(paginatedMessages)

      await controller.getMessages(TENANT_ID, mockUser, THREAD_ID, '10', undefined, 'invalid')

      expect(service.getMessages).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        THREAD_ID,
        10,
        undefined,
        'older'
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* POST /ai-chat/threads/:id/messages                                */
  /* ---------------------------------------------------------------- */

  describe('sendMessage', () => {
    it('passes content and overrides to service', async () => {
      const body = { content: 'Hello AI', model: 'gpt-4-turbo', connectorId: 'conn-1' }
      service.sendMessage.mockResolvedValue(mockMessage)

      const result = await controller.sendMessage(TENANT_ID, mockUser, THREAD_ID, body)

      expect(service.sendMessage).toHaveBeenCalledWith(TENANT_ID, USER_ID, THREAD_ID, 'Hello AI', {
        model: 'gpt-4-turbo',
        connectorId: 'conn-1',
      })
      expect(result).toEqual(mockMessage)
    })

    it('passes content without overrides', async () => {
      const body = { content: 'Simple question' }
      service.sendMessage.mockResolvedValue(mockMessage)

      await controller.sendMessage(TENANT_ID, mockUser, THREAD_ID, body)

      expect(service.sendMessage).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        THREAD_ID,
        'Simple question',
        { model: undefined, connectorId: undefined }
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* PATCH /ai-chat/threads/:id                                        */
  /* ---------------------------------------------------------------- */

  describe('updateThread', () => {
    it('passes body to service', async () => {
      const body = { connectorId: 'new-conn', model: 'claude-3' }
      service.updateThreadSettings.mockResolvedValue(mockThread)

      const result = await controller.updateThread(TENANT_ID, mockUser, THREAD_ID, body)

      expect(service.updateThreadSettings).toHaveBeenCalledWith(TENANT_ID, USER_ID, THREAD_ID, body)
      expect(result).toEqual(mockThread)
    })
  })

  /* ---------------------------------------------------------------- */
  /* DELETE /ai-chat/threads/:id                                       */
  /* ---------------------------------------------------------------- */

  describe('archiveThread', () => {
    it('calls service.archiveThread', async () => {
      service.archiveThread.mockResolvedValue(undefined)

      await controller.archiveThread(TENANT_ID, mockUser, THREAD_ID)

      expect(service.archiveThread).toHaveBeenCalledWith(TENANT_ID, USER_ID, THREAD_ID)
    })
  })
})
