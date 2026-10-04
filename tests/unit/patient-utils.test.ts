import { describe, it, expect } from 'vitest'
import {
  normalizePhone,
  isValidPhone,
  calcAge,
  patientAge,
  validatePatientInput,
  medicalAlerts,
  cleanMedicalHistory,
} from '@/lib/patient-utils'

describe('normalizePhone', () => {
  it('strips +91, 0, spaces and dashes', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210')
    expect(normalizePhone('919876543210')).toBe('9876543210')
    expect(normalizePhone('09876543210')).toBe('9876543210')
    expect(normalizePhone('98765-43210')).toBe('9876543210')
  })

  it('accepts only 10-digit mobiles starting 6–9', () => {
    expect(isValidPhone('9876543210')).toBe(true)
    expect(isValidPhone('1234567890')).toBe(false)
    expect(isValidPhone('abc12')).toBe(false)
  })
})

describe('calcAge / patientAge', () => {
  const now = new Date('2026-10-04T10:00:00')
  it('counts whole years, before and after the birthday', () => {
    expect(calcAge('1990-03-12', now)).toBe(36)
    expect(calcAge('1990-12-25', now)).toBe(35)
  })
  it('prefers the date of birth over a stored age', () => {
    expect(patientAge({ dateOfBirth: '2000-01-01', age: 5 })).toBeGreaterThan(20)
    expect(patientAge({ dateOfBirth: null, age: 40 })).toBe(40)
    expect(patientAge({})).toBeNull()
  })
})

describe('validatePatientInput (create)', () => {
  it('accepts a single-name patient (last name optional)', () => {
    const { data, errors } = validatePatientInput(
      { firstName: 'Murugan', phone: '9876543210' },
      { partial: false }
    )
    expect(errors).toEqual({})
    expect(data.firstName).toBe('Murugan')
    expect(data.lastName).toBe('')
  })

  it('rejects bad phone, email, future DOB and impossible ages', () => {
    const { errors } = validatePatientInput(
      {
        firstName: 'Test',
        phone: 'abc12',
        email: 'not-an-email',
        dateOfBirth: '2999-01-01',
      },
      { partial: false }
    )
    expect(errors.phone).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.dateOfBirth).toBeDefined()

    expect(
      validatePatientInput({ firstName: 'A', phone: '9876543210', age: -5 }, { partial: false })
        .errors.age
    ).toBeDefined()
    expect(
      validatePatientInput({ firstName: 'A'.repeat(300), phone: '9876543210' }, { partial: false })
        .errors.firstName
    ).toBeDefined()
  })

  it('derives age from date of birth so they can never disagree', () => {
    const { data } = validatePatientInput(
      { firstName: 'Lakshmi', phone: '9876543210', dateOfBirth: '1985-06-15', age: 20 },
      { partial: false }
    )
    expect(data.age).toBe(calcAge('1985-06-15'))
    expect(data.age).not.toBe(20)
  })

  it('accepts short blood groups', () => {
    expect(
      validatePatientInput(
        { firstName: 'A', phone: '9876543210', bloodGroup: 'O+' },
        { partial: false }
      ).data.bloodGroup
    ).toBe('O_POSITIVE')
    expect(
      validatePatientInput(
        { firstName: 'A', phone: '9876543210', bloodGroup: 'AB-' },
        { partial: false }
      ).data.bloodGroup
    ).toBe('AB_NEGATIVE')
  })
})

describe('validatePatientInput (update)', () => {
  it('only touches fields that were sent, and blanks clear a field', () => {
    const { data, errors } = validatePatientInput(
      { email: '', city: 'Madurai', age: '41' },
      { partial: true }
    )
    expect(errors).toEqual({})
    expect(data).toEqual({ email: null, city: 'Madurai', age: 41 })
    expect('firstName' in data).toBe(false)
  })
})

describe('medical history helpers', () => {
  it('lists alerts for ticked conditions, with the allergy named', () => {
    expect(
      medicalAlerts({ hasDiabetes: true, hasAllergies: true, drugAllergies: 'Penicillin' })
    ).toEqual(['Diabetes', 'Allergy: Penicillin'])
    expect(medicalAlerts(null)).toEqual([])
  })

  it('keeps only known fields', () => {
    expect(cleanMedicalHistory({ hasDiabetes: 1, bogus: true, drugAllergies: '  ' })).toEqual({
      hasDiabetes: true,
      drugAllergies: null,
    })
  })
})
