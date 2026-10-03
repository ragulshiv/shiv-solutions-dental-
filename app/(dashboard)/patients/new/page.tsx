'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import {
  PatientForm,
  EMPTY_PATIENT,
  formToPayload,
  type PatientFormValues,
} from '@/components/patients/patient-form'

export default function NewPatientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<PatientFormValues>(EMPTY_PATIENT)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data.errors) setErrors(data.errors)
        throw new Error(
          data.message || data.error || `Could not save the patient (${response.status})`
        )
      }
      toast({
        title: 'Patient saved',
        description: `${form.firstName} ${form.lastName} is registered as ${data.patientId}.`,
      })
      const returnTo = searchParams.get('returnTo')
      router.push(
        returnTo
          ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}patientId=${data.id}`
          : `/patients/${data.id}`
      )
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Not saved', description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon" aria-label="Back to patients">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">New Patient</h1>
          <p className="text-sm text-muted-foreground">Register a new patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PatientForm value={form} onChange={setForm} errors={errors} />
        <div className="flex justify-end gap-3">
          <Link href="/patients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save patient
          </Button>
        </div>
      </form>
    </div>
  )
}
