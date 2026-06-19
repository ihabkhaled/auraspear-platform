import { Global, Module } from '@nestjs/common'
import { WebSocketService } from './websocket.service'

@Global()
@Module({
  providers: [WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
