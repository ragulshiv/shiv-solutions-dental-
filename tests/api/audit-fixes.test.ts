// @ts-nocheck
/**
 * Regression tests for the October 2026 workflow audit (C1–C5, H5, H7, M4, M12).
 * Each test names the audit finding it guards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => {
  const model = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  })
  const prisma = {
    patient: model(),
    appointment: model(),
    staff: model(),
    procedure: model(),
    treatmentPlan: model(),
    treatmentPlanItem: model(),
    treatment: model(),
    invoice: model(),
    invoiceItem: model(),
    hospital: model(),
  }
  return { prisma, default: prisma }
})

vi.mock('@/lib/api-helpers', () => ({
  requireAuthAndRole: vi.fn(),
  checkPatientLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkStaffLimit: vi.fn().mockResolvedValue({ allowed: true }),
  requireRole: vi.fn(),
}))

vi.mock('@/lib/billing-utils', async (orig) => {
  const actual = await orig()
  return { ...actual, generateInvoiceNo: vi.fn().mockResolvedValue('INV-1') }
})

import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

const asRole = (role: string, hospitalId = 'h1') =>
  vi.mocked(requireAuthAndRole).mockImplementation(async (allowed?: string[]) => {
    if (allowed && !allowed.includes(role)) {
      return {
        error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        hospitalId: null,
        user: null,
        session: null,
      }
    }
    return {
      error: null,
      hospitalId,
      user: { id: 'u1', role },
      session: { user: { id: 'u1', role, hospitalId } },
    }
  })

const req = (url: string, method = 'GET', body?: any) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
  asRole('ADMIN')
})

describe('C2 · patient edits really save', () => {
  it('saves a changed age and clears a removed email', async () => {
    const { PUT } = await import('@/app/api/patients/[id]/route')
    prisma.patient.findFirst.mockResolvedValue({ id: 'p1', hospitalId: 'h1' })
    prisma.patient.update.mockResolvedValue({ id: 'p1' })

    const res = await PUT(
      req('/api/patients/p1', 'PUT', { age: '41', email: '', city: 'Madurai' }),
      params('p1')
    )
    expect(res.status).toBe(200)
    const data = prisma.patient.update.mock.calls[0][0].data
    expect(data.age).toBe(41)
    expect(data.email).toBeNull()
    expect(data.city).toBe('Madurai')
  })

  it('returns a plain message for a bad value instead of a database error', async () => {
    const { PUT } = await import('@/app/api/patients/[id]/route')
    prisma.patient.findFirst.mockResolvedValue({ id: 'p1', hospitalId: 'h1' })
    const res = await PUT(req('/api/patients/p1', 'PUT', { gender: 'banana' }), params('p1'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Gender must be Male, Female or Other')
    expect(prisma.patient.update).not.toHaveBeenCalled()
  })
})

describe('H7 · only admins can deactivate a patient', () => {
  it('blocks a receptionist', async () => {
    asRole('RECEPTIONIST')
    const { DELETE } = await import('@/app/api/patients/[id]/route')
    const res = await DELETE(req('/api/patients/p1', 'DELETE'), params('p1'))
    expect(res.status).toBe(403)
    expect(prisma.patient.update).not.toHaveBeenCalled()
  })
})

describe('C3 · a plan can repeat a procedure on different teeth', () => {
  it('creates the plan with two fillings', async () => {
    asRole('DOCTOR')
    const { POST } = await import('@/app/api/treatment-plans/route')
    prisma.patient.findFirst.mockResolvedValue({ id: 'p1' })
    prisma.procedure.findMany.mockResolvedValue([
      { id: 'fill', basePrice: 1500, defaultDuration: 30 },
    ])
    prisma.treatmentPlan.findFirst.mockResolvedValue(null)
    prisma.treatmentPlan.create.mockResolvedValue({ id: 'plan1' })

    const res = await POST(
      req('/api/treatment-plans', 'POST', {
        patientId: 'p1',
        title: 'Fillings',
        items: [
          { procedureId: 'fill', toothNumbers: '16' },
          { procedureId: 'fill', toothNumbers: '26' },
        ],
      })
    )
    expect(res.status).toBe(201)
  })
})

describe('C5 · staff pay and ID details are admin-only', () => {
  const staffRow = {
    id: 's1',
    firstName: 'Priya',
    lastName: 'Kumar',
    salary: 50000,
    bankAccountNo: '1234',
    bankIfsc: 'SBIN0001',
    aadharNumber: '999988887777',
    panNumber: 'ABCDE1234F',
    phone: '9876500000',
    user: { role: 'DOCTOR' },
  }

  it('hides them from a receptionist', async () => {
    asRole('RECEPTIONIST')
    const { GET } = await import('@/app/api/staff/route')
    prisma.staff.findMany.mockResolvedValue([staffRow])
    prisma.staff.count.mockResolvedValue(1)
    const body = await (await GET(req('/api/staff'))).json()
    const s = body.staff[0]
    expect(s.firstName).toBe('Priya')
    for (const f of ['salary', 'bankAccountNo', 'bankIfsc', 'aadharNumber', 'panNumber']) {
      expect(s[f]).toBeUndefined()
    }
  })

  it('shows them to an admin', async () => {
    const { GET } = await import('@/app/api/staff/route')
    prisma.staff.findMany.mockResolvedValue([staffRow])
    prisma.staff.count.mockResolvedValue(1)
    const body = await (await GET(req('/api/staff'))).json()
    expect(body.staff[0].salary).toBe(50000)
  })
})

describe('M4 / M12 · bill checks and doctors can bill', () => {
  it('rejects a discount over 100%', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    prisma.patient.findUnique.mockResolvedValue({ id: 'p1' })
    const res = await POST(
      req('/api/invoices', 'POST', {
        patientId: 'p1',
        items: [{ description: 'Scaling', quantity: 1, unitPrice: 1000 }],
        discountType: 'PERCENTAGE',
        discountValue: 150,
      })
    )
    expect(res.status).toBe(400)
  })

  it('refuses to bill the same treatment twice', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    prisma.patient.findUnique.mockResolvedValue({ id: 'p1' })
    prisma.invoiceItem.findFirst.mockResolvedValue({
      description: 'RCT 36',
      invoice: { invoiceNo: 'INV-9' },
    })
    const res = await POST(
      req('/api/invoices', 'POST', {
        patientId: 'p1',
        items: [{ treatmentId: 't1', description: 'RCT 36', quantity: 1, unitPrice: 8000 }],
      })
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('INV-9')
  })

  it('lets a doctor create a bill', async () => {
    asRole('DOCTOR')
    const { POST } = await import('@/app/api/invoices/route')
    prisma.patient.findUnique.mockResolvedValue(null) // stops after the permission check
    const res = await POST(
      req('/api/invoices', 'POST', {
        patientId: 'p1',
        items: [{ description: 'X', quantity: 1, unitPrice: 1 }],
      })
    )
    expect(res.status).not.toBe(403)
  })
})

describe('H3 · walk-in visit starts in one step', () => {
  it('books a walk-in for now with the logged-in doctor', async () => {
    asRole('DOCTOR')
    const { POST } = await import('@/app/api/visits/start/route')
    prisma.patient.findFirst.mockResolvedValue({ id: 'p1' })
    prisma.appointment.findFirst.mockResolvedValue(null)
    prisma.staff.findFirst.mockResolvedValue({ id: 'doc-1' })
    prisma.appointment.create.mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS' })

    const res = await POST(req('/api/visits/start', 'POST', { patientId: 'p1' }))
    expect(res.status).toBe(201)
    const data = prisma.appointment.create.mock.calls[0][0].data
    expect(data.doctorId).toBe('doc-1')
    expect(data.status).toBe('IN_PROGRESS')
  })

  it('is not available to a receptionist', async () => {
    asRole('RECEPTIONIST')
    const { POST } = await import('@/app/api/visits/start/route')
    const res = await POST(req('/api/visits/start', 'POST', { patientId: 'p1' }))
    expect(res.status).toBe(403)
  })
})

describe('H5 · plan progress follows the treatments', () => {
  it('marks the plan item done and completes the plan', async () => {
    const { syncPlanForTreatment } = await import('@/lib/plan-sync')
    prisma.treatmentPlanItem.findUnique.mockResolvedValue({
      id: 'item1',
      treatmentPlanId: 'plan1',
      treatment: { status: 'COMPLETED' },
    })
    prisma.treatmentPlan.findUnique.mockResolvedValue({
      status: 'ACCEPTED',
      items: [{ status: 'COMPLETED' }],
    })
    await syncPlanForTreatment('t1')
    expect(prisma.treatmentPlanItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
    )
    expect(prisma.treatmentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
    )
  })
})
