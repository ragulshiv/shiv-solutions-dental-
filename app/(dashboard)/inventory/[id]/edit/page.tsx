'use client'

import { use } from 'react'
import { InventoryItemForm } from '@/components/inventory/item-form'

export default function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <InventoryItemForm itemId={id} />
}
