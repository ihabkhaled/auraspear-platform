import { EventEmitter } from 'node:events'
import { OpenClawFrameType } from '../../../common/enums'
import {
  authenticateOpenClawConnection,
  sendOpenClawRequest,
  sendOpenClawChatAndCollect,
  safeCloseWebSocket,
  isOpenClawEvent,
  isOpenClawResponse,
} from '../openclaw-ws.utility'
import type { WebSocket } from '../../../common/modules/websocket'

/* ---------------------------------------------------------------- */
/* Mock WebSocket                                                     */
/* ---------------------------------------------------------------- */

class MockWebSocket extends EventEmitter {
  static OPEN = 1 as const
  static CLOSED = 3 as const
  static CLOSING = 2 as const

  readyState: number = MockWebSocket.OPEN

  send = jest.fn()
  close = jest.fn()
}

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */

function buildChallengeEvent(): string {
  return JSON.stringify({
    type: OpenClawFrameType.EVENT,
    event: 'connect.challenge',
    payload: {},
  })
}

function buildAuthResponse(ok: boolean, error?: string): string {
  return JSON.stringify({
    type: OpenClawFrameType.RES,
    id: 'some-id',
    ok,
    error,
  })
}

function buildResponse(
  id: string,
  ok: boolean,
  payload?: Record<string, unknown>,
  error?: string
): string {
  return JSON.stringify({
    type: OpenClawFrameType.RES,
    id,
    ok,
    payload,
    error,
  })
}

function buildChatEvent(state: string, text?: string, runId?: string): string {
  const payload: Record<string, unknown> = { state }
  if (runId) {
    payload.runId = runId
  }
  if (text !== undefined) {
    payload.message = {
      role: 'assistant',
      content: [{ type: 'text', text }],
    }
  }
  return JSON.stringify({
    type: OpenClawFrameType.EVENT,
    event: 'chat',
    payload,
  })
}

/* ---------------------------------------------------------------- */
/* Type guards                                                        */
/* ---------------------------------------------------------------- */

describe('isOpenClawEvent', () => {
  it('returns true for event type', () => {
    const result = isOpenClawEvent({
      type: OpenClawFrameType.EVENT,
      event: 'connect.challenge',
      payload: {},
    })
    expect(result).toBe(true)
  })

  it('returns false for response type', () => {
    const result = isOpenClawEvent({
      type: OpenClawFrameType.RES,
      id: '1',
      ok: true,
    })
    expect(result).toBe(false)
  })
})

describe('isOpenClawResponse', () => {
  it('returns true for response type', () => {
    const result = isOpenClawResponse({
      type: OpenClawFrameType.RES,
      id: '1',
      ok: true,
    })
    expect(result).toBe(true)
  })

  it('returns false for event type', () => {
    const result = isOpenClawResponse({
      type: OpenClawFrameType.EVENT,
      event: 'chat',
      payload: {},
    })
    expect(result).toBe(false)
  })
})

/* ---------------------------------------------------------------- */
/* authenticateOpenClawConnection                                     */
/* ---------------------------------------------------------------- */

describe('authenticateOpenClawConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('completes auth handshake successfully', async () => {
    const mockSocket = new MockWebSocket()

    const promise = authenticateOpenClawConnection(
      mockSocket as unknown as WebSocket,
      'test-key',
      10000
    )

    // Wait for listeners to be registered
    await Promise.resolve()

    // Simulate challenge event
    mockSocket.emit('message', buildChallengeEvent())

    // Verify connect request was sent
    expect(mockSocket.send).toHaveBeenCalledWith(expect.stringContaining('"method":"connect"'))

    // Simulate auth success response
    mockSocket.emit('message', buildAuthResponse(true))

    const result = await promise
    expect(result).toBeDefined()
  })

  it('rejects on auth failure', async () => {
    const mockSocket = new MockWebSocket()

    const promise = authenticateOpenClawConnection(
      mockSocket as unknown as WebSocket,
      'bad-key',
      10000
    )

    await Promise.resolve()

    mockSocket.emit('message', buildChallengeEvent())
    mockSocket.emit('message', buildAuthResponse(false, 'invalid token'))

    await expect(promise).rejects.toThrow('Authentication failed: invalid token')
  })

  it('rejects on timeout', async () => {
    const mockSocket = new MockWebSocket()

    const promise = authenticateOpenClawConnection(
      mockSocket as unknown as WebSocket,
      'test-key',
      1000
    )

    jest.advanceTimersByTime(1001)

    await expect(promise).rejects.toThrow('timed out after 1000ms')
  })

  it('rejects on WebSocket error', async () => {
    const mockSocket = new MockWebSocket()

    const promise = authenticateOpenClawConnection(
      mockSocket as unknown as WebSocket,
      'test-key',
      10000
    )

    await Promise.resolve()

    mockSocket.emit('error', new Error('ECONNREFUSED'))

    await expect(promise).rejects.toThrow('WebSocket error: ECONNREFUSED')
  })

  it('rejects when WebSocket closes before auth completes', async () => {
    const mockSocket = new MockWebSocket()

    const promise = authenticateOpenClawConnection(
      mockSocket as unknown as WebSocket,
      'test-key',
      10000
    )

    await Promise.resolve()

    mockSocket.emit('close')

    await expect(promise).rejects.toThrow('WebSocket closed before authentication completed')
  })
})

/* ---------------------------------------------------------------- */
/* sendOpenClawRequest                                                */
/* ---------------------------------------------------------------- */

describe('sendOpenClawRequest', () => {
  let mockSocket: MockWebSocket

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSocket = new MockWebSocket()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sends a request and resolves with payload on success', async () => {
    const promise = sendOpenClawRequest(
      mockSocket as unknown as WebSocket,
      'sessions.list',
      { filter: 'active' },
      10000
    )

    await Promise.resolve()

    // Extract the request ID from what was sent
    const sentData = mockSocket.send.mock.calls[0]?.[0] as string
    const sentRequest = JSON.parse(sentData) as { id: string }

    // Simulate successful response
    mockSocket.emit('message', buildResponse(sentRequest.id, true, { sessions: [] }))

    const result = await promise
    expect(result).toEqual({ sessions: [] })
  })

  it('rejects on error response', async () => {
    const promise = sendOpenClawRequest(
      mockSocket as unknown as WebSocket,
      'sessions.create',
      undefined,
      10000
    )

    await Promise.resolve()

    const sentData = mockSocket.send.mock.calls[0]?.[0] as string
    const sentRequest = JSON.parse(sentData) as { id: string }

    mockSocket.emit(
      'message',
      buildResponse(sentRequest.id, false, undefined, 'session limit exceeded')
    )

    await expect(promise).rejects.toThrow(
      "Request 'sessions.create' failed: session limit exceeded"
    )
  })

  it('rejects on timeout', async () => {
    const promise = sendOpenClawRequest(
      mockSocket as unknown as WebSocket,
      'sessions.list',
      undefined,
      2000
    )

    jest.advanceTimersByTime(2001)

    await expect(promise).rejects.toThrow("Request 'sessions.list' timed out after 2000ms")
  })

  it('ignores messages with non-matching request IDs', async () => {
    const promise = sendOpenClawRequest(
      mockSocket as unknown as WebSocket,
      'test.method',
      undefined,
      10000
    )

    await Promise.resolve()

    // Send a response with a different ID
    mockSocket.emit('message', buildResponse('wrong-id', true, { data: 'wrong' }))

    // The promise should not have resolved yet
    const sentData = mockSocket.send.mock.calls[0]?.[0] as string
    const sentRequest = JSON.parse(sentData) as { id: string }

    // Now send the correct response
    mockSocket.emit('message', buildResponse(sentRequest.id, true, { data: 'correct' }))

    const result = await promise
    expect(result).toEqual({ data: 'correct' })
  })

  it('sends request without params when params is undefined', async () => {
    const promise = sendOpenClawRequest(
      mockSocket as unknown as WebSocket,
      'sessions.list',
      undefined,
      10000
    )

    await Promise.resolve()

    const sentData = mockSocket.send.mock.calls[0]?.[0] as string
    const parsed = JSON.parse(sentData) as Record<string, unknown>

    expect(parsed.params).toBeUndefined()
    expect(parsed.method).toBe('sessions.list')

    // Resolve the promise to avoid hanging
    const sentRequest = parsed as { id: string }
    mockSocket.emit('message', buildResponse(sentRequest.id, true))

    await promise
  })
})

/* ---------------------------------------------------------------- */
/* sendOpenClawChatAndCollect                                         */
/* ---------------------------------------------------------------- */

describe('sendOpenClawChatAndCollect', () => {
  let mockSocket: MockWebSocket

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSocket = new MockWebSocket()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('receives final chat event with text', async () => {
    const promise = sendOpenClawChatAndCollect(
      mockSocket as unknown as WebSocket,
      'session-key-1',
      'Hello AI',
      10000
    )

    await Promise.resolve()

    // Simulate streaming events
    mockSocket.emit('message', buildChatEvent('thinking', undefined, 'run-1'))
    mockSocket.emit('message', buildChatEvent('final', 'Hello! How can I help?', 'run-1'))

    const result = await promise

    expect(result.text).toBe('Hello! How can I help?')
    expect(result.runId).toBe('run-1')
  })

  it('rejects on request error response', async () => {
    const promise = sendOpenClawChatAndCollect(
      mockSocket as unknown as WebSocket,
      'session-key-1',
      'Hello',
      10000
    )

    await Promise.resolve()

    const sentData = mockSocket.send.mock.calls[0]?.[0] as string
    const sentRequest = JSON.parse(sentData) as { id: string }

    mockSocket.emit('message', buildResponse(sentRequest.id, false, undefined, 'session not found'))

    await expect(promise).rejects.toThrow('sessions.send failed: session not found')
  })

  it('rejects on timeout', async () => {
    const promise = sendOpenClawChatAndCollect(
      mockSocket as unknown as WebSocket,
      'session-key-1',
      'Hello',
      3000
    )

    jest.advanceTimersByTime(3001)

    await expect(promise).rejects.toThrow('Chat request timed out after 3000ms')
  })

  it('resolves with empty text when final message has no content', async () => {
    const promise = sendOpenClawChatAndCollect(
      mockSocket as unknown as WebSocket,
      'session-key-1',
      'Hello',
      10000
    )

    await Promise.resolve()

    // Send a final event with message but empty content array
    const event = JSON.stringify({
      type: OpenClawFrameType.EVENT,
      event: 'chat',
      payload: {
        state: 'final',
        message: { role: 'assistant', content: [] },
      },
    })
    mockSocket.emit('message', event)

    const result = await promise
    expect(result.text).toBe('')
  })

  it('sends sessions.send request with correct params', async () => {
    const promise = sendOpenClawChatAndCollect(
      mockSocket as unknown as WebSocket,
      'session-abc',
      'Analyze this threat',
      10000
    )

    await Promise.resolve()

    const sentData = mockSocket.send.mock.calls[0]?.[0] as string
    const parsed = JSON.parse(sentData) as Record<string, unknown>

    expect(parsed.method).toBe('sessions.send')
    expect(parsed.params).toEqual({ key: 'session-abc', message: 'Analyze this threat' })

    // Resolve the promise
    mockSocket.emit('message', buildChatEvent('final', 'Done', undefined))

    await promise
  })
})

/* ---------------------------------------------------------------- */
/* safeCloseWebSocket                                                 */
/* ---------------------------------------------------------------- */

describe('safeCloseWebSocket', () => {
  it('closes an open socket', () => {
    const mockSocket = new MockWebSocket()
    mockSocket.readyState = MockWebSocket.OPEN

    safeCloseWebSocket(mockSocket as unknown as WebSocket)

    expect(mockSocket.close).toHaveBeenCalled()
  })

  it('handles undefined socket', () => {
    expect(() => safeCloseWebSocket(undefined)).not.toThrow()
  })

  it('does not close an already-closed socket', () => {
    const mockSocket = new MockWebSocket()
    mockSocket.readyState = MockWebSocket.CLOSED

    safeCloseWebSocket(mockSocket as unknown as WebSocket)

    expect(mockSocket.close).not.toHaveBeenCalled()
  })

  it('does not close a closing socket', () => {
    const mockSocket = new MockWebSocket()
    mockSocket.readyState = MockWebSocket.CLOSING

    safeCloseWebSocket(mockSocket as unknown as WebSocket)

    expect(mockSocket.close).not.toHaveBeenCalled()
  })
})
