'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PatientPicker } from '@/components/patients/patient-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Search, User, Stethoscope, Save, AlertCircle } from 'lucide-react'
import { DentalChart } from '@/components/treatments/dental-chart'
import { procedureCategoryConfig, formatCurrency } from '@/lib/treatment-utils'
import { TreatmentAssist } from '@/components/ai/treatment-assist'
import { VoiceInput } from '@/components/clinical/voice-input'
import { AiOnly } from '@/components/ai/ai-enabled'
import { ProcedurePicker } from '@/components/treatments/procedure-picker'

interface Patient {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  age?: number | null
}

interface Doctor {
  id: string
  firstName: string
  lastName: string
  specialization: string | null
}

interface Procedure {
  id: string
  code: string
  name: string
  category: string
  description: string | null
  defaultDuration: number
  basePrice: string | number
}

export default function NewTreatmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patientId')
  const preselectedAppointmentId = searchParams.get('appointmentId')
  // Coming from a treatment plan's "Do today"
  const preselectedProcedureId = searchParams.get('procedureId')
  const planItemId = searchParams.get('planItemId')
  const preselectedTeeth = (searchParams.get('teeth') || '')
    .split(/[,\s]+/)
    .map((t) => parseInt(t, 10))
    .filter((n) => !isNaN(n))
  const preselectedCost = searchParams.get('cost')

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    patientId: preselectedPatientId || '',
    doctorId: '',
    procedureId: preselectedProcedureId || '',
    appointmentId: preselectedAppointmentId || '',
    toothNumbers: preselectedTeeth as number[],
    chiefComplaint: '',
    diagnosis: '',
    findings: '',
    procedureNotes: '',
    materialsUsed: '',
    followUpRequired: false,
    followUpDate: '',
    cost: preselectedCost || '',
  })

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorsRes, proceduresRes] = await Promise.all([
          fetch('/api/staff/doctors'),
          fetch('/api/procedures?all=true&isActive=true'),
        ])

        if (doctorsRes.ok) {
          const data = await doctorsRes.json()
          setDoctors(data.doctors || data)
        }

        if (proceduresRes.ok) {
          const data = await proceduresRes.json()
          setProcedures(data.procedures)
          if (preselectedProcedureId) {
            const proc = data.procedures?.find((p: Procedure) => p.id === preselectedProcedureId)
            if (proc) {
              setSelectedProcedure(proc)
              setFormData((f) => ({ ...f, cost: f.cost || String(proc.basePrice) }))
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  // Group procedures by category
  const groupedProcedures = procedures.reduce(
    (acc, proc) => {
      if (!acc[proc.category]) {
        acc[proc.category] = []
      }
      acc[proc.category].push(proc)
      return acc
    },
    {} as Record<string, Procedure[]>
  )

  const handleProcedureSelect = (procedureId: string) => {
    const procedure = procedures.find((p) => p.id === procedureId)
    setSelectedProcedure(procedure || null)
    setFormData({
      ...formData,
      procedureId,
      cost: procedure ? procedure.basePrice.toString() : '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.patientId) {
      setError('Please select a patient')
      return
    }
    if (!formData.doctorId) {
      setError('Please select a doctor')
      return
    }
    if (!formData.procedureId) {
      setError('Please select a procedure')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          planItemId: planItemId || undefined,
          toothNumbers: formData.toothNumbers.length > 0 ? formData.toothNumbers.join(',') : null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create treatment')
      }

      const treatment = await response.json()
      router.push(`/treatments/${treatment.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/treatments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">New Treatment</h1>
          <p className="text-muted-foreground">Record a new treatment for a patient</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
            <CardDescription>Select the patient for this treatment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PatientPicker
              value={selectedPatient}
              initialPatientId={preselectedPatientId}
              onChange={(p) => {
                setSelectedPatient(p as Patient | null)
                setFormData((f) => ({ ...f, patientId: p?.id || '' }))
              }}
            />
          </CardContent>
        </Card>

        {/* Doctor and Procedure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Treatment Details
            </CardTitle>
            <CardDescription>Select the doctor and procedure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctor">Doctor *</Label>
                <Select
                  value={formData.doctorId}
                  onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.firstName} {doctor.lastName}
                        {doctor.specialization && ` - ${doctor.specialization}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="procedure">Procedure *</Label>
                <ProcedurePicker
                  procedures={procedures as any}
                  value={formData.procedureId}
                  onChange={(p) => handleProcedureSelect(p?.id || '')}
                />
              </div>
            </div>

            {selectedProcedure && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="font-medium">{selectedProcedure.name}</div>
                {selectedProcedure.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedProcedure.description}
                  </p>
                )}
                <div className="flex gap-4 mt-2 text-sm">
                  <span>Duration: {selectedProcedure.defaultDuration} min</span>
                  <span>Base Price: {formatCurrency(selectedProcedure.basePrice)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cost">Treatment Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="Enter treatment cost"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dental Chart */}
        {selectedPatient && (
          <DentalChart
            patientId={selectedPatient.id}
            selectedTeeth={formData.toothNumbers}
            patientAge={selectedPatient?.age ?? null}
            onTeethSelect={(teeth) => setFormData({ ...formData, toothNumbers: teeth })}
          />
        )}

        {/* Clinical Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Clinical Notes</CardTitle>
            <CardDescription>Document the clinical findings and treatment notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Textarea
                id="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                placeholder="Patient's main concern or reason for visit..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Clinical diagnosis..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="findings">Clinical Findings</Label>
              <Textarea
                id="findings"
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                placeholder="Examination findings..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="procedureNotes">Procedure Notes</Label>
                <VoiceInput
                  onTranscript={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      procedureNotes: prev.procedureNotes ? prev.procedureNotes + ' ' + text : text,
                    }))
                  }
                />
              </div>
              <Textarea
                id="procedureNotes"
                value={formData.procedureNotes}
                onChange={(e) => setFormData({ ...formData, procedureNotes: e.target.value })}
                placeholder="Details of the procedure performed... (use mic for voice dictation)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialsUsed">Materials Used</Label>
              <Textarea
                id="materialsUsed"
                value={formData.materialsUsed}
                onChange={(e) => setFormData({ ...formData, materialsUsed: e.target.value })}
                placeholder="List of materials and supplies used..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Treatment Assistant */}
        {formData.patientId && formData.procedureId && (
          <AiOnly>
            <TreatmentAssist
              patientId={formData.patientId}
              procedureId={formData.procedureId}
              procedureName={procedures.find((p) => p.id === formData.procedureId)?.name}
              diagnosis={formData.diagnosis}
              findings={formData.findings}
              procedureNotes={formData.procedureNotes}
            />
          </AiOnly>
        )}

        {/* Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle>Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="followUpRequired"
                checked={formData.followUpRequired}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, followUpRequired: checked as boolean })
                }
              />
              <Label htmlFor="followUpRequired">Follow-up required</Label>
            </div>

            {formData.followUpRequired && (
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/treatments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              'Creating...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Treatment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
