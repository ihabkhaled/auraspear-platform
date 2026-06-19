import { Logger, Inject, forwardRef } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import {
  NotificationAuthorizationPrefix,
  NotificationGatewayEvent,
  NotificationGatewayNamespace,
  NotificationSocketAuthField,
  NotificationSocketDataKey,
  PermissionUpdateReason,
} from './notifications.enums'
import { UrlProtocol } from '../../common/enums'
import { toIso } from '../../common/utils/date-time.utility'
import { AuthService } from '../auth/auth.service'
import type { NotificationHandshakeAuth, NotificationResponse } from './notifications.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map(o => o.trim())
      .filter(o => {
        try {
          const url = new URL(o)
          return url.protocol === UrlProtocol.HTTP || url.protocol === UrlProtocol.HTTPS
        } catch {
          return false
        }
      }),
    credentials: true,
  },
  namespace: NotificationGatewayNamespace.NOTIFICATIONS,
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(NotificationsGateway.name)

  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const handshakeAuth = client.handshake.auth as NotificationHandshakeAuth
      const token =
        handshakeAuth[NotificationSocketAuthField.TOKEN] ??
        client.handshake.headers.authorization?.replace(NotificationAuthorizationPrefix.BEARER, '')

      if (!token) {
        client.disconnect()
        return
      }

      const payload = await this.authService.verifyAccessToken(token)
      const requestedTenantId = this.readRequestedTenantId(
        handshakeAuth[NotificationSocketAuthField.TENANT_ID]
      )
      const authorizedContext = await this.authService.resolveAuthorizedTenantContext(
        payload,
        requestedTenantId
      )
      const currentUser: JwtPayload = {
        ...payload,
        tenantId: authorizedContext.tenantId,
        tenantSlug: authorizedContext.tenantSlug,
        role: authorizedContext.role,
      }

      // Store user info on socket
      client.data[NotificationSocketDataKey.USER] = currentUser
      client.data[NotificationSocketDataKey.TENANT_ID] = currentUser.tenantId

      // Join user-specific room: tenant:userId
      const room = `${currentUser.tenantId}:${currentUser.sub}`
      void client.join(room)

      this.logger.log(`Client connected: ${currentUser.email} (room: ${room})`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data[NotificationSocketDataKey.USER] as JwtPayload | undefined
    if (user?.email) {
      this.logger.log(`Client disconnected: ${user.email}`)
    }
  }

  /**
   * Emit a notification event to a specific user in a tenant.
   */
  emitToUser(tenantId: string, recipientUserId: string, notification: NotificationResponse): void {
    const room = `${tenantId}:${recipientUserId}`
    this.server.to(room).emit(NotificationGatewayEvent.NOTIFICATION, notification)
  }

  /**
   * Emit updated unread count to a specific user.
   */
  emitUnreadCount(tenantId: string, recipientUserId: string, count: number): void {
    const room = `${tenantId}:${recipientUserId}`
    this.server.to(room).emit(NotificationGatewayEvent.UNREAD_COUNT, { count })
  }

  emitPermissionsUpdated(
    tenantId: string,
    recipientUserId: string,
    reason: PermissionUpdateReason
  ): void {
    const room = `${tenantId}:${recipientUserId}`
    this.server.to(room).emit(NotificationGatewayEvent.PERMISSIONS_UPDATED, {
      tenantId,
      reason,
      changedAt: toIso(),
    })
  }

  private readRequestedTenantId(value: string | undefined): string | undefined {
    if (typeof value !== 'string') {
      return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
  }
}
