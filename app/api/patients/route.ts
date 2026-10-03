import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole, checkPatientLimit } from '@/lib/api-helpers'
import {
  normalizePhone,
  patientAge,
  validatePatientInput,
  firstError,
  cleanMedicalHistory,
} from '@/lib/patient-utils'

// Generate unique patient ID for the hospital
async function generatePatientId(hospitalId: string): Promise<string> {
  const today = new Date()
  const prefix = `PAT${today.getFullYear()}`

  const lastPatient = await prisma.patient.findFirst({
    where: {
      hospitalId,
      patientId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      patientId: 'desc',
    },
  })

  const lastNumber = lastPatient?.patientId ? parseInt(lastPatient.patientId.slice(-5), 10) : NaN
  if (!isNaN(lastNumber)) {
    return `${prefix}${String(lastNumber + 1).padStart(5, '0')}`
  }

  return `${prefix}00001`
}

// GET - List patients
export async function GET(request: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const search = searchParams.get('search') || ''
    const all = searchParams.get('all') === 'true'

    const skip = (page - 1) * limit

    const where: any = {
      hospitalId,
      isActive: true,
    }

    const gender = searchParams.get('gender')
    if (gender && gender !== 'all') where.gender = gender
    const bloodGroup = searchParams.get('bloodGroup')
    if (bloodGroup && bloodGroup !== 'all') where.bloodGroup = bloodGroup

    // Exact phone lookup: used to show family members who share a number
    const phoneExact = searchParams.get('phone')
    if (phoneExact) where.phone = normalizePhone(phoneExact)

    if (search) {
      const term = search.trim()
      const digits = normalizePhone(term)
      const parts = term.split(/\s+/).filter(Boolean)
      where.OR = [
        { id: term },
        { patientId: { contains: term } },
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { phone: { contains: /^\d+$/.test(digits) ? digits : term } },
        { email: { contains: term } },
        // "Priya Sundaram" → first name + last name
        ...(parts.length > 1
          ? [
              {
                AND: [
                  { firstName: { contains: parts[0] } },
                  { lastName: { contains: parts.slice(1).join(' ') } },
                ],
              },
            ]
          : []),
      ]
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        select: {
          id: true,
          patientId: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          gender: true,
          age: true,
          dateOfBirth: true,
          bloodGroup: true,
          city: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: all ? undefined : skip,
        take: all ? undefined : limit,
      }),
      prisma.patient.count({ where }),
    ])

    return NextResponse.json({
      patients: patients.map((p) => ({ ...p, age: patientAge(p) })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
  }
}

// POST - Create new patient
export async function POST(request: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check patient limit
    const patientLimit = await checkPatientLimit(hospitalId)
    if (!patientLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Patient limit reached',
          message: `Your plan allows up to ${patientLimit.max} patients. Please upgrade to add more.`,
          current: patientLimit.current,
          max: patientLimit.max,
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { data, errors } = validatePatientInput(body, { partial: false })
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: firstError(errors), errors }, { status: 400 })
    }
    const medicalHistory = cleanMedicalHistory(body.medicalHistory)

    // Family members often share one mobile number, so a shared phone is allowed.
    // The form shows existing patients on that number before saving.

    // Generate patient ID for this hospital
    const firstPatientId = await generatePatientId(hospitalId)

    // Create patient with medical history
    let patient
    for (let attempt = 0; ; attempt++) {
      const patientId = attempt === 0 ? firstPatientId : await generatePatientId(hospitalId)
      try {
        patient = await prisma.patient.create({
          data: {
            ...data,
            patientId,
            hospitalId,
            medicalHistory: medicalHistory ? { create: medicalHistory } : undefined,
          } as any,
          include: { medicalHistory: true },
        })
        break
      } catch (e: any) {
        // Two receptionists saving at the same moment can collide on the number: retry
        if (e?.code === 'P2002' && attempt < 3) continue
        throw e
      }
    }

    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    console.error('Error creating patient:', error)
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
  }
}
