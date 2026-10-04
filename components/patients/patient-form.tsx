'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users } from 'lucide-react'
import { calcAge, MEDICAL_FLAGS, normalizePhone, isValidPhone } from '@/lib/patient-utils'

export const BLOOD_GROUPS = [
  { value: 'A_POSITIVE', label: 'A+' },
  { value: 'A_NEGATIVE', label: 'A-' },
  { value: 'B_POSITIVE', label: 'B+' },
  { value: 'B_NEGATIVE', label: 'B-' },
  { value: 'AB_POSITIVE', label: 'AB+' },
  { value: 'AB_NEGATIVE', label: 'AB-' },
  { value: 'O_POSITIVE', label: 'O+' },
  { value: 'O_NEGATIVE', label: 'O-' },
]

export interface PatientFormValues {
  firstName: string
  lastName: string
  dateOfBirth: string
  age: string
  gender: string
  bloodGroup: string
  phone: string
  alternatePhone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  aadharNumber: string
  occupation: string
  referredBy: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  medical: Record<string, boolean>
  drugAllergies: string
  currentMedications: string
  otherConditions: string
}

export const EMPTY_PATIENT: PatientFormValues = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  age: '',
  gender: '',
  bloodGroup: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  city: '',
  state: 'Tamil Nadu',
  pincode: '',
  aadharNumber: '',
  occupation: '',
  referredBy: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  medical: {},
  drugAllergies: '',
  currentMedications: '',
  otherConditions: '',
}

/** Build form values from a patient returned by GET /api/patients/[id]. */
export function patientToForm(p: any): PatientFormValues {
  const mh = p.medicalHistory || {}
  return {
    ...EMPTY_PATIENT,
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
    age: p.age != null ? String(p.age) : '',
    gender: p.gender || '',
    bloodGroup: p.bloodGroup || '',
    phone: p.phone || '',
    alternatePhone: p.alternatePhone || '',
    email: p.email || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    pincode: p.pincode || '',
    aadharNumber: p.aadharNumber || '',
    occupation: p.occupation || '',
    referredBy: p.referredBy || '',
    emergencyContactName: p.emergencyContactName || '',
    emergencyContactPhone: p.emergencyContactPhone || '',
    emergencyContactRelation: p.emergencyContactRelation || '',
    medical: Object.fromEntries(MEDICAL_FLAGS.map((f) => [f.key, Boolean(mh[f.key])])),
    drugAllergies: mh.drugAllergies || '',
    currentMedications: mh.currentMedications || '',
    otherConditions: mh.otherConditions || '',
  }
}

/**
 * Payload for POST/PUT /api/patients. Every field is sent (blank = clear),
 * so removing a value on the edit screen really removes it.
 */
export function formToPayload(f: PatientFormValues, { compact = false } = {}) {
  const medicalHistory = {
    ...Object.fromEntries(MEDICAL_FLAGS.map((m) => [m.key, Boolean(f.medical[m.key])])),
    drugAllergies: f.drugAllergies,
    currentMedications: f.currentMedications,
    otherConditions: f.otherConditions,
  }
  const base = {
    firstName: f.firstName,
    lastName: f.lastName,
    phone: f.phone,
    dateOfBirth: f.dateOfBirth,
    age: f.dateOfBirth ? '' : f.age,
    gender: f.gender,
    medicalHistory,
  }
  if (compact) return base
  return {
    ...base,
    bloodGroup: f.bloodGroup,
    alternatePhone: f.alternatePhone,
    email: f.email,
    address: f.address,
    city: f.city,
    state: f.state,
    pincode: f.pincode,
    aadharNumber: f.aadharNumber,
    occupation: f.occupation,
    referredBy: f.referredBy,
    emergencyContactName: f.emergencyContactName,
    emergencyContactPhone: f.emergencyContactPhone,
    emergencyContactRelation: f.emergencyContactRelation,
  }
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-sm text-destructive">{msg}</p>
}

interface Props {
  value: PatientFormValues
  onChange: (v: PatientFormValues) => void
  errors?: Record<string, string>
  /** Quick-add: name, mobile, age/DOB, gender, medical alerts only. */
  compact?: boolean
  /** Patient being edited, excluded from the "same phone" list. */
  currentPatientId?: string
}

export function PatientForm({
  value: form,
  onChange,
  errors = {},
  compact,
  currentPatientId,
}: Props) {
  const set = (field: keyof PatientFormValues, v: any) => onChange({ ...form, [field]: v })
  const liveAge = useMemo(() => calcAge(form.dateOfBirth), [form.dateOfBirth])

  // Family members on the same mobile number (shown, never blocking)
  const [family, setFamily] = useState<any[]>([])
  useEffect(() => {
    const phone = normalizePhone(form.phone)
    if (!isValidPhone(phone)) {
      setFamily([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?phone=${phone}&limit=10`)
        const data = await res.json()
        setFamily((data.patients || []).filter((p: any) => p.id !== currentPatientId))
      } catch {
        setFamily([])
      }
    }, 350)
    return () => clearTimeout(t)
  }, [form.phone, currentPatientId])

  const grid = compact
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'

  const basics = (
    <div className={grid}>
      <div className="space-y-2">
        <Label htmlFor="firstName">First name *</Label>
        <Input
          id="firstName"
          value={form.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          placeholder="e.g. Murugan"
          autoFocus={compact}
          aria-invalid={!!errors.firstName}
        />
        <FieldError msg={errors.firstName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last name / initial</Label>
        <Input
          id="lastName"
          value={form.lastName}
          onChange={(e) => set('lastName', e.target.value)}
          placeholder="Optional"
          aria-invalid={!!errors.lastName}
        />
        <FieldError msg={errors.lastName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Mobile *</Label>
        <Input
          id="phone"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="10-digit mobile"
          aria-invalid={!!errors.phone}
        />
        <FieldError msg={errors.phone} />
        {family.length > 0 && (
          <div className="rounded-lg bg-accent/60 p-2 text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <Users className="h-4 w-4" />
              Already on this number (family):
            </p>
            <ul className="mt-1 space-y-0.5">
              {family.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/patients/${p.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {p.firstName} {p.lastName}
                  </Link>{' '}
                  <span className="text-muted-foreground">
                    · {p.patientId}
                    {p.age != null ? ` · ${p.age} yrs` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-muted-foreground">You can still save a new family member.</p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={form.dateOfBirth}
          onChange={(e) => set('dateOfBirth', e.target.value)}
          aria-invalid={!!errors.dateOfBirth}
        />
        <FieldError msg={errors.dateOfBirth} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="age">
          Age {form.dateOfBirth ? '(from date of birth)' : '(if DOB unknown)'}
        </Label>
        <Input
          id="age"
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          value={form.dateOfBirth ? (liveAge ?? '') : form.age}
          onChange={(e) => set('age', e.target.value)}
          disabled={!!form.dateOfBirth}
          placeholder="Years"
          aria-invalid={!!errors.age}
        />
        <FieldError msg={errors.age} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
          <SelectTrigger id="gender">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <FieldError msg={errors.gender} />
      </div>
    </div>
  )

  const medical = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MEDICAL_FLAGS.map((f) => (
          <label
            key={f.key}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-accent/50 md:min-h-9"
          >
            <Checkbox
              checked={!!form.medical[f.key]}
              onCheckedChange={(c) => set('medical', { ...form.medical, [f.key]: c === true })}
            />
            {f.label}
          </label>
        ))}
      </div>
      {(form.medical.hasAllergies || !compact) && (
        <div className="space-y-2">
          <Label htmlFor="drugAllergies">Allergic to</Label>
          <Input
            id="drugAllergies"
            value={form.drugAllergies}
            onChange={(e) => set('drugAllergies', e.target.value)}
            placeholder="e.g. Penicillin, Latex"
          />
        </div>
      )}
      {!compact && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currentMedications">Current medicines</Label>
            <Textarea
              id="currentMedications"
              rows={2}
              value={form.currentMedications}
              onChange={(e) => set('currentMedications', e.target.value)}
              placeholder="e.g. Metformin 500 mg, Aspirin 75 mg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otherConditions">Other conditions / notes</Label>
            <Textarea
              id="otherConditions"
              rows={2}
              value={form.otherConditions}
              onChange={(e) => set('otherConditions', e.target.value)}
              placeholder="Anything the doctor should know"
            />
          </div>
        </div>
      )}
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-5">
        {basics}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Medical alerts</p>
          {medical}
        </div>
      </div>
    )
  }

  const text = (
    field: keyof PatientFormValues,
    label: string,
    placeholder = '',
    extra: any = {}
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        value={form[field] as string}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!errors[field]}
        {...extra}
      />
      <FieldError msg={errors[field]} />
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
          <CardDescription>
            Name, mobile and age. Only first name and mobile are required.
          </CardDescription>
        </CardHeader>
        <CardContent>{basics}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical history</CardTitle>
          <CardDescription>
            Ticked items show as red alerts to the doctor before treatment.
          </CardDescription>
        </CardHeader>
        <CardContent>{medical}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact and address</CardTitle>
        </CardHeader>
        <CardContent className={grid}>
          {text('alternatePhone', 'Alternate mobile', 'Optional', { inputMode: 'tel' })}
          {text('email', 'Email', 'name@example.com', { type: 'email' })}
          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood group</Label>
            <Select value={form.bloodGroup} onValueChange={(v) => set('bloodGroup', v)}>
              <SelectTrigger id="bloodGroup">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg.value} value={bg.value}>
                    {bg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Door no, street, area"
            />
          </div>
          {text('city', 'City', 'City')}
          {text('state', 'State', 'State')}
          {text('pincode', 'Pincode', '6 digits', { inputMode: 'numeric' })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other details</CardTitle>
        </CardHeader>
        <CardContent className={grid}>
          {text('aadharNumber', 'Aadhaar number', '12 digits', { inputMode: 'numeric' })}
          {text('occupation', 'Occupation', 'Optional')}
          {text('referredBy', 'Referred by', 'Friend, Google, another doctor…')}
          {text('emergencyContactName', 'Emergency contact name', 'Optional')}
          {text('emergencyContactPhone', 'Emergency contact mobile', 'Optional', {
            inputMode: 'tel',
          })}
          {text('emergencyContactRelation', 'Relation', 'e.g. Spouse, Parent')}
        </CardContent>
      </Card>
    </div>
  )
}
