import { prisma } from '@/lib/prisma'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

/**
 * Another active booking for this doctor that overlaps [time, time + duration)
 * on the same day. Returns a ready-to-show message, or null when the slot is free.
 */
export async function findDoctorOverlap(opts: {
  hospitalId: string
  doctorId: string
  date: Date
  time: string
  duration: number
  excludeId?: string
}): Promise<string | null> {
  const sameDay = await prisma.appointment.findMany({
    where: {
      hospitalId: opts.hospitalId,
      doctorId: opts.doctorId,
      scheduledDate: opts.date,
      status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    select: {
      scheduledTime: true,
      duration: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  })
  const start = toMinutes(opts.time)
  const end = start + opts.duration
  const clash = (sameDay || []).find((a) => {
    const s = toMinutes(a.scheduledTime)
    return start < s + (a.duration || 30) && s < end
  })
  if (!clash) return null
  const who = clash.patient
    ? ` with ${clash.patient.firstName} ${clash.patient.lastName}`.trimEnd()
    : ''
  const exact = clash.scheduledTime === opts.time
  return exact
    ? 'Doctor already has an appointment at this time'
    : `Doctor is busy: ${fmt12(clash.scheduledTime)} (${clash.duration || 30} min)${who} overlaps this slot`
}

/**
 * Clinic hours check. Urgent bookings may fall outside hours (emergencies).
 * Returns a message when the time is outside, or null when it is fine.
 */
export async function outsideClinicHours(
  hospitalId: string,
  time: string,
  duration: number,
  priority?: string
): Promise<string | null> {
  if (priority === 'URGENT') return null
  let hours = { start: '09:00', end: '21:00' }
  try {
    const h = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { workingHours: true },
    })
    if (h?.workingHours) {
      const parsed =
        typeof h.workingHours === 'string' ? JSON.parse(h.workingHours) : h.workingHours
      if (parsed?.start && parsed?.end) hours = { start: parsed.start, end: parsed.end }
    }
  } catch {
    /* fall back to defaults */
  }
  const start = toMinutes(time)
  if (start < toMinutes(hours.start) || start + duration > toMinutes(hours.end)) {
    return `Outside clinic hours (${fmt12(hours.start)} – ${fmt12(hours.end)}). Mark it Urgent to book anyway.`
  }
  return null
}

/** Allowed next statuses. Finished visits can't silently go back to "Scheduled". */
const NEXT_STATUS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  CONFIRMED: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  CHECKED_IN: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CONFIRMED'],
  IN_PROGRESS: ['COMPLETED', 'CHECKED_IN'],
  COMPLETED: [],
  CANCELLED: ['SCHEDULED'],
  NO_SHOW: ['SCHEDULED', 'CHECKED_IN'],
  RESCHEDULED: [],
}

export function statusChangeError(from: string, to: string): string | null {
  if (from === to) return null
  const allowed = NEXT_STATUS[from]
  if (!allowed || allowed.includes(to)) return null
  const label = (s: string) => s.toLowerCase().replace(/_/g, ' ')
  return `A ${label(from)} appointment can't be changed to ${label(to)}`
}

/**
 * Today's date as stored in date-only columns (UTC midnight of the clinic's
 * local date). Avoids toISOString(), which gives yesterday before 5:30 AM IST.
 */
export function todayDateOnly(now = new Date()): Date {
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return new Date(`${ymd}T00:00:00.000Z`)
}

/** Next appointment number for today, e.g. APT202610040007. */
export async function generateAppointmentNo(hospitalId: string): Promise<string> {
  const today = new Date()
  const prefix = `APT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  const lastAppointment = await prisma.appointment.findFirst({
    where: {
      hospitalId,
      appointmentNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      appointmentNo: 'desc',
    },
  })

  if (lastAppointment) {
    const lastNumber = parseInt(lastAppointment.appointmentNo.slice(-4))
    return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`
  }

  return `${prefix}0001`
}
