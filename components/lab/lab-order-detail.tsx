'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { labelFor } from '@/lib/labels'

const NEXT_STEPS: Record<string, { status: string; label: string; date?: string }[]> = {
  CREATED: [{ status: 'SENT_TO_LAB', label: 'Mark sent to lab', date: 'sentDate' }],
  SENT_TO_LAB: [
    { status: 'IN_PROGRESS', label: 'Lab is working on it' },
    { status: 'READY', label: 'Ready at lab' },
  ],
  IN_PROGRESS: [{ status: 'READY', label: 'Ready at lab' }],
  QUALITY_CHECK: [
    { status: 'READY', label: 'Passed check' },
    { status: 'REMAKE_REQUIRED', label: 'Needs remake' },
  ],
  READY: [{ status: 'DELIVERED', label: 'Received at clinic', date: 'receivedDate' }],
  DELIVERED: [
    { status: 'FITTED', label: 'Fitted in patient', date: 'deliveredDate' },
    { status: 'REMAKE_REQUIRED', label: 'Needs remake' },
  ],
  REMAKE_REQUIRED: [{ status: 'SENT_TO_LAB', label: 'Sent back to lab', date: 'sentDate' }],
}

const dateOnly = (v: any) => (v ? String(v).slice(0, 10) : '')

/** Lab order page: details, quick status steps and an edit form. */
export function LabOrderDetail({
  orderId,
  startEditing = false,
}: {
  orderId: string
  startEditing?: boolean
}) {
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/lab-orders/${orderId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Not found')
      const o = json.data
      setOrder(o)
      setForm({
        description: o.description || '',
        toothNumbers: o.toothNumbers || '',
        shadeGuide: o.shadeGuide || '',
        expectedDate: dateOnly(o.expectedDate),
        estimatedCost: o.estimatedCost != null ? String(o.estimatedCost) : '',
        actualCost: o.actualCost != null ? String(o.actualCost) : '',
        notes: o.notes || '',
        specialInstructions: o.specialInstructions || '',
      })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not load lab order', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [orderId, toast])

  useEffect(() => {
    load()
  }, [load])

  async function put(changes: Record<string, any>, done: string) {
    setSaving(true)
    try {
      const body = {
        patientId: order.patientId,
        labVendorId: order.labVendorId,
        workType: order.workType,
        orderDate: order.orderDate,
        description: order.description,
        toothNumbers: order.toothNumbers,
        shadeGuide: order.shadeGuide,
        expectedDate: order.expectedDate,
        sentDate: order.sentDate,
        receivedDate: order.receivedDate,
        deliveredDate: order.deliveredDate,
        estimatedCost: Number(order.estimatedCost),
        actualCost: order.actualCost != null ? Number(order.actualCost) : null,
        qualityCheck: order.qualityCheck,
        qualityNotes: order.qualityNotes,
        priority: order.priority,
        notes: order.notes,
        specialInstructions: order.specialInstructions,
        ...changes,
      }
      const res = await fetch(`/api/lab-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save')
      toast({ title: done })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not saved', description: e.message })
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
  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Lab order not found</p>
        <Link href="/lab">
          <Button variant="link">Back to lab orders</Button>
        </Link>
      </div>
    )
  }

  const steps = NEXT_STEPS[order.status] || []
  const field = (k: string, label: string, extra: any = {}) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        {...extra}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/lab">
            <Button variant="ghost" size="icon" aria-label="Back to lab orders">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {labelFor(order.workType)}
              {order.toothNumbers ? ` · ${order.toothNumbers}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">
              {order.orderNumber} ·{' '}
              <Link
                href={`/patients/${order.patientId}`}
                className="underline-offset-2 hover:underline"
              >
                {order.patientName}
              </Link>{' '}
              · {order.vendorName}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="info">{labelFor(order.status)}</Badge>
              {order.priority !== 'NORMAL' && (
                <Badge variant="warning">{labelFor(order.priority)}</Badge>
              )}
              {order.expectedDate && (
                <Badge variant="outline">Due {format(new Date(order.expectedDate), 'd MMM')}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((st) => (
            <Button
              key={st.status}
              variant={st.status === 'REMAKE_REQUIRED' ? 'outline' : 'default'}
              disabled={saving}
              onClick={() =>
                put(
                  {
                    status: st.status,
                    ...(st.date ? { [st.date]: new Date().toISOString() } : {}),
                  },
                  st.label
                )
              }
            >
              {st.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order details</CardTitle>
            {!startEditing && (
              <CardDescription>Change anything below and press Save.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                put(
                  {
                    description: form.description || null,
                    toothNumbers: form.toothNumbers || null,
                    shadeGuide: form.shadeGuide || null,
                    expectedDate: form.expectedDate || null,
                    estimatedCost: Number(form.estimatedCost || 0),
                    actualCost: form.actualCost === '' ? null : Number(form.actualCost),
                    notes: form.notes || null,
                    specialInstructions: form.specialInstructions || null,
                  },
                  'Lab order saved'
                )
              }}
            >
              {field('toothNumbers', 'Teeth', { placeholder: 'e.g. 36' })}
              {field('shadeGuide', 'Shade', { placeholder: 'e.g. A2' })}
              {field('expectedDate', 'Expected back', { type: 'date' })}
              {field('estimatedCost', 'Estimated cost (₹)', { type: 'number', min: 0 })}
              {field('actualCost', 'Final lab bill (₹)', { type: 'number', min: 0 })}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specialInstructions">Instructions to lab</Label>
                <Textarea
                  id="specialInstructions"
                  rows={2}
                  value={form.specialInstructions}
                  onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {[
                ['Ordered', order.orderDate],
                ['Sent to lab', order.sentDate],
                ['Received', order.receivedDate],
                ['Fitted', order.deliveredDate],
              ].map(([label, d]) => (
                <p key={label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{d ? format(new Date(d), 'd MMM yyyy') : '—'}</span>
                </p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {(order.history || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {order.history.map((h: any) => (
                    <li key={h.id}>
                      <p>
                        {labelFor(h.statusFrom)} → {labelFor(h.statusTo)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(h.createdAt), 'd MMM, h:mm a')}
                        {h.changedByName ? ` · ${h.changedByName}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
