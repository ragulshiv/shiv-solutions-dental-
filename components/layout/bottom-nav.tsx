'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNavigationForRole } from '@/config/nav'
import { useSidebar } from './sidebar-context'

// The daily tabs, in order. Each only shows if the user's role can see it in
// config/nav.ts (e.g. a doctor has no Billing tab).
const TAB_HREFS = ['/dashboard', '/patients', '/appointments', '/billing']

/**
 * Phone-only bottom tab bar. "More" opens the full navigation drawer
 * (MobileSidebar). Hidden from md: up, where the sidebar takes over.
 */
export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const { setMobileOpen } = useSidebar()

  const allItems = getNavigationForRole(role).flatMap((section) => section.items)
  const tabs = TAB_HREFS.map((href) => allItems.find((item) => item.href === href)).filter(
    (item): item is (typeof allItems)[number] => Boolean(item)
  )

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
    >
      <div className="flex">
        {tabs.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />
              )}
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.title}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  )
}
