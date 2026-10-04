'use client'

import { use } from 'react'
import { LabOrderDetail } from '@/components/lab/lab-order-detail'

// Editing happens on the order page itself; this route keeps old links working.
export default function EditLabOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <LabOrderDetail orderId={id} startEditing />
}
