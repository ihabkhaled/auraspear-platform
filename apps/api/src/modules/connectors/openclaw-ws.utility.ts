import { randomUUID } from 'node:crypto'
import { OpenClawFrameType } from '../../common/enums'
import { WebSocket } from '../../common/modules/websocket'
import type {
  OpenClawChatEventPayload,
  OpenClawWsEvent,
  OpenClawWsIncoming,
  OpenClawWsRequest,
  OpenClawWsResponse,
} from './connectors.types'

/* ---------------------------------------------------------------- */
/* PRIVATE HELPERS                                                    */
/* ---------------------------------------------------------------- */

function parseOpenClawMessage(raw: WebSocket.Data): OpenClawWsIncoming | undefined {
  try {
    const text = typeof raw === 'string' ? raw : raw.toString('utf8')
    return JSON.parse(text) as OpenClawWsIncoming
  } catch {
    return undefined
  }
}

/* ---------------------------------------------------------------- */
/* TYPE GUARDS                                                        */
/* ---------------------------------------------------------------- */

export function isOpenClawEvent(message: OpenClawWsIncoming): message is OpenClawWsEvent {
  return message.type === OpenClawFrameType.EVENT
}

export function isOpenClawResponse(message: OpenClawWsIncoming): message is OpenClawWsResponse {
  return message.type === OpenClawFrameType.RES
}

/* ---------------------------------------------------------------- */
/* CONNECTION                                                         */
/* ---------------------------------------------------------------- */

/**
 * Completes the OpenClaw auth handshake on an already-created WebSocket.
 * Resolves with the authenticated WebSocket instance or rejects on error/timeout.
 * The caller is responsible for creating the WebSocket instance (e.g. via WebSocketService).
 */
export function authenticateOpenClawConnection(
  socket: WebSocket,
  apiKey: string,
  timeoutMs: number
): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.close()
        reject(new Error(`Connection to OpenClaw Gateway timed out after ${String(timeoutMs)}ms`))
      }
    }, timeoutMs)

    const cleanup = (): void => {
      clearTimeout(timer)
    }

    const fail = (reason: string): void => {
      if (!settled) {
        settled = true
        cleanup()
        socket.close()
        reject(new Error(reason))
      }
    }

    socket.on('error', (error: Error) => {
      fail(`WebSocket error: ${error.message}`)
    })

    socket.on('close', () => {
      if (!settled) {
        fail('WebSocket closed before authentication completed')
      }
    })

    socket.on('message', (data: WebSocket.Data) => {
      if (settled) return

      const parsed = parseOpenClawMessage(data)
      if (!parsed) return

      // Step 1: Wait for connect.challenge event
      if (isOpenClawEvent(parsed) && parsed.event === 'connect.challenge') {
        const connectRequest: OpenClawWsRequest = {
          type: OpenClawFrameType.REQ,
          id: randomUUID(),
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'gateway-client',
              version: '1.0.0',
              platform: 'node',
              mode: 'backend',
            },
            auth: { token: apiKey },
            scopes: ['operator', 'operator.write', 'operator.read', 'admin'],
          },
        }
        socket.send(JSON.stringify(connectRequest))
        return
      }

      // Step 2: Wait for auth response
      if (isOpenClawResponse(parsed)) {
        if (parsed.ok) {
          settled = true
          cleanup()
          resolve(socket)
        } else {
          const errorDetail = parsed.error ?? 'unknown error'
          fail(`Authentication failed: ${errorDetail}`)
        }
      }
    })
  })
}

/* ---------------------------------------------------------------- */
/* REQUEST / RESPONSE                                                 */
/* ---------------------------------------------------------------- */

/**
 * Sends a request over an authenticated WebSocket and waits for the matching response.
 */
export function sendOpenClawRequest(
  socket: WebSocket,
  method: string,
  parameters: Record<string, unknown> | undefined,
  timeoutMs: number
): Promise<Record<string, unknown> | undefined> {
  return new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
    const requestId = randomUUID()
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.removeListener('message', onMessage)
        reject(new Error(`Request '${method}' timed out after ${String(timeoutMs)}ms`))
      }
    }, timeoutMs)

    const onMessage = (data: WebSocket.Data): void => {
      if (settled) return
      const parsed = parseOpenClawMessage(data)
      if (!parsed || !isOpenClawResponse(parsed)) return
      if (parsed.id !== requestId) return

      settled = true
      clearTimeout(timer)
      socket.removeListener('message', onMessage)

      if (parsed.ok) {
        resolve(parsed.payload)
      } else {
        const errorDetail = parsed.error ?? 'unknown error'
        reject(new Error(`Request '${method}' failed: ${errorDetail}`))
      }
    }

    socket.on('message', onMessage)

    const request: OpenClawWsRequest = { type: OpenClawFrameType.REQ, id: requestId, method }
    if (parameters) {
      request.params = parameters
    }
    socket.send(JSON.stringify(request))
  })
}

/* ---------------------------------------------------------------- */
/* CHAT STREAMING                                                     */
/* ---------------------------------------------------------------- */

/**
 * Sends a sessions.send request and collects streaming chat events until the final state.
 */
export function sendOpenClawChatAndCollect(
  socket: WebSocket,
  sessionKey: string,
  promptMessage: string,
  timeoutMs: number
): Promise<{ text: string; runId: string | undefined }> {
  return new Promise<{ text: string; runId: string | undefined }>((resolve, reject) => {
    const requestId = randomUUID()
    let settled = false
    let runId: string | undefined

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.removeListener('message', onMessage)
        reject(new Error(`Chat request timed out after ${String(timeoutMs)}ms`))
      }
    }, timeoutMs)

    const onMessage = (data: WebSocket.Data): void => {
      if (settled) return
      const parsed = parseOpenClawMessage(data)
      if (!parsed) return

      // Handle request-level error response
      if (isOpenClawResponse(parsed) && parsed.id === requestId && !parsed.ok) {
        settled = true
        clearTimeout(timer)
        socket.removeListener('message', onMessage)
        const errorDetail = parsed.error ?? 'unknown error'
        reject(new Error(`sessions.send failed: ${errorDetail}`))
        return
      }

      // Handle chat events
      if (isOpenClawEvent(parsed) && parsed.event === 'chat') {
        const chatPayload = parsed.payload as unknown as OpenClawChatEventPayload
        if (chatPayload.runId) {
          ;({ runId } = chatPayload)
        }

        if (chatPayload.state === 'final' && chatPayload.message) {
          settled = true
          clearTimeout(timer)
          socket.removeListener('message', onMessage)

          const contentBlock = chatPayload.message.content.at(0)
          const responseText = contentBlock?.text ?? ''
          resolve({ text: responseText, runId })
        }
      }
    }

    socket.on('message', onMessage)

    const request: OpenClawWsRequest = {
      type: OpenClawFrameType.REQ,
      id: requestId,
      method: 'sessions.send',
      params: { key: sessionKey, message: promptMessage },
    }
    socket.send(JSON.stringify(request))
  })
}

/* ---------------------------------------------------------------- */
/* CLEANUP                                                            */
/* ---------------------------------------------------------------- */

/**
 * Safely closes a WebSocket if it is not already closed or closing.
 */
export function safeCloseWebSocket(socket: WebSocket | undefined): void {
  if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
    socket.close()
  }
}
