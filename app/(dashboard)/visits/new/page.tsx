'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * /visits/new?patientId=… or ?appointmentId=…
 * Checks the patient in (or books a walk-in for right now) and opens the visit screen.
 */
export default function StartVisitPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    fetch('/api/visits/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: searchParams.get('patientId') || undefined,
        appointmentId: searchParams.get('appointmentId') || undefined,
      }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Could not start the visit')
        router.replace(`/visits/${json.id}`)
      })
      .catch((e) => setError(e.message))
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-destructive">{error}</p>
        <Link href="/appointments/queue">
          <Button variant="outline">Back to today&apos;s queue</Button>
        </Link>
      </div>
    )
  }
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Starting visit…
    </div>
  )
}
