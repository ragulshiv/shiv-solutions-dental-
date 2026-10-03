'use client'

import { createContext, useContext } from 'react'

export interface CurrentUser {
  name: string
  email: string
  role: string
}

const CurrentUserContext = createContext<CurrentUser>({ name: '', email: '', role: '' })

/** Provided by DashboardShell so any screen can show role-appropriate actions. */
export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser
  children: React.ReactNode
}) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
}

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

/** Role helpers that mirror the server rules (middleware + API guards). */
export const can = {
  treat: (role: string) => ['ADMIN', 'DOCTOR'].includes(role),
  bill: (role: string) => ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'DOCTOR'].includes(role),
  book: (role: string) => role !== 'LAB_TECH',
}
