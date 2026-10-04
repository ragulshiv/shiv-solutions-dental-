'use client'

import { createContext, useContext } from 'react'

/**
 * Whether AI features are available (an OPENROUTER_API_KEY is set on the server).
 * When false, every AI button, panel and menu item is hidden instead of erroring.
 * The value comes from app/(dashboard)/layout.tsx via DashboardShell.
 */
const AiEnabledContext = createContext(false)

export function AiEnabledProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  return <AiEnabledContext.Provider value={enabled}>{children}</AiEnabledContext.Provider>
}

export function useAiEnabled() {
  return useContext(AiEnabledContext)
}

/** Renders its children only when AI is configured. */
export function AiOnly({ children }: { children: React.ReactNode }) {
  return useAiEnabled() ? <>{children}</> : null
}

/** Paths that are AI-only screens; hidden from the menu when AI is off. */
export const AI_ONLY_PATHS = ['/chat', '/settings/ai', '/settings/pricing']
