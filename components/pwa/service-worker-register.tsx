'use client'

import { useEffect } from 'react'

/**
 * Registers public/sw.js so the app can be installed and opens fast after the
 * first visit. Production only: in development the worker would serve cached
 * build files over hot-reloaded ones.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal: the app works the same without it, just without caching.
    })
  }, [])

  return null
}
