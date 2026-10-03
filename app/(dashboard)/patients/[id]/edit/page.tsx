'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import {
  PatientForm,
  EMPTY_PATIENT,
  formToPayload,
  patientToForm,
  type PatientFormValues,
} from '@/components/patients/patient-form'

export default function EditPatientPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<PatientFormValues>(EMPTY_PATIENT)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients/${patientId}`)
        if (!res.ok) throw new Error('Failed to load patient')
        const data = await res.json()
        setForm(patientToForm(data.patient || data))
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load this patient.',
        })
      } finally {
        setLoading(false)
      }
    }
    loadPatient()
  }, [patientId, toast])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data.errors) setErrors(data.errors)
        throw new Error(data.error || `Could not save changes (${response.status})`)
      }
      toast({
        title: 'Changes saved',
        description: `${form.firstName} ${form.lastName} is up to date.`,
      })
      router.push(`/patients/${patientId}`)
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Not saved', description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/patients/${patientId}`}>
          <Button variant="ghost" size="icon" aria-label="Back to patient">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Edit Patient</h1>
          <p className="text-sm text-muted-foreground">
            Clear a field to remove it. Changes save when you press Save.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PatientForm value={form} onChange={setForm} errors={errors} currentPatientId={patientId} />
        <div className="flex justify-end gap-3">
          <Link href={`/patients/${patientId}`}>
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
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
