import { forwardRef, Module } from '@nestjs/common'
import { AiAttackPathController } from './ai-attack-path.controller'
import { AiAttackPathService } from './ai-attack-path.service'
import { AttackPathsController } from './attack-paths.controller'
import { AttackPathsRepository } from './attack-paths.repository'
import { AttackPathsService } from './attack-paths.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [AttackPathsController, AiAttackPathController],
  providers: [AttackPathsRepository, AttackPathsService, AiAttackPathService],
  exports: [AttackPathsService],
})
export class AttackPathsModule {}
