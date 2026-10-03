import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
} from '@/lib/i18n/format'

// Treatment status colors and labels
export const treatmentStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PLANNED: {
    label: 'Planned',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
}

// Treatment Plan status colors and labels
export const treatmentPlanStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  PROPOSED: {
    label: 'Proposed',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
}

// Treatment Plan Item status colors and labels
export const treatmentPlanItemStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: 'Pending',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  SCHEDULED: {
    label: 'Scheduled',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
}

// Procedure category colors and labels
export const procedureCategoryConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  PREVENTIVE: {
    label: 'Preventive',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'Shield',
  },
  RESTORATIVE: {
    label: 'Restorative',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: 'Wrench',
  },
  ENDODONTIC: {
    label: 'Endodontic',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: 'Target',
  },
  PERIODONTIC: {
    label: 'Periodontic',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    icon: 'Layers',
  },
  PROSTHODONTIC: {
    label: 'Prosthodontic',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: 'Crown',
  },
  ORTHODONTIC: {
    label: 'Orthodontic',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    icon: 'AlignCenter',
  },
  ORAL_SURGERY: {
    label: 'Oral Surgery',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: 'Scissors',
  },
  COSMETIC: {
    label: 'Cosmetic',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'Sparkles',
  },
  DIAGNOSTIC: {
    label: 'Diagnostic',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    icon: 'Search',
  },
  EMERGENCY: {
    label: 'Emergency',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: 'AlertTriangle',
  },
}

// Dental chart tooth condition colors and labels
export const toothConditionConfig: Record<
  string,
  { label: string; color: string; bgColor: string; fillColor: string }
> = {
  HEALTHY: {
    label: 'Healthy',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    fillColor: '#22c55e',
  },
  CARIES: {
    label: 'Caries',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    fillColor: '#ef4444',
  },
  FILLED: {
    label: 'Filled',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    fillColor: '#3b82f6',
  },
  CROWN: {
    label: 'Crown',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    fillColor: '#f59e0b',
  },
  BRIDGE: {
    label: 'Bridge',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    fillColor: '#a855f7',
  },
  MISSING: {
    label: 'Missing',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    fillColor: '#9ca3af',
  },
  IMPLANT: {
    label: 'Implant',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    fillColor: '#06b6d4',
  },
  ROOT_CANAL: {
    label: 'Root Canal',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    fillColor: '#ec4899',
  },
  EXTRACTION_NEEDED: {
    label: 'Extraction Needed',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    fillColor: '#f97316',
  },
  VENEER: {
    label: 'Veneer',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    fillColor: '#6366f1',
  },
}

// Tooth surface labels (FDI notation)
export const toothSurfaceLabels: Record<string, string> = {
  M: 'Mesial',
  D: 'Distal',
  O: 'Occlusal',
  B: 'Buccal',
  L: 'Lingual',
  I: 'Incisal',
  F: 'Facial',
  P: 'Palatal',
}

// Tooth numbering (Universal/FDI)
export const toothNumbers = {
  // Upper Right (Quadrant 1)
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  // Upper Left (Quadrant 2)
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  // Lower Left (Quadrant 3), shown midline → outwards like the upper row
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  // Lower Right (Quadrant 4)
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
}

// Milk teeth (FDI 51–85), laid out the same way as the adult rows
export const primaryToothNumbers = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81],
}

export const ALL_TOOTH_NUMBERS: number[] = [
  ...Object.values(toothNumbers).flat(),
  ...Object.values(primaryToothNumbers).flat(),
]

export type Dentition = 'adult' | 'child' | 'mixed'

/** Which chart to open by default: milk teeth under 6, both until 13. */
export function dentitionForAge(age?: number | null): Dentition {
  if (age == null) return 'adult'
  if (age < 6) return 'child'
  if (age < 13) return 'mixed'
  return 'adult'
}

// Tooth names by number (FDI notation)
export const toothNames: Record<number, string> = {
  // Upper Right
  18: 'Upper Right Third Molar',
  17: 'Upper Right Second Molar',
  16: 'Upper Right First Molar',
  15: 'Upper Right Second Premolar',
  14: 'Upper Right First Premolar',
  13: 'Upper Right Canine',
  12: 'Upper Right Lateral Incisor',
  11: 'Upper Right Central Incisor',
  // Upper Left
  21: 'Upper Left Central Incisor',
  22: 'Upper Left Lateral Incisor',
  23: 'Upper Left Canine',
  24: 'Upper Left First Premolar',
  25: 'Upper Left Second Premolar',
  26: 'Upper Left First Molar',
  27: 'Upper Left Second Molar',
  28: 'Upper Left Third Molar',
  // Lower Left
  31: 'Lower Left Central Incisor',
  32: 'Lower Left Lateral Incisor',
  33: 'Lower Left Canine',
  34: 'Lower Left First Premolar',
  35: 'Lower Left Second Premolar',
  36: 'Lower Left First Molar',
  37: 'Lower Left Second Molar',
  38: 'Lower Left Third Molar',
  // Lower Right
  41: 'Lower Right Central Incisor',
  42: 'Lower Right Lateral Incisor',
  43: 'Lower Right Canine',
  44: 'Lower Right First Premolar',
  45: 'Lower Right Second Premolar',
  46: 'Lower Right First Molar',
  47: 'Lower Right Second Molar',
  48: 'Lower Right Third Molar',
}

// Milk tooth names (51–85)
const PRIMARY_QUADRANTS: Record<number, string> = {
  5: 'Upper Right',
  6: 'Upper Left',
  7: 'Lower Left',
  8: 'Lower Right',
}
const PRIMARY_TYPES = [
  'Central Incisor',
  'Lateral Incisor',
  'Canine',
  'First Molar',
  'Second Molar',
]
for (const q of [5, 6, 7, 8]) {
  for (let i = 1; i <= 5; i++) {
    toothNames[q * 10 + i] = `${PRIMARY_QUADRANTS[q]} Primary ${PRIMARY_TYPES[i - 1]}`
  }
}

// Format treatment duration in minutes to readable string
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hr`
  }
  return `${hours} hr ${mins} min`
}

export function formatCurrency(amount: number | string, locale?: string): string {
  return baseFormatCurrency(amount, { locale })
}

// Parse tooth numbers from string (e.g., "11,12,13" or "11-13")
export function parseToothNumbers(toothString: string): number[] {
  if (!toothString) return []

  const teeth: number[] = []
  const parts = toothString.split(',').map((s) => s.trim())

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      for (let i = start; i <= end; i++) {
        teeth.push(i)
      }
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num)) {
        teeth.push(num)
      }
    }
  }

  return [...new Set(teeth)].sort((a, b) => a - b)
}

// Format tooth numbers to string
export function formatToothNumbers(teeth: number[]): string {
  if (!teeth || teeth.length === 0) return '-'
  return teeth.sort((a, b) => a - b).join(', ')
}

// Get tooth quadrant from tooth number
export function getToothQuadrant(toothNumber: number): 1 | 2 | 3 | 4 {
  const firstDigit = Math.floor(toothNumber / 10)
  // Milk-tooth quadrants 5–8 map onto adult quadrants 1–4
  return (firstDigit > 4 ? firstDigit - 4 : firstDigit) as 1 | 2 | 3 | 4
}

/** Milk teeth are quadrants 5–8 (51–85): 1–2 incisors, 3 canine, 4–5 molars, no premolars. */
export function isPrimaryTooth(toothNumber: number): boolean {
  return Math.floor(toothNumber / 10) >= 5
}

// Check if tooth is a molar
export function isMolar(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  if (isPrimaryTooth(toothNumber)) return lastDigit === 4 || lastDigit === 5
  return lastDigit >= 6 && lastDigit <= 8
}

// Check if tooth is a premolar
export function isPremolar(toothNumber: number): boolean {
  if (isPrimaryTooth(toothNumber)) return false
  const lastDigit = toothNumber % 10
  return lastDigit === 4 || lastDigit === 5
}

// Check if tooth is a canine
export function isCanine(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  return lastDigit === 3
}

// Check if tooth is an incisor
export function isIncisor(toothNumber: number): boolean {
  const lastDigit = toothNumber % 10
  return lastDigit === 1 || lastDigit === 2
}

// Get tooth type
export function getToothType(toothNumber: number): 'molar' | 'premolar' | 'canine' | 'incisor' {
  if (isMolar(toothNumber)) return 'molar'
  if (isPremolar(toothNumber)) return 'premolar'
  if (isCanine(toothNumber)) return 'canine'
  return 'incisor'
}

// Format date for display
export function formatDate(date: Date | string, locale?: string): string {
  return baseFormatDate(date, { locale })
}

// Format date and time
export function formatDateTime(date: Date | string, locale?: string): string {
  return baseFormatDateTime(date, { locale, hour12: true })
}

// Calculate treatment plan progress percentage
export function calculatePlanProgress(items: { status: string }[]): number {
  if (!items || items.length === 0) return 0
  const completed = items.filter((item) => item.status === 'COMPLETED').length
  return Math.round((completed / items.length) * 100)
}

// Get treatment status badge component props
export function getTreatmentStatusBadge(status: string): { label: string; variant: string } {
  const config = treatmentStatusConfig[status] || treatmentStatusConfig.PLANNED
  return {
    label: config.label,
    variant: status.toLowerCase(),
  }
}
