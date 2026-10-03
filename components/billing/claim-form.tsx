'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { PatientPicker, type PickedPatient } from '@/components/patients/patient-picker'

const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/** New insurance claim, or edit a draft / submitted claim (`claimId`). */
export function ClaimForm({ claimId }: { claimId?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [patient, setPatient] = useState<PickedPatient | null>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [provider, setProvider] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(!!claimId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!claimId) return
    fetch(`/api/insurance-claims/${claimId}`)
      .then((r) => r.json())
      .then((c) => {
        if (!c?.id) throw new Error(c?.error || 'Not found')
        setPatient(c.patient)
        setProvider(c.insuranceProvider || '')
        setPolicyNumber(c.policyNumber || '')
        setAmount(String(Number(c.claimAmount || 0)))
        setNotes(c.notes || '')
      })
      .catch((e) =>
        toast({ variant: 'destructive', title: 'Could not load claim', description: e.message })
      )
      .finally(() => setLoading(false))
  }, [claimId, toast])

  // A new claim: load the patient's policies and bills to claim against
  useEffect(() => {
    if (!patient || claimId) return
    fetch(`/api/patients/${patient.id}/insurance`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const active = (Array.isArray(list) ? list : []).filter((p: any) => p.isActive !== false)
        setPolicies(active)
        if (active[0]) {
          setProvider(active[0].provider?.name || '')
          setPolicyNumber(active[0].policyNumber || '')
        }
      })
      .catch(() => setPolicies([]))
    fetch(`/api/invoices?patientId=${patient.id}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.invoices || d.data || []).filter(
          (i: any) => !['CANCELLED', 'DRAFT'].includes(i.status)
        )
        setInvoices(list)
      })
      .catch(() => setInvoices([]))
  }, [patient, claimId])

  useEffect(() => {
    if (claimId) return
    const total = invoices
      .filter((i) => selectedInvoices.includes(i.id))
      .reduce((s, i) => s + Number(i.totalAmount || 0), 0)
    if (total > 0) setAmount(String(total))
  }, [selectedInvoices, invoices, claimId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient || !provider.trim() || !policyNumber.trim() || !(Number(amount) > 0)) {
      toast({
        variant: 'destructive',
        title: 'Patient, insurer, policy number and amount are required',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        claimId ? `/api/insurance-claims/${claimId}` : '/api/insurance-claims',
        {
          method: claimId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: patient.id,
            insuranceProvider: provider.trim(),
            policyNumber: policyNumber.trim(),
            claimAmount: Number(amount),
            invoiceIds: claimId ? undefined : selectedInvoices,
            notes: notes || null,
          }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save the claim')
      toast({ title: claimId ? 'Claim updated' : 'Claim created' })
      router.push(`/billing/insurance/${claimId || json.id}`)
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

  const back = claimId ? `/billing/insurance/${claimId}` : '/billing/insurance'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={back}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {claimId ? 'Edit insurance claim' : 'New insurance claim'}
        </h1>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent>
            {claimId ? (
              <p className="font-medium">
                {patient?.firstName} {patient?.lastName}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  · {patient?.patientId}
                </span>
              </p>
            ) : (
              <PatientPicker value={patient} onChange={setPatient} allowCreate={false} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy</CardTitle>
            {!claimId && patient && policies.length === 0 && (
              <CardDescription>
                No saved policy for this patient. Type the insurer and policy number, or add the
                policy on the patient&apos;s Insurance tab.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {policies.length > 1 && (
              <div className="space-y-2 md:col-span-2">
                <Label>Saved policies</Label>
                <div className="flex flex-wrap gap-2">
                  {policies.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={policyNumber === p.policyNumber ? 'default' : 'outline'}
                      onClick={() => {
                        setProvider(p.provider?.name || '')
                        setPolicyNumber(p.policyNumber)
                      }}
                    >
                      {p.provider?.name} · {p.policyNumber}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="provider">Insurer *</Label>
              <Input id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyNumber">Policy number *</Label>
              <Input
                id="policyNumber"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {!claimId && invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bills to claim</CardTitle>
              <CardDescription>Ticked bills set the claim amount.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.map((inv) => (
                <label
                  key={inv.id}
                  className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={selectedInvoices.includes(inv.id)}
                    onCheckedChange={(c) =>
                      setSelectedInvoices((s) =>
                        c === true ? [...s, inv.id] : s.filter((x) => x !== inv.id)
                      )
                    }
                  />
                  <span className="flex-1">{inv.invoiceNo}</span>
                  <span className="tabular-nums">{inr(inv.totalAmount)}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Claim amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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

        <div className="flex justify-end gap-3">
          <Link href={back}>
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
            {claimId ? 'Save changes' : 'Create claim'}
          </Button>
        </div>
      </form>
    </div>
  )
}
