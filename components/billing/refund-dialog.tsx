'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Props {
  payment: { id: string; paymentNo?: string; amount: string | number } | null
  onClose: () => void
  onDone: () => void
}

/** Refund all or part of a payment (POST /api/payments/[id]/refund). */
export function RefundDialog({ payment, onClose, onDone }: Props) {
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (payment) {
      setAmount(String(Number(payment.amount)))
      setReason('')
    }
  }, [payment])

  async function submit() {
    if (!payment) return
    const value = Number(amount)
    if (!value || value <= 0 || value > Number(payment.amount)) {
      toast({
        variant: 'destructive',
        title: `Enter an amount between ₹1 and ₹${Number(payment.amount)}`,
      })
      return
    }
    if (!reason.trim()) {
      toast({ variant: 'destructive', title: 'Give a reason for the refund' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/payments/${payment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundAmount: value, refundReason: reason.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Refund failed')
      toast({ title: 'Refund recorded', description: `₹${value.toLocaleString('en-IN')} refunded` })
      onDone()
      onClose()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Not refunded', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            {payment?.paymentNo ? `${payment.paymentNo} · ` : ''}paid ₹
            {Number(payment?.amount || 0).toLocaleString('en-IN')}. The invoice balance is updated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Refund amount (₹)</Label>
            <Input
              id="refund-amount"
              type="number"
              min={1}
              max={Number(payment?.amount || 0)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason</Label>
            <Textarea
              id="refund-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Treatment not done, charged twice"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
