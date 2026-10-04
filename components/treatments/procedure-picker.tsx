'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { labelFor } from '@/lib/labels'

export interface PickableProcedure {
  id: string
  code: string
  name: string
  category: string
  basePrice: string | number
}

interface Props {
  procedures: PickableProcedure[]
  value: string
  onChange: (procedure: PickableProcedure | null) => void
  placeholder?: string
  autoFocus?: boolean
}

/** Type to search ~80 procedures by name, code or category ("rct", "filling", "END003"). */
export function ProcedurePicker({ procedures, value, onChange, placeholder, autoFocus }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = procedures.find((p) => p.id === value) || null

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const aliases: Record<string, string> = {
      rct: 'root canal',
      ext: 'extraction',
      opg: 'panoramic',
    }
    const needle = aliases[q] || q
    const list = needle
      ? procedures.filter((p) =>
          `${p.name} ${p.code} ${labelFor(p.category)}`.toLowerCase().includes(needle)
        )
      : procedures
    return list.slice(0, 12)
  }, [procedures, query])

  if (selected && !open) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 md:min-h-10">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {selected.code} · ₹{Number(selected.basePrice).toLocaleString('en-IN')}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Change procedure"
          onClick={() => {
            onChange(null)
            setOpen(true)
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground md:top-2.5" />
      <Input
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || 'Search procedure: filling, RCT, scaling…'}
        className="pl-9"
        aria-label="Search procedure"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover shadow-card">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No procedure matches “{query}”.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p)
                  setQuery('')
                  setOpen(false)
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/60"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.code} · {labelFor(p.category)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  ₹{Number(p.basePrice).toLocaleString('en-IN')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
