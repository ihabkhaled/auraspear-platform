import { type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { AuthGuard } from '../../src/common/guards/auth.guard'

function createMockContext(user?: Record<string, unknown>, authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        headers: {
          authorization: authHeader,
        },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()

    const authService = {
      verifyAccessToken: jest.fn(),
      validateUserActive: jest.fn(),
      validateMembershipActive: jest.fn(),
    }

    const prismaService = {
      tenant: {
        findUnique: jest.fn(),
      },
      tenantMembership: {
        findUnique: jest.fn(),
      },
    }

    guard = new AuthGuard(reflector, authService as never, prismaService as never)
  })

  it('should allow public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)
    const context = createMockContext()
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
  })

  it('should throw BusinessException when no auth header is provided', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    const context = createMockContext(undefined, undefined)
    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })

  it('should throw BusinessException for non-Bearer auth header', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    const context = createMockContext(undefined, 'Basic abc123')
    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })
})
