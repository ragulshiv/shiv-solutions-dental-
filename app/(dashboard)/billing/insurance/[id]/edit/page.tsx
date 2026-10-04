'use client'

import { use } from 'react'
import { ClaimForm } from '@/components/billing/claim-form'

export default function EditClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ClaimForm claimId={id} />
}
