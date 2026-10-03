'use client'

import { use } from 'react'
import { SupplierForm } from '@/components/inventory/supplier-form'

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <SupplierForm supplierId={id} />
}
