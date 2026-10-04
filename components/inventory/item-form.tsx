'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

const ITEM_TYPES = [
  { value: 'DENTAL_MATERIAL', label: 'Dental material' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'INSTRUMENT', label: 'Instrument' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OFFICE_SUPPLY', label: 'Office supply' },
]

const EMPTY = {
  sku: '',
  name: '',
  categoryId: '',
  itemType: 'DENTAL_MATERIAL',
  description: '',
  unit: '',
  currentStock: '0',
  minimumStock: '0',
  reorderLevel: '0',
  maximumStock: '',
  purchasePrice: '0',
  sellingPrice: '0',
  hsnCode: '',
  taxPercentage: '0',
  preferredSupplierId: '',
  storageLocation: '',
  expiryTracking: false,
  batchTracking: false,
  isActive: true,
  notes: '',
}

/** Add or edit a stock item. With `itemId` it loads the item and saves changes. */
export function InventoryItemForm({ itemId }: { itemId?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [categories, setCategories] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(!!itemId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []))
      .catch(() => {})
    fetch('/api/inventory/suppliers?status=active')
      .then((r) => r.json())
      .then((d) => setSuppliers(d.data || []))
      .catch(() => {})
    if (itemId) {
      fetch(`/api/inventory/items/${itemId}`)
        .then((r) => r.json())
        .then((d) => {
          const it = d.data
          if (!it) throw new Error(d.error || 'Not found')
          setForm({
            ...EMPTY,
            ...Object.fromEntries(
              Object.keys(EMPTY).map((k) => {
                const v = it[k]
                const base = (EMPTY as any)[k]
                if (typeof base === 'boolean') return [k, !!v]
                return [k, v == null ? '' : String(v)]
              })
            ),
          } as typeof EMPTY)
        })
        .catch((e) =>
          toast({ variant: 'destructive', title: 'Could not load item', description: e.message })
        )
        .finally(() => setLoading(false))
    }
  }, [itemId, toast])

  const set = (k: keyof typeof EMPTY, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const num = (v: string) => (v === '' ? 0 : Number(v))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.sku.trim() || !form.name.trim() || !form.unit.trim()) {
      toast({ variant: 'destructive', title: 'Item code, name and unit are required' })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        ...form,
        sku: form.sku.trim(),
        name: form.name.trim(),
        unit: form.unit.trim(),
        minimumStock: num(form.minimumStock),
        reorderLevel: num(form.reorderLevel),
        maximumStock: form.maximumStock === '' ? null : num(form.maximumStock),
        purchasePrice: num(form.purchasePrice),
        sellingPrice: num(form.sellingPrice),
        taxPercentage: num(form.taxPercentage),
        categoryId: form.categoryId || null,
        preferredSupplierId: form.preferredSupplierId || null,
      }
      // Stock changes go through Stock in / Stock used so there is a record
      if (itemId) delete payload.currentStock
      else payload.currentStock = num(form.currentStock)

      const res = await fetch(itemId ? `/api/inventory/items/${itemId}` : '/api/inventory/items', {
        method: itemId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false)
        throw new Error(json.error || 'Could not save the item')
      toast({ title: itemId ? 'Item updated' : 'Item added' })
      router.push(itemId ? `/inventory/${itemId}` : '/inventory')
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
      <Input id={k} value={form[k] as string} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={itemId ? `/inventory/${itemId}` : '/inventory'}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {itemId ? 'Edit stock item' : 'New stock item'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {itemId
              ? 'To change the quantity, use Stock in / Stock used on the item page.'
              : 'Add something the clinic keeps in stock.'}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Item</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field('sku', 'Item code *', { placeholder: 'e.g. ITM015' })}
            {field('name', 'Name *', { placeholder: 'e.g. Lignocaine 2% cartridge' })}
            <div className="space-y-2">
              <Label htmlFor="itemType">Type</Label>
              <Select value={form.itemType} onValueChange={(v) => set('itemType', v)}>
                <SelectTrigger id="itemType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={form.categoryId || 'none'}
                onValueChange={(v) => set('categoryId', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field('unit', 'Unit *', { placeholder: 'e.g. box, cartridge, syringe' })}
            {field('storageLocation', 'Stored at', { placeholder: 'e.g. Cabinet B, shelf 2' })}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock levels</CardTitle>
            <CardDescription>
              You get a low-stock alert when stock reaches the minimum.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {!itemId && field('currentStock', 'Opening stock', { type: 'number', min: 0 })}
            {field('minimumStock', 'Minimum', { type: 'number', min: 0 })}
            {field('reorderLevel', 'Reorder at', { type: 'number', min: 0 })}
            {field('maximumStock', 'Maximum', { type: 'number', min: 0, placeholder: 'Optional' })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price and supplier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field('purchasePrice', 'Purchase price (₹)', { type: 'number', min: 0, step: '0.01' })}
            {field('sellingPrice', 'Selling price (₹)', { type: 'number', min: 0, step: '0.01' })}
            {field('hsnCode', 'HSN code', { placeholder: 'Optional' })}
            {field('taxPercentage', 'GST %', { type: 'number', min: 0, max: 28, step: '0.01' })}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="preferredSupplierId">Preferred supplier</Label>
              <Select
                value={form.preferredSupplierId || 'none'}
                onValueChange={(v) => set('preferredSupplierId', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="preferredSupplierId">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preferred supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            {(
              [
                ['expiryTracking', 'Track expiry dates'],
                ['batchTracking', 'Track batch numbers'],
                ['isActive', 'Item in use'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3">
                <Switch checked={form[k] as boolean} onCheckedChange={(v) => set(k, v)} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
            <div className="space-y-2">
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
          <Link href={itemId ? `/inventory/${itemId}` : '/inventory'}>
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
            {itemId ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </form>
    </div>
  )
}
