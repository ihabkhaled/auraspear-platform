import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'

function buildAllowedConnectSources(): string[] {
  const sources = new Set<string>(["'self'"])
  const candidates = [
    process.env['NEXT_PUBLIC_API_URL'],
    process.env['BACKEND_API_URL'],
    process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:4000',
  ]

  for (const candidate of candidates) {
    if (!candidate || candidate.startsWith('/')) {
      continue
    }

    try {
      const url = new URL(candidate)
      sources.add(url.origin)

      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        sources.add(`${wsProtocol}//${url.host}`)
      }

      if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        const httpProtocol = url.protocol === 'wss:' ? 'https:' : 'http:'
        sources.add(`${httpProtocol}//${url.host}`)
      }
    } catch {
      // Ignore invalid non-URL env values and preserve the strict default set.
    }
  }

  return [...sources]
}

/**
 * Content-Security-Policy directives.
 *
 * Why 'unsafe-inline' for script-src:
 *   Next.js injects inline <script> tags for hydration data, chunk loading,
 *   and the __NEXT_DATA__ payload. next-themes also injects an inline script
 *   to prevent FOUC. Without 'unsafe-inline', these break in production.
 *   A nonce-based CSP (via middleware) is the ideal upgrade path but requires
 *   per-request nonce generation — tracked as a future enhancement.
 *
 * Why 'unsafe-inline' for style-src:
 *   Tailwind CSS and shadcn/ui apply inline styles for dynamic values
 *   (e.g., CSS custom properties on elements, style attributes from Radix UI).
 */
const isDev = process.env.NODE_ENV === 'development'

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src ${buildAllowedConnectSources().join(' ')} https://fonts.googleapis.com https://fonts.gstatic.com`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
]

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
]

const nextConfig: NextConfig = withSerwist({
  output: 'standalone',
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
})

export default nextConfig
