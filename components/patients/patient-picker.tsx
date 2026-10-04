'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { QuickAddPatientDialog } from '@/components/patients/quick-add-patient-dialog'

export interface PickedPatient {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  age?: number | null
  gender?: string | null
  [key: string]: any
}

interface Props {
  value: PickedPatient | null
  onChange: (p: PickedPatient | null) => void
  /** Preselect by database id (e.g. from ?patientId= in the URL). */
  initialPatientId?: string | null
  allowCreate?: boolean
  placeholder?: string
}

/**
 * Searches the server as you type (name, mobile, patient ID), so it works for
 * any number of patients. Replaces dropdowns that loaded only the newest 100.
 */
export function PatientPicker({
  value,
  onChange,
  initialPatientId,
  allowCreate = true,
  placeholder = 'Search by name, mobile or patient ID…',
}: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PickedPatient[]>([])
  const [searching, setSearching] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)

  useEffect(() => {
    if (!initialPatientId || value?.id === initialPatientId) return
    fetch(`/api/patients/${initialPatientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const p = d?.patient
        if (p?.id) onChange(p)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId])

  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(term)}&limit=8`)
        const data = await res.json()
        setResults(data.patients || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {value.firstName} {value.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {value.patientId} · {value.phone}
            {value.age != null ? ` · ${value.age} yrs` : ''}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search patient"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {search.trim().length >= 2 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              className="flex min-h-11 w-full flex-col items-start border-b px-3 py-2 text-left last:border-0 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
              onClick={() => {
                onChange(p)
                setSearch('')
              }}
            >
              <span className="font-medium">
                {p.firstName} {p.lastName}
              </span>
              <span className="text-sm text-muted-foreground">
                {p.patientId} · {p.phone}
                {p.age != null ? ` · ${p.age} yrs` : ''}
              </span>
            </button>
          ))}
          {!searching && results.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              No patient matches “{search.trim()}”.
            </p>
          )}
        </div>
      )}
      {allowCreate && (
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickAdd(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          New patient
        </Button>
      )}
      {allowCreate && (
        <QuickAddPatientDialog
          open={quickAdd}
          onOpenChange={setQuickAdd}
          initialSearch={search}
          onCreated={(p) => {
            onChange(p)
            setSearch('')
          }}
        />
      )}
    </div>
  )
}
