'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Edit, Loader2, Minus, Plus } from 'lucide-react'
import { labelFor } from '@/lib/labels'

const IN_TYPES = [
  { value: 'PURCHASE', label: 'Purchase / received' },
  { value: 'ADJUSTMENT_IN', label: 'Stock count correction (+)' },
]
const OUT_TYPES = [
  { value: 'CONSUMPTION', label: 'Used in clinic' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'RETURNED', label: 'Returned to supplier' },
  { value: 'ADJUSTMENT_OUT', label: 'Stock count correction (−)' },
]

export default function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<'in' | 'out' | null>(null)
  const [type, setType] = useState('PURCHASE')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/items/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Not found')
      setItem(json.data)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not load item', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
  }, [load])

  function openDialog(kind: 'in' | 'out') {
    setDialog(kind)
    setType(kind === 'in' ? 'PURCHASE' : 'CONSUMPTION')
    setQty('')
    setNote('')
  }

  async function saveMovement() {
    const quantity = Number(qty)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast({ variant: 'destructive', title: 'Enter a whole number above 0' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: id,
          type,
          quantity,
          transactionDate: new Date().toISOString(),
          notes: note || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save')
      toast({ title: 'Stock updated' })
      setDialog(null)
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
  if (!item) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Item not found</p>
        <Link href="/inventory">
          <Button variant="link">Back to inventory</Button>
        </Link>
      </div>
    )
  }

  const STATUS: Record<string, { label: string; variant: string }> = {
    out_of_stock: { label: 'Out of stock', variant: 'destructive' },
    low_stock: { label: 'Low stock', variant: 'warning' },
    reorder: { label: 'Reorder soon', variant: 'warning' },
    sufficient: { label: 'In stock', variant: 'success' },
  }
  const status = STATUS[item.stockStatus] || STATUS.sufficient

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="icon" aria-label="Back to inventory">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{item.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[item.sku, labelFor(item.itemType), item.categoryName, item.storageLocation]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Badge variant={status.variant as any}>{status.label}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openDialog('in')}>
            <Plus className="mr-2 h-4 w-4" /> Stock in
          </Button>
          <Button variant="outline" onClick={() => openDialog('out')}>
            <Minus className="mr-2 h-4 w-4" /> Stock used
          </Button>
          <Link href={`/inventory/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[
          ['In stock', `${item.currentStock} ${item.unit}`],
          ['Minimum', `${item.minimumStock} ${item.unit}`],
          ['Used, last 30 days', `${item.usageLast30Days} ${item.unit}`],
          ['Bought, last 30 days', `${item.purchasesLast30Days} ${item.unit}`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent stock movements</CardTitle>
          </CardHeader>
          <CardContent>
            {(item.recentTransactions || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No movements yet.</p>
            ) : (
              <ul className="divide-y">
                {item.recentTransactions.map((t: any) => {
                  const inbound = ['PURCHASE', 'ADJUSTMENT_IN'].includes(t.type)
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{labelFor(t.type)}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(t.transactionDate || t.createdAt), 'd MMM yyyy')}
                          {t.performedByName ? ` · ${t.performedByName}` : ''}
                          {t.notes ? ` · ${t.notes}` : ''}
                        </p>
                      </div>
                      <span
                        className={`tabular-nums font-medium ${inbound ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {inbound ? '+' : '−'}
                        {t.quantity}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Purchase price:</span> ₹
              {Number(item.purchasePrice || 0).toLocaleString('en-IN')}
            </p>
            <p>
              <span className="text-muted-foreground">GST:</span> {Number(item.taxPercentage || 0)}%
            </p>
            {item.supplierName && (
              <p>
                <span className="text-muted-foreground">Supplier:</span> {item.supplierName}
                {item.supplierPhone ? ` · ${item.supplierPhone}` : ''}
              </p>
            )}
            {item.description && <p className="text-muted-foreground">{item.description}</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'in' ? 'Stock in' : 'Stock used'}</DialogTitle>
            <DialogDescription>
              {item.name}: {item.currentStock} {item.unit} in stock now
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mv-type">Reason</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="mv-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(dialog === 'in' ? IN_TYPES : OUT_TYPES).map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mv-qty">Quantity ({item.unit})</Label>
              <Input
                id="mv-qty"
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mv-note">Note (optional)</Label>
              <Input id="mv-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveMovement} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
