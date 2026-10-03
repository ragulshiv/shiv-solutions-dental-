'use client'

import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'
import { Header } from './header'
import { BottomNav } from './bottom-nav'
import { SidebarProvider } from './sidebar-context'
import { AIProvider } from '@/components/ai/ai-provider'
import { CommandBar } from '@/components/ai/command-bar'
import { ChatWidget } from '@/components/ai/chat-widget'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { KeyboardShortcutHelp } from '@/components/layout/keyboard-shortcut-help'
import { AiEnabledProvider } from '@/components/ai/ai-enabled'
import { CurrentUserProvider } from './current-user'

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    name: string
    email: string
    role: string
  }
  hospital?: {
    name: string
    plan: string
    logo?: string | null
  }
  /** False when no AI key is configured: AI buttons and menus are hidden. */
  aiEnabled?: boolean
}

export function DashboardShell({
  children,
  user,
  hospital,
  aiEnabled = false,
}: DashboardShellProps) {
  return (
    <CurrentUserProvider user={user}>
      <AiEnabledProvider enabled={aiEnabled}>
        <AIProvider>
          <SidebarProvider>
            <div className="flex h-screen overflow-hidden">
              {/* Sidebar - hidden on mobile */}
              <aside className="hidden md:flex">
                <Sidebar
                  role={user.role}
                  hospitalName={hospital?.name}
                  hospitalLogo={hospital?.logo}
                  plan={hospital?.plan}
                />
              </aside>

              {/* Mobile sidebar overlay */}
              <MobileSidebar
                role={user.role}
                hospitalName={hospital?.name}
                hospitalLogo={hospital?.logo}
                plan={hospital?.plan}
              />

              {/* Main content */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header user={user} />
                <main className="flex-1 overflow-auto bg-background p-4 pb-24 md:p-8">
                  <Breadcrumb className="mb-4 hidden md:flex" />
                  {children}
                </main>
              </div>
            </div>
            <BottomNav role={user.role} />
          </SidebarProvider>
          {aiEnabled && <CommandBar />}
          {aiEnabled && <ChatWidget />}
          <KeyboardShortcutHelp />
        </AIProvider>
      </AiEnabledProvider>
    </CurrentUserProvider>
  )
}
