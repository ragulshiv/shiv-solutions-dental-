import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { BRAND } from '@/config/brand'

// First-run clinic setup. Kept outside the (dashboard) group on purpose: the
// dashboard layout sends clinics that haven't finished onboarding here, so if
// this page lived inside that layout it would redirect to itself forever.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4 md:px-8">
        <p className="text-xl font-semibold tracking-tight text-primary">{BRAND.wordmark}</p>
      </header>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  )
}
