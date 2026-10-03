'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useCurrentUser } from '@/components/layout/current-user'
import { labelFor } from '@/lib/labels'

const TEXT_FIELDS = [
  { key: 'chiefComplaint', label: 'Chief complaint', rows: 2 },
  { key: 'diagnosis', label: 'Diagnosis', rows: 2 },
  { key: 'findings', label: 'Findings', rows: 3 },
  { key: 'procedureNotes', label: 'Procedure notes', rows: 4 },
  { key: 'materialsUsed', label: 'Materials used', rows: 2 },
  { key: 'complications', label: 'Complications', rows: 2 },
] as const

export default function EditTreatmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { role } = useCurrentUser()
  const [treatment, setTreatment] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/treatments/${id}`)
      .then((r) => r.json())
      .then((t) => {
        if (!t?.id) throw new Error(t?.error || 'Not found')
        setTreatment(t)
        setForm({
          chiefComplaint: t.chiefComplaint || '',
          diagnosis: t.diagnosis || '',
          findings: t.findings || '',
          procedureNotes: t.procedureNotes || '',
          materialsUsed: t.materialsUsed || '',
          complications: t.complications || '',
          toothNumbers: t.toothNumbers || '',
          cost: t.cost != null ? String(t.cost) : '',
          followUpRequired: !!t.followUpRequired,
          followUpDate: t.followUpDate ? String(t.followUpDate).slice(0, 10) : '',
        })
      })
      .catch((e) =>
        toast({ variant: 'destructive', title: 'Could not load treatment', description: e.message })
      )
      .finally(() => setLoading(false))
  }, [id, toast])

  const finished = treatment && ['COMPLETED', 'CANCELLED'].includes(treatment.status)
  const lockCore = finished && role !== 'ADMIN'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const f of TEXT_FIELDS) payload[f.key] = form[f.key] || null
      payload.followUpRequired = form.followUpRequired
      payload.followUpDate = form.followUpRequired && form.followUpDate ? form.followUpDate : null
      if (!lockCore) {
        payload.toothNumbers = form.toothNumbers || null
        if (form.cost !== '' && Number(form.cost) !== Number(treatment.cost))
          payload.cost = Number(form.cost)
      }
      const res = await fetch(`/api/treatments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save')
      toast({ title: 'Treatment updated' })
      router.push(`/treatments/${id}`)
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
  if (!treatment) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Treatment not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/treatments/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Back to treatment">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Edit treatment</h1>
          <p className="text-sm text-muted-foreground">
            {treatment.treatmentNo} · {treatment.procedure?.name} · {treatment.patient?.firstName}{' '}
            {treatment.patient?.lastName} · {labelFor(treatment.status)}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Teeth and price</CardTitle>
            {lockCore && (
              <CardDescription>
                This treatment is finished. Ask a clinic admin to change the teeth or price.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="toothNumbers">Tooth / teeth</Label>
              <Input
                id="toothNumbers"
                value={form.toothNumbers}
                disabled={lockCore}
                onChange={(e) => setForm({ ...form, toothNumbers: e.target.value })}
                placeholder="e.g. 36 or 16,26"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Price (₹)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.cost}
                disabled={lockCore}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {TEXT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Textarea
                  id={f.key}
                  rows={f.rows}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3">
              <Switch
                checked={form.followUpRequired}
                onCheckedChange={(v) => setForm({ ...form, followUpRequired: v })}
              />
              <span className="text-sm">Follow-up needed</span>
            </label>
            {form.followUpRequired && (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="followUpDate">Follow-up date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/treatments/${id}`}>
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
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
