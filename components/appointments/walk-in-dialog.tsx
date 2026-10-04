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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { PatientPicker, type PickedPatient } from '@/components/patients/patient-picker'

interface Doctor {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctors: Doctor[]
  onAdded: () => void
}

/** Front desk: patient walks in → find or register them → they join today's queue. */
export function WalkInDialog({ open, onOpenChange, doctors, onAdded }: Props) {
  const { toast } = useToast()
  const [patient, setPatient] = useState<PickedPatient | null>(null)
  const [doctorId, setDoctorId] = useState('')
  const [complaint, setComplaint] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPatient(null)
      setComplaint('')
      if (doctors.length === 1) setDoctorId(doctors[0].id)
    }
  }, [open, doctors])

  async function add() {
    if (!patient || !doctorId) {
      toast({ variant: 'destructive', title: 'Choose the patient and doctor' })
      return
    }
    setSaving(true)
    try {
      const now = new Date()
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId,
          scheduledDate: date,
          scheduledTime: time,
          duration: 30,
          appointmentType: 'CONSULTATION',
          chiefComplaint: complaint || null,
          notes: 'Walk-in',
          walkIn: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not add the walk-in')
      toast({
        title: 'Added to queue',
        description: `${patient.firstName} ${patient.lastName} is waiting`,
      })
      onAdded()
      onOpenChange(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not added', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Walk-in patient</DialogTitle>
          <DialogDescription>
            Find the patient or register them, then add to today&apos;s queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PatientPicker value={patient} onChange={setPatient} />
          <div className="space-y-2">
            <Label htmlFor="walkin-doctor">Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger id="walkin-doctor">
                <SelectValue placeholder="Choose doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walkin-complaint">Reason (optional)</Label>
            <Input
              id="walkin-complaint"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Tooth pain"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={add} disabled={saving || !patient || !doctorId}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
