/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from '@serwist/turbopack/worker'
import { NetworkOnly, Serwist } from 'serwist'
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Force all /api/* requests to bypass cache entirely (NetworkOnly).
// This prevents authenticated API responses (alerts, cases, incidents, etc.)
// from being served from cache after logout.
const apiNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith('/api/'),
  handler: new NetworkOnly(),
}

// Place the API network-only rule first so it takes priority over
// defaultCache entries that would otherwise cache /api/* GET responses.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiNetworkOnly, ...defaultCache],
})

serwist.addEventListeners()
