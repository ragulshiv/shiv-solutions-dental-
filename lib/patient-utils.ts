/**
 * Patient field rules shared by the API (create / update) and the forms.
 * Keep validation here so the screen and the server never disagree.
 */

export const NAME_MAX = 100

/** Strip spaces/dashes and a leading +91 / 91 / 0 from an Indian mobile number. */
export function normalizePhone(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let p = raw.replace(/[\s\-().]/g, '')
  if (p.startsWith('+91')) p = p.slice(3)
  else if (p.length === 12 && p.startsWith('91')) p = p.slice(2)
  else if (p.length === 11 && p.startsWith('0')) p = p.slice(1)
  return p
}

export function isValidPhone(p: string): boolean {
  return /^[6-9]\d{9}$/.test(p)
}

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
}

/** Whole years between dob and today (or `now`). */
export function calcAge(dob: string | Date | null | undefined, now = new Date()): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

/** Age to display: live from DOB when known, otherwise the stored age. */
export function patientAge(p: {
  dateOfBirth?: string | Date | null
  age?: number | null
}): number | null {
  return calcAge(p.dateOfBirth) ?? (typeof p.age === 'number' ? p.age : null)
}

export function patientFullName(p: {
  firstName?: string | null
  lastName?: string | null
}): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
}

/** Medical-history booleans offered as quick tick-boxes, in display order. */
export const MEDICAL_FLAGS = [
  { key: 'hasDiabetes', label: 'Diabetes' },
  { key: 'hasHypertension', label: 'High BP' },
  { key: 'hasHeartDisease', label: 'Heart disease' },
  { key: 'hasBleedingDisorder', label: 'Bleeding disorder / blood thinners' },
  { key: 'hasAllergies', label: 'Allergies' },
  { key: 'isPregnant', label: 'Pregnant' },
  { key: 'hasAsthma', label: 'Asthma' },
  { key: 'hasThyroid', label: 'Thyroid' },
  { key: 'hasEpilepsy', label: 'Epilepsy' },
  { key: 'hasHepatitis', label: 'Hepatitis' },
  { key: 'hasHiv', label: 'HIV' },
] as const

export const MEDICAL_TEXT_FIELDS = [
  'drugAllergies',
  'currentMedications',
  'otherConditions',
] as const

export type MedicalHistoryInput = Partial<
  Record<(typeof MEDICAL_FLAGS)[number]['key'], boolean> &
    Record<(typeof MEDICAL_TEXT_FIELDS)[number], string | null>
>

/** Short alert labels for the red chips on patient header / queue / visit. */
export function medicalAlerts(mh: Record<string, any> | null | undefined): string[] {
  if (!mh) return []
  const out: string[] = MEDICAL_FLAGS.filter((f) => mh[f.key]).map((f) =>
    f.key === 'hasAllergies' && mh.drugAllergies ? `Allergy: ${mh.drugAllergies}` : f.label
  )
  return out
}

/** Keep only known medical-history keys with the right types. */
export function cleanMedicalHistory(input: unknown): MedicalHistoryInput | undefined {
  if (!input || typeof input !== 'object') return undefined
  const src = input as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const f of MEDICAL_FLAGS) if (f.key in src) out[f.key] = Boolean(src[f.key])
  for (const k of MEDICAL_TEXT_FIELDS) {
    if (k in src) {
      const v = typeof src[k] === 'string' ? (src[k] as string).trim() : ''
      out[k] = v ? v.slice(0, 2000) : null
    }
  }
  return out as MedicalHistoryInput
}

const OPTIONAL_TEXT = [
  'alternatePhone',
  'email',
  'address',
  'city',
  'state',
  'pincode',
  'aadharNumber',
  'occupation',
  'referredBy',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
] as const

const GENDERS = ['MALE', 'FEMALE', 'OTHER']
const BLOOD_GROUPS = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
]

export interface PatientValidation {
  data: Record<string, any>
  errors: Record<string, string>
}

/**
 * Validate and normalise a patient payload.
 * - `partial: false` (create): firstName + phone are required.
 * - `partial: true` (update): only keys present in the body are touched;
 *   an empty string or null CLEARS that field (so staff can remove values).
 */
export function validatePatientInput(
  body: Record<string, any>,
  { partial }: { partial: boolean }
): PatientValidation {
  const data: Record<string, any> = {}
  const errors: Record<string, string> = {}
  const has = (k: string) => k in body
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

  if (!partial || has('firstName')) {
    const v = str(body.firstName)
    if (!v) errors.firstName = 'First name is required'
    else if (v.length > NAME_MAX)
      errors.firstName = `First name must be ${NAME_MAX} characters or fewer`
    else data.firstName = v
  }
  if (!partial || has('lastName')) {
    const v = str(body.lastName)
    if (v.length > NAME_MAX) errors.lastName = `Last name must be ${NAME_MAX} characters or fewer`
    else data.lastName = v // optional: single-name patients are common
  }
  if (!partial || has('phone')) {
    const v = normalizePhone(body.phone)
    if (!v) errors.phone = 'Mobile number is required'
    else if (!isValidPhone(v)) errors.phone = 'Enter a 10-digit mobile number starting with 6–9'
    else data.phone = v
  }

  for (const k of OPTIONAL_TEXT) {
    if (!has(k)) continue
    let v = str(body[k])
    if (!v) {
      data[k] = null
      continue
    }
    if (k === 'alternatePhone' || k === 'emergencyContactPhone') {
      v = normalizePhone(v)
      if (!isValidPhone(v)) {
        errors[k] = 'Enter a 10-digit mobile number starting with 6–9'
        continue
      }
    }
    if (k === 'email') {
      v = v.toLowerCase()
      if (!isValidEmail(v)) {
        errors.email = 'Enter a valid email address, like name@example.com'
        continue
      }
    }
    if (k === 'pincode' && !/^\d{6}$/.test(v)) {
      errors.pincode = 'Pincode must be 6 digits'
      continue
    }
    if (k === 'aadharNumber') {
      v = v.replace(/\s/g, '')
      if (!/^\d{12}$/.test(v)) {
        errors.aadharNumber = 'Aadhaar number must be 12 digits'
        continue
      }
    }
    data[k] = v.slice(0, k === 'address' ? 1000 : 200)
  }

  if (has('gender')) {
    const v = str(body.gender).toUpperCase()
    if (!v) data.gender = null
    else if (!GENDERS.includes(v)) errors.gender = 'Gender must be Male, Female or Other'
    else data.gender = v
  }
  if (has('bloodGroup')) {
    // Accept the short form too ("O+" → O_POSITIVE)
    const raw = str(body.bloodGroup).toUpperCase().replace(/\s/g, '')
    const short = raw.match(/^(A|B|AB|O)([+-])$/)
    const v = short ? `${short[1]}_${short[2] === '+' ? 'POSITIVE' : 'NEGATIVE'}` : raw
    if (!v) data.bloodGroup = null
    else if (!BLOOD_GROUPS.includes(v)) errors.bloodGroup = 'Choose a blood group from the list'
    else data.bloodGroup = v
  }

  // DOB and age: DOB wins and age is derived from it, so they can never disagree.
  const dobGiven = has('dateOfBirth') && str(body.dateOfBirth) !== ''
  if (dobGiven) {
    const d = new Date(str(body.dateOfBirth))
    const age = calcAge(d)
    if (isNaN(d.getTime()) || age === null) errors.dateOfBirth = 'Enter a valid date of birth'
    else if (d.getTime() > Date.now()) errors.dateOfBirth = 'Date of birth cannot be in the future'
    else if (age > 120) errors.dateOfBirth = 'Date of birth is more than 120 years ago'
    else {
      data.dateOfBirth = d
      data.age = age
    }
  } else {
    if (has('dateOfBirth')) data.dateOfBirth = null
    if (has('age')) {
      const raw = str(body.age)
      if (!raw) data.age = null
      else {
        const n = Number(raw)
        if (!Number.isInteger(n) || n < 0 || n > 120)
          errors.age = 'Age must be a whole number from 0 to 120'
        else data.age = n
      }
    }
  }

  return { data, errors }
}

/** First error message, for a single toast / API `error` string. */
export function firstError(errors: Record<string, string>): string | undefined {
  return Object.values(errors)[0]
}
