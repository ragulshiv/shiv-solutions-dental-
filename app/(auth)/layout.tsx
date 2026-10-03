import { BRAND } from '@/config/brand'
import { InstallAppButton } from '@/components/pwa/install-app-button'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="min-h-screen flex flex-col items-center justify-center py-8">
        <p className="mb-6 font-serif text-2xl font-bold tracking-tight text-primary">
          {BRAND.wordmark}
        </p>
        <div className="w-full max-w-md space-y-4 px-4">
          {children}
          <InstallAppButton variant="full" />
        </div>
      </div>
    </div>
  )
}
