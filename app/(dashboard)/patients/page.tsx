'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  MoreHorizontal,
  Eye,
  Edit,
  Phone,
  Mail,
  CalendarPlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExportMenu } from '@/components/ui/export-menu'
import { labelFor } from '@/lib/labels'
import { BLOOD_GROUPS } from '@/components/patients/patient-form'

interface Patient {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  gender: string
  age: number | null
  bloodGroup: string
  city: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function PatientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Filters (search comes from the link too, e.g. /patients?search=Priya)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [genderFilter, setGenderFilter] = useState('all')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination((p) => ({ ...p, page: 1 }))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        })
        if (debouncedSearch) params.append('search', debouncedSearch)
        if (genderFilter !== 'all') params.append('gender', genderFilter)
        if (bloodGroupFilter !== 'all') params.append('bloodGroup', bloodGroupFilter)

        const response = await fetch(`/api/patients?${params}`)
        if (!response.ok) throw new Error('Failed to fetch patients')
        const data = await response.json()
        setPatients(data.patients)
        setPagination(data.pagination)
      } catch (error) {
        console.error('Error fetching patients:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatients()
  }, [pagination.page, debouncedSearch, genderFilter, bloodGroupFilter])

  const open = (id: string) => router.push(`/patients/${id}`)
  const ageText = (p: Patient) => (p.age != null ? `${p.age} yrs` : '—')

  const rowMenu = (patient: Patient) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`More actions for ${patient.firstName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => open(patient.id)}>
          <Eye className="h-4 w-4 mr-2" />
          Open profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/patients/${patient.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit / medical history
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Book appointment
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Patients</h1>
          <p className="text-sm text-muted-foreground">Tap a patient to open their profile</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename="patients"
            getData={() =>
              patients.map((p) => ({
                'Patient ID': p.patientId,
                'First Name': p.firstName,
                'Last Name': p.lastName,
                Phone: p.phone,
                Email: p.email || '',
                Gender: labelFor(p.gender),
                Age: p.age ?? '',
                'Blood Group': labelFor(p.bloodGroup),
                City: p.city || '',
              }))
            }
          />
          <Link href="/patients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile or patient ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search patients"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <Select
                value={genderFilter}
                onValueChange={(v) => {
                  setGenderFilter(v)
                  setPagination((p) => ({ ...p, page: 1 }))
                }}
              >
                <SelectTrigger className="md:w-[140px]" aria-label="Filter by gender">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={bloodGroupFilter}
                onValueChange={(v) => {
                  setBloodGroupFilter(v)
                  setPagination((p) => ({ ...p, page: 1 }))
                }}
              >
                <SelectTrigger className="md:w-[150px]" aria-label="Filter by blood group">
                  <SelectValue placeholder="Blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All blood groups</SelectItem>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg.value} value={bg.value}>
                      {bg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone: cards */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8">
              <User className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No patients found</p>
            </CardContent>
          </Card>
        ) : (
          patients.map((p) => (
            <Card
              key={p.id}
              role="link"
              tabIndex={0}
              onClick={() => open(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && open(p.id)}
              className="cursor-pointer active:bg-muted/50"
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {p.phone} · {ageText(p)}
                    {p.gender ? ` · ${labelFor(p.gender)}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.patientId}</p>
                </div>
                {rowMenu(p)}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Tablet / desktop: table */}
      <Card className="hidden md:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Age / Gender</TableHead>
                <TableHead>Blood group</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No patients found</p>
                      <Link href="/patients/new">
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Patient
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer"
                    onClick={() => open(patient.id)}
                  >
                    <TableCell>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </span>
                        <span>
                          {patient.firstName} {patient.lastName}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {patient.patientId}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {patient.phone}
                        </div>
                        {patient.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {patient.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ageText(patient)}
                      {patient.gender ? ` · ${labelFor(patient.gender)}` : ''}
                    </TableCell>
                    <TableCell>
                      {patient.bloodGroup ? (
                        <Badge variant="outline">{labelFor(patient.bloodGroup)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {patient.city || '—'}
                    </TableCell>
                    <TableCell className="text-right">{rowMenu(patient)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
