'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { ProcedurePicker, type PickableProcedure } from '@/components/treatments/procedure-picker'
import { labelFor } from '@/lib/labels'

interface ItemRow {
  key: string
  procedureId: string
  toothNumbers: string
  estimatedCost: string
  notes: string
  status: string
  treatmentId: string | null
}

let k = 0
const newRow = (): ItemRow => ({
  key: `new-${++k}`,
  procedureId: '',
  toothNumbers: '',
  estimatedCost: '',
  notes: '',
  status: 'PENDING',
  treatmentId: null,
})

export default function EditTreatmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [plan, setPlan] = useState<any>(null)
  const [procedures, setProcedures] = useState<PickableProcedure[]>([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/treatment-plans/${id}`).then((r) => r.json()),
      fetch('/api/procedures?all=true&isActive=true').then((r) => r.json()),
    ])
      .then(([p, procs]) => {
        if (!p?.id) throw new Error(p?.error || 'Not found')
        setPlan(p)
        setTitle(p.title || '')
        setNotes(p.notes || '')
        setStartDate(p.startDate ? String(p.startDate).slice(0, 10) : '')
        setEndDate(p.expectedEndDate ? String(p.expectedEndDate).slice(0, 10) : '')
        setItems(
          (p.items || []).map((it: any) => ({
            key: it.id,
            procedureId: it.procedure?.id || it.procedureId,
            toothNumbers: it.toothNumbers || '',
            estimatedCost: it.estimatedCost != null ? String(it.estimatedCost) : '',
            notes: it.notes || '',
            status: it.status,
            treatmentId: it.treatmentId || null,
          }))
        )
        setProcedures(procs.procedures || [])
      })
      .catch((e) =>
        toast({ variant: 'destructive', title: 'Could not load plan', description: e.message })
      )
      .finally(() => setLoading(false))
  }, [id, toast])

  const update = (key: string, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const total = items.reduce((s, r) => s + (Number(r.estimatedCost) || 0), 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Give the plan a title' })
      return
    }
    const rows = items.filter((r) => r.procedureId)
    setSaving(true)
    try {
      const res = await fetch(`/api/treatment-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes || null,
          startDate: startDate || null,
          expectedEndDate: endDate || null,
          items: rows.map((r, i) => ({
            procedureId: r.procedureId,
            toothNumbers: r.toothNumbers || null,
            estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : undefined,
            notes: r.notes || null,
            priority: i + 1,
            status: r.status,
            treatmentId: r.treatmentId,
          })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save')
      toast({ title: 'Plan updated' })
      router.push(`/treatments/plans/${id}`)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Not saved', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!plan) return <p className="py-16 text-center text-muted-foreground">Plan not found</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/treatments/plans/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Back to plan">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Edit treatment plan</h1>
          <p className="text-sm text-muted-foreground">
            {plan.planNumber} · {plan.patient?.firstName} {plan.patient?.lastName} ·{' '}
            {labelFor(plan.status)}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Expected start</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Expected end</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Procedures</CardTitle>
            <CardDescription>
              In order of priority. The same procedure can be added for different teeth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((r, i) => {
              const locked = !!r.treatmentId || r.status === 'COMPLETED'
              return (
                <div key={r.key} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                    <div className="flex items-center gap-2">
                      {r.status !== 'PENDING' && (
                        <Badge variant="secondary">{labelFor(r.status)}</Badge>
                      )}
                      {!locked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove procedure"
                          onClick={() => setItems((rows) => rows.filter((x) => x.key !== r.key))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {locked ? (
                    <p className="text-sm">
                      {procedures.find((p) => p.id === r.procedureId)?.name || 'Procedure'} (already
                      started, can&apos;t be changed)
                    </p>
                  ) : (
                    <ProcedurePicker
                      procedures={procedures}
                      value={r.procedureId}
                      onChange={(p) =>
                        update(r.key, {
                          procedureId: p?.id || '',
                          estimatedCost: p ? String(p.basePrice) : r.estimatedCost,
                        })
                      }
                    />
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                      value={r.toothNumbers}
                      disabled={locked}
                      onChange={(e) => update(r.key, { toothNumbers: e.target.value })}
                      placeholder="Teeth, e.g. 36"
                      aria-label="Teeth"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={r.estimatedCost}
                      disabled={locked}
                      onChange={(e) => update(r.key, { estimatedCost: e.target.value })}
                      placeholder="Cost ₹"
                      aria-label="Estimated cost"
                    />
                    <Input
                      value={r.notes}
                      onChange={(e) => update(r.key, { notes: e.target.value })}
                      placeholder="Notes"
                      aria-label="Notes"
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItems((rows) => [...rows, newRow()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add procedure
              </Button>
              <p className="text-sm font-medium tabular-nums">
                Estimated total ₹{total.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/treatments/plans/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save plan
          </Button>
        </div>
      </form>
    </div>
  )
}
