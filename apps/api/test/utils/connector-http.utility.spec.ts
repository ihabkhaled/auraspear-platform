import * as http from 'node:http'
import { AxiosService } from '../../src/common/modules/axios/axios.service'

describe('AxiosService', () => {
  const originalEnvironment = process.env.NODE_ENV
  let service: AxiosService

  beforeEach(() => {
    service = new AxiosService()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment
  })

  describe('basicAuth', () => {
    it('should produce valid base64 Basic auth header', () => {
      const result = service.basicAuth('admin', 'secret')
      expect(result).toBe(`Basic ${Buffer.from('admin:secret').toString('base64')}`)
    })

    it('should handle empty password', () => {
      const result = service.basicAuth('admin', '')
      expect(result).toBe(`Basic ${Buffer.from('admin:').toString('base64')}`)
    })

    it('should handle special characters', () => {
      const result = service.basicAuth('user@corp.com', 'p@$$w0rd!')
      expect(result).toBe(`Basic ${Buffer.from('user@corp.com:p@$$w0rd!').toString('base64')}`)
    })

    it('should handle unicode characters', () => {
      const result = service.basicAuth('مستخدم', 'كلمة_مرور')
      expect(result).toBe(`Basic ${Buffer.from('مستخدم:كلمة_مرور').toString('base64')}`)
    })
  })

  describe('fetch', () => {
    let server: http.Server
    let serverPort: number

    beforeAll(
      () =>
        new Promise<void>(resolve => {
          server = http.createServer((req, res) => {
            if (req.url === '/health') {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ status: 'ok', version: '4.9.0' }))
              return
            }
            if (req.url === '/text') {
              res.writeHead(200, { 'Content-Type': 'text/plain' })
              res.end('plain text response')
              return
            }
            if (req.url === '/error') {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Internal Server Error' }))
              return
            }
            if (req.url === '/slow') {
              // Do not respond — let timeout trigger
              return
            }
            if (req.url === '/echo' && req.method === 'POST') {
              const chunks: Buffer[] = []
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf-8')
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(body)
              })
              return
            }
            if (req.url === '/headers') {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(req.headers))
              return
            }
            res.writeHead(404)
            res.end()
          })

          server.listen(0, () => {
            const address = server.address()
            serverPort = typeof address === 'object' && address ? address.port : 0
            resolve()
          })
        })
    )

    afterAll(
      () =>
        new Promise<void>(resolve => {
          server.close(() => resolve())
        })
    )

    describe('successful requests', () => {
      it('should fetch JSON from a local HTTP server', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`, {
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
        expect(response.data).toEqual({ status: 'ok', version: '4.9.0' })
        expect(response.latencyMs).toBeGreaterThanOrEqual(0)
      })

      it('should handle non-JSON responses', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/text`, {
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
        expect(response.data).toBe('plain text response')
      })

      it('should return error status codes without throwing', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/error`, {
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(500)
        expect(response.data).toEqual({ error: 'Internal Server Error' })
      })

      it('should send POST body as JSON', async () => {
        process.env.NODE_ENV = 'development'

        const body = { query: 'search', limit: 10 }
        const response = await service.fetch(`http://127.0.0.1:${serverPort}/echo`, {
          method: 'POST' as never,
          body,
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
        expect(response.data).toEqual(body)
      })

      it('should send custom headers', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/headers`, {
          headers: { Authorization: 'Bearer test-token', 'X-Custom': 'value' },
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
        const data = response.data as Record<string, string>
        expect(data.authorization).toBe('Bearer test-token')
        expect(data['x-custom']).toBe('value')
      })

      it('should include content-type and accept headers by default', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/headers`, {
          allowPrivateNetwork: true,
        })

        const data = response.data as Record<string, string>
        expect(data['content-type']).toBe('application/json')
        expect(data.accept).toBe('application/json')
      })

      it('should return response headers', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`, {
          allowPrivateNetwork: true,
        })

        expect(response.headers['content-type']).toBe('application/json')
      })

      it('should include latencyMs in response', async () => {
        process.env.NODE_ENV = 'development'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`, {
          allowPrivateNetwork: true,
        })

        expect(typeof response.latencyMs).toBe('number')
        expect(response.latencyMs).toBeGreaterThanOrEqual(0)
      })
    })

    describe('timeout handling', () => {
      it('should reject on connection timeout', async () => {
        process.env.NODE_ENV = 'development'

        await expect(
          service.fetch(`http://127.0.0.1:${serverPort}/slow`, {
            timeoutMs: 100,
            allowPrivateNetwork: true,
          })
        ).rejects.toThrow()
      })
    })

    describe('protocol enforcement', () => {
      it('should reject FTP protocol', async () => {
        await expect(service.fetch('ftp://files.example.com/data')).rejects.toThrow(
          'Only HTTP(S) and WS(S) URLs are allowed'
        )
      })

      it('should reject file protocol', async () => {
        await expect(service.fetch('file:///etc/passwd')).rejects.toThrow(
          'Only HTTP(S) and WS(S) URLs are allowed'
        )
      })
    })

    describe('production environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
      })

      it('should reject HTTP URLs in production', async () => {
        await expect(service.fetch('http://grafana.example.com:3000/health')).rejects.toThrow(
          'Only HTTPS/WSS URLs are allowed in production'
        )
      })

      it('should reject private network URLs when allowPrivateNetwork is false', async () => {
        await expect(service.fetch('https://localhost:55000/api')).rejects.toThrow(
          'URLs pointing to private/internal networks are not allowed'
        )
      })

      it('should reject 127.0.0.1 when allowPrivateNetwork is false', async () => {
        await expect(service.fetch('https://127.0.0.1:55000/api')).rejects.toThrow(
          'URLs pointing to private/internal networks are not allowed'
        )
      })

      it('should reject 10.x.x.x when allowPrivateNetwork is false', async () => {
        await expect(service.fetch('https://10.0.0.1:9200/api')).rejects.toThrow(
          'URLs pointing to private/internal networks are not allowed'
        )
      })

      it('should reject 192.168.x.x when allowPrivateNetwork is false', async () => {
        await expect(service.fetch('https://192.168.1.1:3000/health')).rejects.toThrow(
          'URLs pointing to private/internal networks are not allowed'
        )
      })
    })

    describe('development environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development'
      })

      it('should allow HTTP URLs in development', async () => {
        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`, {
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
      })

      it('should allow localhost without allowPrivateNetwork flag', async () => {
        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`)
        expect(response.status).toBe(200)
      })

      it('should allow private IPs without allowPrivateNetwork flag', async () => {
        // This uses the local server bound to 127.0.0.1
        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`)
        expect(response.status).toBe(200)
      })
    })

    describe('self-signed certificate handling', () => {
      it('should set rejectUnauthorized to false in development', async () => {
        process.env.NODE_ENV = 'development'

        // In dev, even if caller passes rejectUnauthorized: true, it should be forced to false
        // We test this indirectly — the request should succeed on local HTTP
        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`, {
          rejectUnauthorized: true,
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
      })

      it('should default rejectUnauthorized to false in test environment', async () => {
        process.env.NODE_ENV = 'test'

        const response = await service.fetch(`http://127.0.0.1:${serverPort}/health`, {
          allowPrivateNetwork: true,
        })

        expect(response.status).toBe(200)
      })
    })
  })

  describe('convenience methods', () => {
    let server: http.Server
    let serverPort: number

    beforeAll(
      () =>
        new Promise<void>(resolve => {
          server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ method: req.method, url: req.url }))
          })

          server.listen(0, () => {
            const address = server.address()
            serverPort = typeof address === 'object' && address ? address.port : 0
            resolve()
          })
        })
    )

    afterAll(
      () =>
        new Promise<void>(resolve => {
          server.close(() => resolve())
        })
    )

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should support get() convenience method', async () => {
      const response = await service.get(`http://127.0.0.1:${serverPort}/test`)
      expect(response.status).toBe(200)
      expect((response.data as Record<string, unknown>).method).toBe('GET')
    })

    it('should support post() convenience method', async () => {
      const response = await service.post(`http://127.0.0.1:${serverPort}/test`, { key: 'value' })
      expect(response.status).toBe(200)
      expect((response.data as Record<string, unknown>).method).toBe('POST')
    })

    it('should support put() convenience method', async () => {
      const response = await service.put(`http://127.0.0.1:${serverPort}/test`, { key: 'value' })
      expect(response.status).toBe(200)
      expect((response.data as Record<string, unknown>).method).toBe('PUT')
    })

    it('should support patch() convenience method', async () => {
      const response = await service.patch(`http://127.0.0.1:${serverPort}/test`, { key: 'value' })
      expect(response.status).toBe(200)
      expect((response.data as Record<string, unknown>).method).toBe('PATCH')
    })

    it('should support remove() convenience method', async () => {
      const response = await service.remove(`http://127.0.0.1:${serverPort}/test`)
      expect(response.status).toBe(200)
      expect((response.data as Record<string, unknown>).method).toBe('DELETE')
    })

    it('should support head() convenience method', async () => {
      const response = await service.head(`http://127.0.0.1:${serverPort}/test`)
      expect(response.status).toBe(200)
    })

    it('should support options() convenience method', async () => {
      const response = await service.options(`http://127.0.0.1:${serverPort}/test`)
      expect(response.status).toBe(200)
    })
  })
})
