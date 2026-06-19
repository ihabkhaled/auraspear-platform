import { Controller, Get } from '@nestjs/common'
import { Public } from './common/decorators/public.decorator'

@Controller()
export class AppController {
  @Public()
  @Get()
  root(): { status: string; message: string } {
    return { status: 'ok', message: 'AuraSpear SOC BFF is up and running' }
  }
}
