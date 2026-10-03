'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

const EMPTY = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  city: '',
  state: 'Tamil Nadu',
  pincode: '',
  gstNumber: '',
  panNumber: '',
  paymentTerms: '',
  creditLimit: '',
  status: 'ACTIVE',
  notes: '',
}

/** Add or edit a supplier. With `supplierId` it loads and updates that supplier. */
export function SupplierForm({ supplierId }: { supplierId?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!!supplierId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supplierId) return
    fetch(`/api/inventory/suppliers/${supplierId}`)
      .then((r) => r.json())
      .then((d) => {
        const s = d.data
        if (!s) throw new Error(d.error || 'Not found')
        setForm(
          Object.fromEntries(
            Object.keys(EMPTY).map((k) => [k, s[k] == null ? '' : String(s[k])])
          ) as typeof EMPTY
        )
      })
      .catch((e) =>
        toast({ variant: 'destructive', title: 'Could not load supplier', description: e.message })
      )
      .finally(() => setLoading(false))
  }, [supplierId, toast])

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const back = supplierId ? `/inventory/suppliers/${supplierId}` : '/inventory/suppliers'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim() || !form.phone.trim()) {
      toast({ variant: 'destructive', title: 'Code, name and phone are required' })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, any> = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [
          k,
          typeof v === 'string' && v.trim() === '' ? null : v,
        ])
      )
      payload.code = form.code.trim()
      payload.name = form.name.trim()
      payload.phone = form.phone.trim()
      payload.creditLimit = form.creditLimit === '' ? null : Number(form.creditLimit)
      const res = await fetch(
        supplierId ? `/api/inventory/suppliers/${supplierId}` : '/api/inventory/suppliers',
        {
          method: supplierId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) throw new Error(json.error || 'Could not save')
      toast({ title: supplierId ? 'Supplier updated' : 'Supplier added' })
      router.push(supplierId ? back : json.data?.id ? `/inventory/suppliers/${json.data.id}` : back)
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

  const field = (k: keyof typeof EMPTY, label: string, extra: any = {}) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={form[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={back}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {supplierId ? 'Edit supplier' : 'New supplier'}
        </h1>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field('code', 'Code *', { placeholder: 'e.g. SUP003' })}
            {field('name', 'Name *', { placeholder: 'e.g. Chennai Dental Supplies' })}
            {field('contactPerson', 'Contact person')}
            {field('phone', 'Phone *', { inputMode: 'tel' })}
            {field('alternatePhone', 'Alternate phone', { inputMode: 'tel' })}
            {field('email', 'Email', { type: 'email' })}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Address and tax</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
            {field('city', 'City')}
            {field('state', 'State')}
            {field('pincode', 'Pincode', { inputMode: 'numeric' })}
            {field('gstNumber', 'GSTIN')}
            {field('panNumber', 'PAN')}
            {field('paymentTerms', 'Payment terms', { placeholder: 'e.g. 30 days' })}
            {field('creditLimit', 'Credit limit (₹)', { type: 'number', min: 0 })}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
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
            {supplierId ? 'Save changes' : 'Add supplier'}
          </Button>
        </div>
      </form>
    </div>
  )
}
