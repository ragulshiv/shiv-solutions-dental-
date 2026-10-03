'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Loader2, Mail, MapPin, Phone } from 'lucide-react'
import { labelFor } from '@/lib/labels'

const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [s, setS] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/inventory/suppliers/${id}`)
      .then((r) => r.json())
      .then((d) => setS(d.data || null))
      .catch(() => setS(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!s) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Supplier not found</p>
        <Link href="/inventory/suppliers">
          <Button variant="link">Back to suppliers</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/inventory/suppliers">
            <Button variant="ghost" size="icon" aria-label="Back to suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{s.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[s.code, s.contactPerson, s.gstNumber ? `GSTIN ${s.gstNumber}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Badge variant={s.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {labelFor(s.status)}
            </Badge>
          </div>
        </div>
        <Link href={`/inventory/suppliers/${id}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[
          ['Items supplied', s.itemsSupplied],
          ['Orders', s.totalOrders],
          ['Received value', inr(s.completedBusiness)],
          ['Pending orders', inr(s.pendingBusiness)],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> {s.phone}
              {s.alternatePhone ? ` / ${s.alternatePhone}` : ''}
            </p>
            {s.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> {s.email}
              </p>
            )}
            {(s.address || s.city) && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                {[s.address, s.city, s.state, s.pincode].filter(Boolean).join(', ')}
              </p>
            )}
            {s.paymentTerms && (
              <p className="text-muted-foreground">Payment terms: {s.paymentTerms}</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items from this supplier</CardTitle>
          </CardHeader>
          <CardContent>
            {(s.itemsSuppliedList || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No items have this supplier as preferred yet.
              </p>
            ) : (
              <ul className="divide-y">
                {s.itemsSuppliedList.map((it: any) => (
                  <li key={it.id}>
                    <Link
                      href={`/inventory/${it.id}`}
                      className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                    >
                      <span>
                        {it.name} <span className="text-muted-foreground">· {it.sku}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {it.currentStock} in stock · {inr(it.purchasePrice)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {(s.recentPurchaseOrders || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent purchase orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {s.recentPurchaseOrders.map((po: any) => (
                <li key={po.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {po.orderNumber} · {format(new Date(po.orderDate), 'd MMM yyyy')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{labelFor(po.status)}</Badge>
                    <span className="tabular-nums">{inr(po.totalAmount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
