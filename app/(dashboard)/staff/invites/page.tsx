'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, RotateCw, Send, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { labelFor } from '@/lib/labels'

interface Invite {
  id: string
  email: string
  name: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
  acceptedAt?: string | null
}

const ROLES = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'LAB_TECH', label: 'Lab technician' },
]

export default function StaffInvitesPage() {
  const { toast } = useToast()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'DOCTOR' })
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/staff-invites')
      const data = await res.json()
      setInvites(data.invites || [])
    } catch {
      toast({ variant: 'destructive', title: 'Could not load invites' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setInviteLink(null)
    try {
      const res = await fetch('/api/staff-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = data.details?.fieldErrors
          ? Object.values(data.details.fieldErrors).flat()[0]
          : null
        throw new Error((detail as string) || data.error || 'Could not send the invite')
      }
      toast({ title: 'Invite created', description: data.message })
      if (data.inviteLink) setInviteLink(`${window.location.origin}${data.inviteLink}`)
      setForm({ name: '', email: '', role: form.role })
      load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Not sent', description: err.message })
    } finally {
      setSending(false)
    }
  }

  async function act(id: string, method: 'POST' | 'DELETE') {
    setBusyId(id)
    try {
      const res = await fetch(`/api/staff-invites/${id}`, { method })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Action failed')
      toast({ title: method === 'DELETE' ? 'Invite cancelled' : 'Invite sent again' })
      load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Not done', description: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const statusVariant = (s: string) =>
    s === 'ACCEPTED' ? 'success' : s === 'PENDING' ? 'warning' : ('secondary' as any)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Staff invites</h1>
        <p className="text-sm text-muted-foreground">
          Invite doctors and front-desk staff. They get an email link to set their own password.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite someone</CardTitle>
          <CardDescription>The invite link is valid for 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={send} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Anitha"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send invite
            </Button>
          </form>
          {inviteLink && (
            <p className="mt-3 break-all rounded-lg bg-muted p-3 text-sm">
              Test link (development only): <span className="font-mono">{inviteLink}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent invites</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <ul className="divide-y">
              {invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {inv.name}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        · {labelFor(inv.role)}
                      </span>
                    </p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {inv.email} · sent{' '}
                      {format(new Date(inv.createdAt), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(inv.status)}>{labelFor(inv.status)}</Badge>
                    {inv.status === 'PENDING' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === inv.id}
                          onClick={() => act(inv.id, 'POST')}
                        >
                          <RotateCw className="mr-1 h-4 w-4" /> Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === inv.id}
                          onClick={() => act(inv.id, 'DELETE')}
                          aria-label={`Cancel invite for ${inv.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
