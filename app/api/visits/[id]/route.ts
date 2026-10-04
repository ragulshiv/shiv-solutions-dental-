import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { patientAge } from '@/lib/patient-utils'

/**
 * GET /api/visits/[id]: everything the doctor's visit screen needs in one call.
 * [id] is the appointment id: a visit is an appointment the patient attended.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const visit = await prisma.appointment.findFirst({
      where: { id, hospitalId },
      include: {
        patient: { include: { medicalHistory: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
        treatments: {
          orderBy: { createdAt: 'asc' },
          include: { procedure: { select: { id: true, code: true, name: true } } },
        },
        prescriptions: {
          orderBy: { createdAt: 'asc' },
          include: { medications: true },
        },
      },
    })
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const patientId = visit.patientId
    const [plans, previousVisits, unbilled, due, nextVisit] = await Promise.all([
      prisma.treatmentPlan.findMany({
        where: {
          hospitalId,
          patientId,
          status: { in: ['DRAFT', 'PROPOSED', 'ACCEPTED', 'IN_PROGRESS'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            orderBy: { priority: 'asc' },
            include: { procedure: { select: { id: true, name: true, code: true } } },
          },
        },
      }),
      prisma.appointment.findMany({
        where: { hospitalId, patientId, id: { not: id }, status: 'COMPLETED' },
        orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
        take: 3,
        select: {
          id: true,
          scheduledDate: true,
          chiefComplaint: true,
          clinicalNotes: true,
          treatments: { select: { toothNumbers: true, procedure: { select: { name: true } } } },
        },
      }),
      prisma.treatment.count({
        where: {
          hospitalId,
          patientId,
          status: { in: ['COMPLETED', 'IN_PROGRESS'] },
          invoiceItems: { none: {} },
        },
      }),
      prisma.invoice.aggregate({
        where: { hospitalId, patientId, status: { notIn: ['CANCELLED', 'REFUNDED', 'DRAFT'] } },
        _sum: { balanceAmount: true },
      }),
      prisma.appointment.findFirst({
        where: {
          hospitalId,
          patientId,
          id: { not: id },
          scheduledDate: { gt: visit.scheduledDate },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        select: { id: true, scheduledDate: true, scheduledTime: true, appointmentType: true },
      }),
    ])

    return NextResponse.json({
      visit: {
        ...visit,
        patient: { ...visit.patient, age: patientAge(visit.patient) },
      },
      plans,
      previousVisits,
      unbilledCount: unbilled,
      balanceDue: Number(due._sum.balanceAmount ?? 0),
      nextVisit,
    })
  } catch (err) {
    console.error('Error loading visit:', err)
    return NextResponse.json({ error: 'Could not load the visit' }, { status: 500 })
  }
}
