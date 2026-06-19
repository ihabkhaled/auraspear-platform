import { Body, Controller, Get, Post, Req, Res, UsePipes } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { clearAuthCookies, issueCsrfToken, setAuthCookies } from './auth-cookie.utility'
import { buildAuthSessionContext } from './auth-session.utilities'
import { AuthService } from './auth.service'
import { AuthLoginSchema, type AuthLoginDto } from './dto/auth-login.dto'
import { AuthLogoutSchema, type AuthLogoutDto } from './dto/auth-logout.dto'
import { AuthRefreshSchema, type AuthRefreshDto } from './dto/auth-refresh.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  AuthenticatedRequest,
  JwtPayload,
} from '../../common/interfaces/authenticated-request.interface'
import type { Request, Response } from 'express'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(AuthLoginSchema))
  async login(
    @Body() dto: AuthLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<{
    accessToken: string
    csrfToken: string
    user: JwtPayload
    permissions: string[]
    tenants: Array<{ id: string; name: string; slug: string; role: string }>
  }> {
    const session = await this.authService.login(
      dto.email,
      dto.password,
      buildAuthSessionContext(request)
    )
    setAuthCookies(response, session.accessToken, session.refreshToken)
    const csrfToken = issueCsrfToken(response)

    return {
      accessToken: session.accessToken,
      csrfToken,
      user: session.user,
      permissions: session.permissions,
      tenants: session.tenants,
    }
  }

  @ApiBearerAuth()
  @Get('me')
  async getProfile(
    @CurrentUser() user: JwtPayload
  ): Promise<{ user: JwtPayload; permissions: string[] }> {
    const permissions = await this.authService.getPermissions(user.tenantId, user.role)
    return { user, permissions }
  }

  @ApiBearerAuth()
  @Get('tenants')
  async getTenants(
    @CurrentUser() user: JwtPayload
  ): Promise<Array<{ id: string; name: string; slug: string; role: string }>> {
    return this.authService.getUserTenants(user.sub)
  }

  @Public()
  @SkipCsrf()
  @Post('refresh')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(AuthRefreshSchema))
  async refresh(
    @Req() request: Request,
    @Body() dto: AuthRefreshDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ accessToken: string; csrfToken: string }> {
    const cookieToken = request.cookies?.['refresh_token'] as string | undefined
    const refreshToken = this.authService.resolveRefreshToken(cookieToken, dto.refreshToken)
    const requestedTenantId = this.getSingleHeaderValue(request.headers['x-tenant-id'])
    const session = await this.authService.refreshTokens(
      refreshToken,
      requestedTenantId,
      buildAuthSessionContext(request)
    )
    setAuthCookies(response, session.accessToken, session.refreshToken)
    const csrfToken = issueCsrfToken(response)

    return {
      accessToken: session.accessToken,
      csrfToken,
    }
  }

  @ApiBearerAuth()
  @Post('end-impersonation')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async endImpersonation(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ accessToken: string; csrfToken: string; user: JwtPayload }> {
    const session = await this.authService.endImpersonation(user, buildAuthSessionContext(request))
    setAuthCookies(response, session.accessToken, session.refreshToken)
    const csrfToken = issueCsrfToken(response)

    return {
      accessToken: session.accessToken,
      csrfToken,
      user: session.user,
    }
  }

  @ApiBearerAuth()
  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(AuthLogoutSchema)) dto: AuthLogoutDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ loggedOut: boolean }> {
    const cookieToken = request.cookies?.['refresh_token'] as string | undefined
    const refreshToken = this.authService.resolveRefreshToken(cookieToken, dto.refreshToken)
    await this.authService.performLogout(request.user, refreshToken)
    clearAuthCookies(response)

    return { loggedOut: true }
  }

  private getSingleHeaderValue(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
      return value
    }

    return value?.[0]
  }
}
