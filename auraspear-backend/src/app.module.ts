import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { AppController } from './app.controller'
import { AuthGuard } from './common/guards/auth.guard'
import { CsrfGuard } from './common/guards/csrf.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { TenantGuard } from './common/guards/tenant.guard'
import { AuditInterceptor } from './common/interceptors/audit.interceptor'
import { WebSocketModule } from './common/modules/websocket'
import { AppLoggerService } from './common/services/app-logger.service'
import { StartupHealthService } from './common/services/startup-health.service'
import { validateEnvironment } from './config/env.validation'
import { AgentConfigModule } from './modules/agent-config/agent-config.module'
import { AiModule } from './modules/ai/ai.module'
import { MemoryModule } from './modules/ai/memory/memory.module'
import { AiAgentsModule } from './modules/ai-agents/ai-agents.module'
import { AlertsModule } from './modules/alerts/alerts.module'
import { AppLogsModule } from './modules/app-logs/app-logs.module'
import { AttackPathsModule } from './modules/attack-paths/attack-paths.module'
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module'
import { AuthModule } from './modules/auth/auth.module'
import { CaseCyclesModule } from './modules/case-cycles/case-cycles.module'
import { CasesModule } from './modules/cases/cases.module'
import { CloudSecurityModule } from './modules/cloud-security/cloud-security.module'
import { ComplianceModule } from './modules/compliance/compliance.module'
import { ConnectorSyncModule } from './modules/connector-sync/connector-sync.module'
import { ConnectorWorkspacesModule } from './modules/connector-workspaces/connector-workspaces.module'
import { ConnectorsModule } from './modules/connectors/connectors.module'
import { LlmConnectorsModule } from './modules/connectors/llm-connectors/llm-connectors.module'
import { CorrelationModule } from './modules/correlation/correlation.module'
import { DashboardsModule } from './modules/dashboards/dashboards.module'
import { DataExplorerModule } from './modules/data-explorer/data-explorer.module'
import { DetectionRulesModule } from './modules/detection-rules/detection-rules.module'
import { EntitiesModule } from './modules/entities/entities.module'
import { HealthModule } from './modules/health/health.module'
import { HuntsModule } from './modules/hunts/hunts.module'
import { IncidentsModule } from './modules/incidents/incidents.module'
import { IntelModule } from './modules/intel/intel.module'
import { JobsModule } from './modules/jobs/jobs.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { NormalizationModule } from './modules/normalization/normalization.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { OsintExecutorModule } from './modules/osint-executor/osint-executor.module'
import { ReportsModule } from './modules/reports/reports.module'
import { RoleSettingsModule } from './modules/role-settings/role-settings.module'
import { SoarModule } from './modules/soar/soar.module'
import { SystemHealthModule } from './modules/system-health/system-health.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { UebaModule } from './modules/ueba/ueba.module'
import { UsersModule } from './modules/users/users.module'
import { UsersControlModule } from './modules/users-control/users-control.module'
import { VulnerabilitiesModule } from './modules/vulnerabilities/vulnerabilities.module'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis'

@Module({
  controllers: [AppController],
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('RATE_LIMIT_THROTTLE_TTL', 60_000),
          limit: config.get<number>('RATE_LIMIT_THROTTLE_LIMIT', 250),
        },
      ],
    }),

    // Structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
        level: process.env.LOG_LEVEL ?? 'info',
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.confirmPassword',
        ],
      },
    }),

    // WebSocket
    WebSocketModule,

    // Database
    PrismaModule,

    // Redis (shared singleton — imported globally)
    RedisModule,

    // Feature modules
    AgentConfigModule,
    AuthModule,
    TenantsModule,
    ConnectorsModule,
    LlmConnectorsModule,
    ConnectorWorkspacesModule,
    ConnectorSyncModule,
    DataExplorerModule,
    AlertsModule,
    AppLogsModule,
    AuditLogsModule,
    DashboardsModule,
    HuntsModule,
    CaseCyclesModule,
    CasesModule,
    IncidentsModule,
    JobsModule,
    KnowledgeModule,
    CorrelationModule,
    IntelModule,
    NotificationsModule,
    AiAgentsModule,
    AiModule,
    MemoryModule,
    HealthModule,
    UsersModule,
    UsersControlModule,
    AttackPathsModule,
    UebaModule,
    VulnerabilitiesModule,
    SoarModule,
    ComplianceModule,
    ReportsModule,
    SystemHealthModule,
    NormalizationModule,
    OsintExecutorModule,
    DetectionRulesModule,
    EntitiesModule,
    CloudSecurityModule,
    RoleSettingsModule,
  ],
  providers: [
    // Global guards (order matters: throttle → auth → csrf → tenant → roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },

    // Startup health checker
    AppLoggerService,
    StartupHealthService,
  ],
})
export class AppModule {}
