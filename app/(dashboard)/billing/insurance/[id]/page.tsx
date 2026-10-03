'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Edit, Loader2 } from 'lucide-react'
import { labelFor } from '@/lib/labels'

const inr = (n: number | string | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const NEXT: Record<
  string,
  { status: string; label: string; needs?: 'approved' | 'settled' | 'reason' }[]
> = {
  DRAFT: [{ status: 'SUBMITTED', label: 'Submit to insurer' }],
  SUBMITTED: [
    { status: 'UNDER_REVIEW', label: 'Under review' },
    { status: 'APPROVED', label: 'Approved', needs: 'approved' },
    { status: 'PARTIALLY_APPROVED', label: 'Partly approved', needs: 'approved' },
    { status: 'REJECTED', label: 'Rejected', needs: 'reason' },
  ],
  UNDER_REVIEW: [
    { status: 'APPROVED', label: 'Approved', needs: 'approved' },
    { status: 'PARTIALLY_APPROVED', label: 'Partly approved', needs: 'approved' },
    { status: 'REJECTED', label: 'Rejected', needs: 'reason' },
  ],
  APPROVED: [{ status: 'SETTLED', label: 'Money received', needs: 'settled' }],
  PARTIALLY_APPROVED: [{ status: 'SETTLED', label: 'Money received', needs: 'settled' }],
}

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const [claim, setClaim] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<{ status: string; label: string; needs?: string } | null>(
    null
  )
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/insurance-claims/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Not found')
      setClaim(json)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not load claim', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
  }, [load])

  async function move(step: { status: string; label: string; needs?: string }, extra?: string) {
    setSaving(true)
    try {
      const body: Record<string, any> = { status: step.status }
      if (step.needs === 'approved') body.approvedAmount = Number(extra)
      if (step.needs === 'settled') body.settledAmount = Number(extra)
      if (step.needs === 'reason') body.rejectionReason = extra
      const res = await fetch(`/api/insurance-claims/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not update')
      toast({ title: `Claim: ${step.label.toLowerCase()}` })
      setPending(null)
      setValue('')
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not updated', description: e.message })
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
  if (!claim) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Claim not found</p>
        <Link href="/billing/insurance">
          <Button variant="link">Back to claims</Button>
        </Link>
      </div>
    )
  }

  const steps = NEXT[claim.status] || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/billing/insurance">
            <Button variant="ghost" size="icon" aria-label="Back to claims">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {claim.claimNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              <Link href={`/patients/${claim.patient.id}`} className="hover:underline">
                {claim.patient.firstName} {claim.patient.lastName}
              </Link>{' '}
              · {claim.insuranceProvider} · Policy {claim.policyNumber}
            </p>
            <Badge variant={claim.status === 'REJECTED' ? 'destructive' : 'info'}>
              {labelFor(claim.status)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['DRAFT', 'SUBMITTED'].includes(claim.status) && (
            <Link href={`/billing/insurance/${id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
          )}
          {steps.map((st) => (
            <Button
              key={st.status}
              variant={st.status === 'REJECTED' ? 'outline' : 'default'}
              disabled={saving}
              onClick={() => (st.needs ? setPending(st) : move(st))}
            >
              {st.label}
            </Button>
          ))}
        </div>
      </div>

      {pending && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="claim-value">
                {pending.needs === 'approved'
                  ? 'Approved amount (₹)'
                  : pending.needs === 'settled'
                    ? 'Amount received (₹)'
                    : 'Reason given by insurer'}
              </Label>
              <Input
                id="claim-value"
                type={pending.needs === 'reason' ? 'text' : 'number'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button disabled={saving || !value} onClick={() => move(pending, value)}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[
          ['Claimed', inr(claim.claimAmount)],
          ['Approved', claim.approvedAmount != null ? inr(claim.approvedAmount) : '—'],
          ['Received', claim.settledAmount != null ? inr(claim.settledAmount) : '—'],
          [
            'Submitted',
            claim.submittedDate ? format(new Date(claim.submittedDate), 'd MMM yyyy') : '—',
          ],
        ].map(([label, v]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold tabular-nums tracking-tight">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {claim.rejectionReason && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <span className="font-medium">Rejection reason:</span> {claim.rejectionReason}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bills on this claim</CardTitle>
        </CardHeader>
        <CardContent>
          {(claim.invoices || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No bills linked.</p>
          ) : (
            <ul className="divide-y">
              {claim.invoices.map((inv: any) => (
                <li key={inv.id}>
                  <Link
                    href={`/billing/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                  >
                    <span>
                      {inv.invoiceNo} · {format(new Date(inv.createdAt), 'd MMM yyyy')}
                    </span>
                    <span className="tabular-nums">{inr(inv.totalAmount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {claim.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{claim.notes}</CardContent>
        </Card>
      )}
    </div>
  )
}
