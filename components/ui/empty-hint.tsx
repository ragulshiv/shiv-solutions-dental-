import { Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyHintProps {
  title: string
  /** One actionable sentence: what to do, or what will appear here. */
  tip?: string
  icon?: LucideIcon
  className?: string
}

/**
 * Soft teal banner for "nothing here yet" spots inside cards. Use it instead of
 * plain grey "No data" text; the full-page EmptyState is for empty list pages.
 */
export function EmptyHint({ title, tip, icon: Icon = Sparkles, className }: EmptyHintProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-teal-200/60 bg-teal-50 px-4 py-3 text-teal-800',
        'dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-200',
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {tip && <p className="text-sm text-teal-700 dark:text-teal-300/90">{tip}</p>}
      </div>
    </div>
  )
}
