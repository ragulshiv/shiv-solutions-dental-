'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserPlus } from 'lucide-react'
import {
  PatientForm,
  EMPTY_PATIENT,
  formToPayload,
  type PatientFormValues,
} from '@/components/patients/patient-form'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the saved patient (as returned by POST /api/patients). */
  onCreated: (patient: any) => void
  /** Pre-fill from what the user already typed in a search box. */
  initialSearch?: string
}

/** 20-second registration that never leaves the current screen. */
export function QuickAddPatientDialog({ open, onOpenChange, onCreated, initialSearch }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<PatientFormValues>(EMPTY_PATIENT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Reset (and pre-fill from the search box) every time the dialog opens
  useEffect(() => {
    if (!open) return
    const s = (initialSearch || '').trim()
    const isPhone = /^[+\d\s-]{6,}$/.test(s)
    const [first = '', ...rest] = isPhone ? [] : s.split(/\s+/)
    setForm({
      ...EMPTY_PATIENT,
      phone: isPhone ? s : '',
      firstName: first,
      lastName: rest.join(' '),
    })
    setErrors({})
  }, [open, initialSearch])

  async function save() {
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form, { compact: true })),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        throw new Error(data.message || data.error || 'Could not save the patient')
      }
      toast({
        title: 'Patient saved',
        description: `${data.firstName} ${data.lastName} · ${data.patientId}`,
      })
      onCreated(data)
      onOpenChange(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not saved', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> New patient
          </DialogTitle>
          <DialogDescription>
            Just the essentials. Address and other details can be added later from the profile.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="space-y-4"
        >
          <PatientForm value={form} onChange={setForm} errors={errors} compact />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and select
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
