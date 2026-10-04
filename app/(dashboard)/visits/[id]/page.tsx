'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyHint } from '@/components/ui/empty-hint'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pill,
  Plus,
  Receipt,
  Stethoscope,
} from 'lucide-react'
import { DentalChart } from '@/components/dental-chart'
import { ProcedurePicker, type PickableProcedure } from '@/components/treatments/procedure-picker'
import { medicalAlerts } from '@/lib/patient-utils'
import { labelFor } from '@/lib/labels'
import { formatTime, getDoctorName } from '@/lib/appointment-utils'
import { useCurrentUser, can } from '@/components/layout/current-user'

const COMPLAINTS = [
  'Pain',
  'Sensitivity',
  'Swelling',
  'Bleeding gums',
  'Broken tooth',
  'Loose tooth',
  'Bad breath',
  'Check-up',
  'Cleaning',
  'Braces consult',
  'Missing tooth',
  'Follow-up',
]

const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { role } = useCurrentUser()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [procedures, setProcedures] = useState<PickableProcedure[]>([])

  // Notes (auto-saved)
  const [complaint, setComplaint] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const loadedRef = useRef(false)

  // Add treatment
  const [proc, setProc] = useState<PickableProcedure | null>(null)
  const [teeth, setTeeth] = useState('')
  const [price, setPrice] = useState('')
  const [procNotes, setProcNotes] = useState('')
  const [addingTreatment, setAddingTreatment] = useState(false)

  // Next visit
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('10:00')
  const [booking, setBooking] = useState(false)

  const [finishing, setFinishing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load the visit')
      setData(json)
      if (!loadedRef.current) {
        setComplaint(json.visit.chiefComplaint || '')
        setClinicalNotes(json.visit.clinicalNotes || '')
        loadedRef.current = true
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not loaded', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
    fetch('/api/procedures?all=true&isActive=true')
      .then((r) => r.json())
      .then((d) => setProcedures(d.procedures || []))
      .catch(() => {})
  }, [load])

  const visit = data?.visit
  const readOnly = visit && ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(visit.status)

  // Auto-save complaint + notes a moment after typing stops
  useEffect(() => {
    if (!loadedRef.current || readOnly) return
    setSaveState('saving')
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/appointments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chiefComplaint: complaint, clinicalNotes }),
        })
        setSaveState(res.ok ? 'saved' : 'error')
      } catch {
        setSaveState('error')
      }
    }, 900)
    return () => clearTimeout(t)
  }, [complaint, clinicalNotes, id, readOnly])

  function toggleComplaint(c: string) {
    const parts = complaint
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const next = parts.includes(c) ? parts.filter((p) => p !== c) : [...parts, c]
    setComplaint(next.join(', '))
  }

  async function addTreatment(status: 'COMPLETED' | 'IN_PROGRESS', planItem?: any) {
    const procedureId = planItem ? planItem.procedure.id : proc?.id
    if (!procedureId) {
      toast({ variant: 'destructive', title: 'Choose a procedure first' })
      return
    }
    setAddingTreatment(true)
    try {
      const res = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: visit.patientId,
          doctorId: visit.doctor.id,
          appointmentId: id,
          procedureId,
          toothNumbers: planItem ? planItem.toothNumbers : teeth.trim() || null,
          cost: planItem ? Number(planItem.estimatedCost) : price ? Number(price) : undefined,
          chiefComplaint: complaint || null,
          diagnosis: clinicalNotes || null,
          procedureNotes: planItem ? planItem.notes : procNotes || null,
          planItemId: planItem?.id,
          status,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save the treatment')
      toast({ title: status === 'COMPLETED' ? 'Treatment recorded' : 'Treatment started' })
      setProc(null)
      setTeeth('')
      setPrice('')
      setProcNotes('')
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not saved', description: e.message })
    } finally {
      setAddingTreatment(false)
    }
  }

  async function completeTreatment(treatmentId: string) {
    const res = await fetch(`/api/treatments/${treatmentId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      toast({ title: 'Marked done' })
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      toast({ variant: 'destructive', title: 'Not done', description: j.error })
    }
  }

  async function bookNext() {
    if (!nextDate || !nextTime) {
      toast({ variant: 'destructive', title: 'Pick a date and time' })
      return
    }
    setBooking(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: visit.patientId,
          doctorId: visit.doctor.id,
          scheduledDate: nextDate,
          scheduledTime: nextTime,
          duration: 30,
          appointmentType: 'FOLLOW_UP',
          chiefComplaint: 'Follow-up',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not book')
      toast({ title: 'Next visit booked' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not booked', description: e.message })
    } finally {
      setBooking(false)
    }
  }

  async function finishVisit() {
    setFinishing(true)
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chiefComplaint: complaint, clinicalNotes }),
      })
      const res = await fetch(`/api/appointments/${id}/check-out`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not finish the visit')
      toast({ title: 'Visit finished' })
      if (data.unbilledCount > 0 && can.bill(role)) {
        router.push(`/billing/invoices/new?patientId=${visit.patientId}`)
      } else {
        router.push('/appointments/queue')
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not finished', description: e.message })
    } finally {
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!visit) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Visit not found</p>
        <Link href="/appointments/queue">
          <Button>Back to today&apos;s queue</Button>
        </Link>
      </div>
    )
  }

  const p = visit.patient
  const alerts = medicalAlerts(p.medicalHistory)
  const pendingPlanItems = (data.plans || []).flatMap((plan: any) =>
    plan.items
      .filter((it: any) => it.status === 'PENDING' && !it.treatmentId)
      .map((it: any) => ({ ...it, planTitle: plan.title }))
  )
  const visitTotal = (visit.treatments || []).reduce(
    (s: number, t: any) => s + Number(t.cost || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Patient strip */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/appointments/queue">
            <Button variant="ghost" size="icon" aria-label="Back to today's queue">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {p.firstName} {p.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[
                p.age != null ? `${p.age} yrs` : null,
                labelFor(p.gender),
                p.phone,
                `${format(new Date(visit.scheduledDate), 'd MMM')} · ${formatTime(visit.scheduledTime)}`,
                getDoctorName(visit.doctor),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={readOnly ? 'secondary' : 'info'}>{labelFor(visit.status)}</Badge>
              {alerts.map((a) => (
                <Badge key={a} variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {a}
                </Badge>
              ))}
              {data.balanceDue > 0 && <Badge variant="warning">Due {inr(data.balanceDue)}</Badge>}
            </div>
          </div>
        </div>
        <Link href={`/patients/${p.id}`}>
          <Button variant="outline">Full profile</Button>
        </Link>
      </div>

      {alerts.length === 0 && !p.medicalHistory && (
        <Link href={`/patients/${p.id}/edit`} className="block">
          <EmptyHint
            title="No medical history on file"
            tip="Ask about diabetes, BP, heart problems, blood thinners, pregnancy and allergies, then tap here to record them."
          />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* 1. Complaint + findings */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>1 · Complaint and findings</CardTitle>
                <CardDescription>Saved automatically as you type</CardDescription>
              </div>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {saveState === 'saving'
                  ? 'Saving…'
                  : saveState === 'saved'
                    ? 'Saved'
                    : saveState === 'error'
                      ? 'Not saved, check connection'
                      : ''}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMPLAINTS.map((c) => {
                  const on = complaint
                    .split(',')
                    .map((x) => x.trim())
                    .includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleComplaint(c)}
                      aria-pressed={on}
                      className={`min-h-9 rounded-full border px-3 text-sm ${
                        on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint">Chief complaint</Label>
                <Input
                  id="complaint"
                  value={complaint}
                  disabled={readOnly}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. Pain lower left back tooth for 3 days"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Examination and diagnosis</Label>
                <Textarea
                  id="clinicalNotes"
                  rows={4}
                  value={clinicalNotes}
                  disabled={readOnly}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Deep caries 36, tender on percussion. Dx: irreversible pulpitis 36. IOPA advised."
                />
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <DentalChart patientId={p.id} patientAge={p.age} />

          {/* 2. Treatment today */}
          <Card>
            <CardHeader>
              <CardTitle>2 · Treatment today</CardTitle>
              <CardDescription>What was done in this visit. Prices go to the bill.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(visit.treatments || []).length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {visit.treatments.map((t: any) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <Link href={`/treatments/${t.id}`} className="min-w-0 hover:underline">
                        <p className="font-medium">
                          {t.procedure.name}
                          {t.toothNumbers ? (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · tooth {t.toothNumbers}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {labelFor(t.status)} · {inr(t.cost)}
                        </p>
                      </Link>
                      {!readOnly && t.status !== 'COMPLETED' && (
                        <Button size="sm" variant="outline" onClick={() => completeTreatment(t.id)}>
                          <Check className="mr-1 h-4 w-4" /> Mark done
                        </Button>
                      )}
                    </li>
                  ))}
                  <li className="flex justify-between p-3 text-sm font-medium">
                    <span>Total today</span>
                    <span className="tabular-nums">{inr(visitTotal)}</span>
                  </li>
                </ul>
              )}

              {!readOnly && pendingPlanItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">From the treatment plan</p>
                  <ul className="space-y-2">
                    {pendingPlanItems.map((it: any) => (
                      <li
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {it.procedure.name}
                            {it.toothNumbers ? (
                              <span className="font-normal text-muted-foreground">
                                {' '}
                                · tooth {it.toothNumbers}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {it.planTitle} · {inr(it.estimatedCost)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={addingTreatment}
                          onClick={() => addTreatment('COMPLETED', it)}
                        >
                          Done today
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!readOnly && (
                <div className="space-y-3 rounded-lg bg-muted/40 p-3">
                  <p className="text-sm font-medium">Add a procedure</p>
                  <ProcedurePicker
                    procedures={procedures}
                    value={proc?.id || ''}
                    onChange={(pr) => {
                      setProc(pr)
                      setPrice(pr ? String(pr.basePrice) : '')
                    }}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="teeth">Tooth / teeth</Label>
                      <Input
                        id="teeth"
                        value={teeth}
                        onChange={(e) => setTeeth(e.target.value)}
                        placeholder="e.g. 36 or 16, 26"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="price">Price (₹)</Label>
                      <Input
                        id="price"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <Input
                    value={procNotes}
                    onChange={(e) => setProcNotes(e.target.value)}
                    placeholder="Notes (optional): e.g. Access opening done, working length 21 mm"
                    aria-label="Procedure notes"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!proc || addingTreatment}
                      onClick={() => addTreatment('COMPLETED')}
                    >
                      {addingTreatment ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Done today
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!proc || addingTreatment}
                      onClick={() => addTreatment('IN_PROGRESS')}
                    >
                      Started (more sittings)
                    </Button>
                  </div>
                </div>
              )}

              <Link href={`/treatments/plans/new?patientId=${p.id}`}>
                <Button variant="link" className="px-0">
                  <ClipboardList className="mr-1 h-4 w-4" /> Plan future work (treatment plan)
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {/* 3. Prescription */}
          <Card>
            <CardHeader>
              <CardTitle>3 · Prescription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(visit.prescriptions || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No Rx written in this visit.</p>
              ) : (
                visit.prescriptions.map((rx: any) => (
                  <Link
                    key={rx.id}
                    href={`/prescriptions/${rx.id}`}
                    className="block rounded-lg border p-3 hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">{rx.prescriptionNo}</p>
                    <p className="text-sm text-muted-foreground">
                      {rx.medications.map((m: any) => m.medicationName).join(', ')}
                    </p>
                  </Link>
                ))
              )}
              {!readOnly && (
                <Link
                  href={`/prescriptions/new?patientId=${p.id}&appointmentId=${id}&returnTo=${encodeURIComponent(`/visits/${id}`)}${clinicalNotes ? `&diagnosis=${encodeURIComponent(clinicalNotes.slice(0, 120))}` : ''}`}
                >
                  <Button variant="outline" className="w-full">
                    <Pill className="mr-2 h-4 w-4" /> Write Rx
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* 4. Next visit */}
          <Card>
            <CardHeader>
              <CardTitle>4 · Next visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.nextVisit ? (
                <Link
                  href={`/appointments/${data.nextVisit.id}`}
                  className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/40"
                >
                  <CalendarPlus className="h-4 w-4 text-primary" />
                  {format(new Date(data.nextVisit.scheduledDate), 'EEE d MMM')} ·{' '}
                  {formatTime(data.nextVisit.scheduledTime)}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Not booked yet.</p>
              )}
              {!readOnly && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {[3, 7, 14, 30].map((d) => {
                      const dt = new Date()
                      dt.setDate(dt.getDate() + d)
                      const v = format(dt, 'yyyy-MM-dd')
                      return (
                        <Button
                          key={d}
                          type="button"
                          size="sm"
                          variant={nextDate === v ? 'default' : 'outline'}
                          onClick={() => setNextDate(v)}
                        >
                          {d < 30 ? `${d} days` : '1 month'}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={nextDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setNextDate(e.target.value)}
                      aria-label="Next visit date"
                    />
                    <Input
                      type="time"
                      value={nextTime}
                      onChange={(e) => setNextTime(e.target.value)}
                      aria-label="Next visit time"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={booking}
                    onClick={bookNext}
                  >
                    {booking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Book next visit
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Previous visits */}
          {(data.previousVisits || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous visits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.previousVisits.map((v: any) => (
                  <Link
                    key={v.id}
                    href={`/visits/${v.id}`}
                    className="block text-sm hover:underline"
                  >
                    <p className="font-medium">{format(new Date(v.scheduledDate), 'd MMM yyyy')}</p>
                    <p className="text-muted-foreground">
                      {[
                        v.chiefComplaint,
                        v.treatments
                          .map(
                            (t: any) =>
                              `${t.procedure.name}${t.toothNumbers ? ` ${t.toothNumbers}` : ''}`
                          )
                          .join(', '),
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No notes'}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 5. Finish */}
      {!readOnly ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-card/95 px-4 py-3 backdrop-blur md:-mx-8 md:bottom-0 md:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {visit.treatments.length} treatment{visit.treatments.length === 1 ? '' : 's'} ·{' '}
              {inr(visitTotal)}
              {data.unbilledCount > 0 ? ' · goes to billing next' : ''}
            </p>
            <Button onClick={finishVisit} disabled={finishing}>
              {finishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : data.unbilledCount > 0 && can.bill(role) ? (
                <Receipt className="mr-2 h-4 w-4" />
              ) : (
                <Stethoscope className="mr-2 h-4 w-4" />
              )}
              {data.unbilledCount > 0 && can.bill(role) ? 'Finish and bill' : 'Finish visit'}
            </Button>
          </div>
        </div>
      ) : (
        can.bill(role) &&
        data.unbilledCount > 0 && (
          <Link href={`/billing/invoices/new?patientId=${p.id}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Bill unbilled treatment
            </Button>
          </Link>
        )
      )}
    </div>
  )
}
