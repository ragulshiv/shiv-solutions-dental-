'use client'

import { use } from 'react'
import { LabOrderDetail } from '@/components/lab/lab-order-detail'

export default function LabOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <LabOrderDetail orderId={id} />
}
