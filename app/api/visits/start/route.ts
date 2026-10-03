import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { generateAppointmentNo, todayDateOnly } from '@/lib/appointment-rules'

/**
 * POST /api/visits/start  { appointmentId? , patientId? , doctorId? }
 *
 * Opens the doctor's visit screen:
 * - with an appointmentId: checks the patient in if needed and marks it In progress
 * - with only a patientId: reuses today's open appointment, or creates a walk-in
 *   for right now (no slot needed: the patient is already in the chair)
 */
export async function POST(request: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { appointmentId, patientId } = body as { appointmentId?: string; patientId?: string }
    const now = new Date()

    let appointment = appointmentId
      ? await prisma.appointment.findFirst({ where: { id: appointmentId, hospitalId } })
      : null

    if (appointmentId && !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (!appointment) {
      if (!patientId) {
        return NextResponse.json({ error: 'Choose a patient to start a visit' }, { status: 400 })
      }
      const patient = await prisma.patient.findFirst({ where: { id: patientId, hospitalId } })
      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
      }
      appointment = await prisma.appointment.findFirst({
        where: {
          hospitalId,
          patientId,
          scheduledDate: todayDateOnly(now),
          status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
        },
        orderBy: { scheduledTime: 'asc' },
      })
    }

    if (appointment) {
      if (['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(appointment.status)) {
        // Finished visits open read-only on the visit screen; nothing to change
        return NextResponse.json({ id: appointment.id, status: appointment.status })
      }
      if (appointment.status !== 'IN_PROGRESS') {
        const data: Record<string, any> = { status: 'IN_PROGRESS' }
        if (!appointment.checkedInAt) {
          data.checkedInAt = now
          const scheduled = new Date(now)
          const [h, m] = appointment.scheduledTime.split(':').map(Number)
          scheduled.setHours(h, m, 0, 0)
          data.waitTime =
            now > scheduled ? Math.round((now.getTime() - scheduled.getTime()) / 60000) : 0
        }
        appointment = await prisma.appointment.update({ where: { id: appointment.id }, data })
      }
      return NextResponse.json({ id: appointment.id, status: appointment.status })
    }

    // Walk-in: book for now with the logged-in doctor (or the requested / first doctor)
    let doctorId: string | undefined = body.doctorId
    if (!doctorId && user?.role === 'DOCTOR') {
      const me = await prisma.staff.findFirst({
        where: { userId: user.id, hospitalId },
        select: { id: true },
      })
      doctorId = me?.id
    }
    if (!doctorId) {
      const firstDoctor = await prisma.staff.findFirst({
        where: { hospitalId, isActive: true, user: { role: 'DOCTOR' } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      doctorId = firstDoctor?.id
    }
    if (!doctorId) {
      return NextResponse.json(
        { error: 'Add a doctor under Staff before starting visits' },
        { status: 400 }
      )
    }

    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const created = await prisma.appointment.create({
      data: {
        hospitalId,
        appointmentNo: await generateAppointmentNo(hospitalId),
        patientId: patientId!,
        doctorId,
        scheduledDate: todayDateOnly(now),
        scheduledTime: time,
        duration: 30,
        appointmentType: 'CONSULTATION',
        status: 'IN_PROGRESS',
        checkedInAt: now,
        waitTime: 0,
        notes: 'Walk-in',
      },
    })
    return NextResponse.json({ id: created.id, status: created.status }, { status: 201 })
  } catch (err) {
    console.error('Error starting visit:', err)
    return NextResponse.json({ error: 'Could not start the visit' }, { status: 500 })
  }
}
