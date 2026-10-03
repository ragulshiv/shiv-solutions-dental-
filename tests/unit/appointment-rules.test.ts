// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: vi.fn(), findFirst: vi.fn() },
    hospital: { findUnique: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  findDoctorOverlap,
  outsideClinicHours,
  statusChangeError,
  todayDateOnly,
} from '@/lib/appointment-rules'

const base = { hospitalId: 'h1', doctorId: 'd1', date: new Date('2030-06-15') }

describe('findDoctorOverlap', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flags a booking that overlaps an existing one (10:15 inside 10:00–10:30)', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { scheduledTime: '10:00', duration: 30, patient: { firstName: 'Ravi', lastName: 'K' } },
    ])
    const msg = await findDoctorOverlap({ ...base, time: '10:15', duration: 30 })
    expect(msg).toContain('overlaps')
  })

  it('allows back-to-back slots', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ scheduledTime: '10:00', duration: 30 }])
    expect(await findDoctorOverlap({ ...base, time: '10:30', duration: 30 })).toBeNull()
  })

  it('gives the classic message for the exact same time', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ scheduledTime: '10:00', duration: 30 }])
    expect(await findDoctorOverlap({ ...base, time: '10:00', duration: 15 })).toBe(
      'Doctor already has an appointment at this time'
    )
  })
})

describe('outsideClinicHours', () => {
  it('blocks 3 AM but lets urgent bookings through', async () => {
    prisma.hospital.findUnique.mockResolvedValue(null)
    expect(await outsideClinicHours('h1', '03:00', 30)).toContain('Outside clinic hours')
    expect(await outsideClinicHours('h1', '03:00', 30, 'URGENT')).toBeNull()
    expect(await outsideClinicHours('h1', '10:00', 30)).toBeNull()
  })
})

describe('statusChangeError', () => {
  it('stops a completed visit going back to scheduled', () => {
    expect(statusChangeError('COMPLETED', 'SCHEDULED')).toMatch(/can't be changed/)
    expect(statusChangeError('SCHEDULED', 'CONFIRMED')).toBeNull()
    expect(statusChangeError('CHECKED_IN', 'COMPLETED')).toBeNull()
  })
})

describe('todayDateOnly', () => {
  it('uses the local date, even just after midnight in India', () => {
    const justAfterMidnight = new Date(2026, 9, 4, 0, 30)
    expect(todayDateOnly(justAfterMidnight).toISOString()).toBe('2026-10-04T00:00:00.000Z')
  })
})
