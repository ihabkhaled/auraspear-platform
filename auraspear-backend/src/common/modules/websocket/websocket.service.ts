import { Injectable } from '@nestjs/common'
import WebSocket from 'ws'

@Injectable()
export class WebSocketService {
  createConnection(url: string): WebSocket {
    return new WebSocket(url)
  }
}

export { WebSocket }
