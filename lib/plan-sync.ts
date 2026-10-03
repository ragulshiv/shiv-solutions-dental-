import { prisma } from '@/lib/prisma'

const ITEM_STATUS_FOR_TREATMENT: Record<string, string> = {
  PLANNED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'PENDING', // treatment dropped: the plan item is still to be done
}

/**
 * Keep a treatment plan in step with the treatments that carry it out.
 * Call after a treatment is created or changes status. Safe to call for
 * treatments that are not linked to any plan (does nothing).
 */
export async function syncPlanForTreatment(treatmentId: string): Promise<void> {
  const item = await prisma.treatmentPlanItem.findUnique({
    where: { treatmentId },
    select: { id: true, treatmentPlanId: true, treatment: { select: { status: true } } },
  })
  if (!item?.treatment) return

  const itemStatus = ITEM_STATUS_FOR_TREATMENT[item.treatment.status] ?? 'IN_PROGRESS'
  await prisma.treatmentPlanItem.update({
    where: { id: item.id },
    data: {
      status: itemStatus as any,
      // A cancelled treatment frees the item so it can be done again later
      ...(item.treatment.status === 'CANCELLED' ? { treatmentId: null } : {}),
    },
  })
  await syncPlanStatus(item.treatmentPlanId)
}

/** Move the plan to In progress / Completed based on its items. */
export async function syncPlanStatus(planId: string): Promise<void> {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
    select: { status: true, items: { select: { status: true } } },
  })
  if (!plan || plan.status === 'CANCELLED') return

  const active = plan.items.filter((i) => i.status !== 'CANCELLED')
  const allDone = active.length > 0 && active.every((i) => i.status === 'COMPLETED')
  const anyStarted = active.some((i) => i.status !== 'PENDING')

  let next = plan.status as string
  if (allDone) next = 'COMPLETED'
  else if (anyStarted) next = 'IN_PROGRESS'
  else if (plan.status === 'COMPLETED') next = 'IN_PROGRESS'

  if (next !== plan.status) {
    await prisma.treatmentPlan.update({
      where: { id: planId },
      data: {
        status: next as any,
        ...(next === 'COMPLETED' ? { completedDate: new Date() } : {}),
      },
    })
  }
}
