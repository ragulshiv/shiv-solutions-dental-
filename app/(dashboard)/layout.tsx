import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const hospitalId = session.user.hospitalId

  // Fetch hospital info
  const hospital = hospitalId
    ? await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
          name: true,
          plan: true,
          logo: true,
          onboardingCompleted: true,
        },
      })
    : null

  // Clinics that haven't finished setup go to /onboarding, which lives in its own
  // route group (app/(onboarding)) so this redirect can't loop.
  if (hospital && !hospital.onboardingCompleted) {
    redirect('/onboarding')
  }

  const user = {
    name: session.user.name || 'User',
    email: session.user.email || '',
    role: session.user.role || 'RECEPTIONIST',
  }

  const hospitalInfo = hospital
    ? {
        name: hospital.name,
        plan: hospital.plan,
        logo: hospital.logo,
      }
    : undefined

  return (
    <DashboardShell
      user={user}
      hospital={hospitalInfo}
      aiEnabled={Boolean(process.env.OPENROUTER_API_KEY?.trim())}
    >
      {children}
    </DashboardShell>
  )
}
