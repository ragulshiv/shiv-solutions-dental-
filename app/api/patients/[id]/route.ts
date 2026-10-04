import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  validatePatientInput,
  firstError,
  cleanMedicalHistory,
  patientAge,
} from '@/lib/patient-utils'
import { todayDateOnly } from '@/lib/appointment-rules'

// GET /api/patients/[id] - Get a specific patient with all details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const patient = await prisma.patient.findFirst({
      where: { id, hospitalId },
      include: {
        medicalHistory: true,
        appointments: {
          take: 10,
          orderBy: { scheduledDate: 'desc' },
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        treatments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            procedure: {
              select: {
                name: true,
                category: true,
              },
            },
            doctor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            payments: true,
          },
        },
        documents: {
          where: { isArchived: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        dentalChart: true,
        prescriptions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { select: { firstName: true, lastName: true } },
            medications: {
              select: { medicationName: true, dosage: true, frequency: true, duration: true },
            },
          },
        },
        treatmentPlans: {
          where: { status: { notIn: ['CANCELLED', 'COMPLETED'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            planNumber: true,
            title: true,
            status: true,
            estimatedCost: true,
            items: { select: { status: true } },
          },
        },
        _count: {
          select: {
            appointments: true,
            treatments: true,
            invoices: true,
            documents: true,
          },
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Money still owed across all bills, and today's visit (for "Open visit")
    // Extras for the profile header; never let them block loading the patient
    const [due, today] = await (async () => {
      try {
        return await Promise.all([
          prisma.invoice.aggregate({
            where: {
              hospitalId,
              patientId: id,
              status: { notIn: ['CANCELLED', 'REFUNDED', 'DRAFT'] },
            },
            _sum: { balanceAmount: true },
          }),
          prisma.appointment.findFirst({
            where: {
              hospitalId,
              patientId: id,
              scheduledDate: todayDateOnly(),
              status: { in: ['CHECKED_IN', 'IN_PROGRESS', 'SCHEDULED', 'CONFIRMED'] },
            },
            orderBy: { scheduledTime: 'asc' },
            select: { id: true, status: true, scheduledTime: true },
          }),
        ])
      } catch {
        return [null, null] as const
      }
    })()

    return NextResponse.json({
      success: true,
      patient: {
        ...patient,
        age: patientAge(patient),
        balanceDue: Number(due?._sum?.balanceAmount ?? 0),
        todayAppointment: today ?? null,
      },
    })
  } catch (error: any) {
    console.error('Error fetching patient:', error)
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 })
  }
}

// PUT /api/patients/[id] - Update a patient
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    // Check if patient exists and belongs to this hospital
    const existingPatient = await prisma.patient.findFirst({
      where: { id, hospitalId },
    })

    if (!existingPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Only keys present in the body change; '' or null clears a field.
    const { data, errors } = validatePatientInput(body, { partial: true })
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: firstError(errors), errors }, { status: 400 })
    }
    const medicalHistory = cleanMedicalHistory(body.medicalHistory)

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        ...(medicalHistory
          ? { medicalHistory: { upsert: { create: medicalHistory, update: medicalHistory } } }
          : {}),
        // Clear cached AI summary so it regenerates on next view
        aiSummary: Prisma.JsonNull,
        aiSummaryAt: null,
      } as any,
      include: { medicalHistory: true },
    })

    return NextResponse.json({
      success: true,
      patient,
    })
  } catch (error: any) {
    console.error('Error updating patient:', error)
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 })
  }
}

// DELETE /api/patients/[id] - Soft delete a patient
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Deactivating a patient also cancels their bookings: clinic admins only
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const patient = await prisma.patient.findFirst({
      where: { id, hospitalId },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Cancel any pending/scheduled appointments for this patient
    await prisma.appointment.updateMany({
      where: {
        patientId: id,
        hospitalId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      data: {
        status: 'CANCELLED',
        notes: 'Auto-cancelled: Patient deactivated',
      },
    })

    // Soft delete
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Patient deactivated successfully',
    })
  } catch (error: any) {
    console.error('Error deleting patient:', error)
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 })
  }
}
