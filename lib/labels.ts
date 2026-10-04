/**
 * Human labels for database codes (A_POSITIVE → "A+", CHECKED_IN → "Checked in").
 * Use labelFor() anywhere an enum value would otherwise be shown raw.
 */

const SPECIAL: Record<string, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
  NO_SHOW: 'No-show',
  LAB_TECH: 'Lab technician',
  RCT: 'Root canal',
  UPI: 'UPI',
  EMI: 'EMI',
  OPG: 'OPG',
  IOPA: 'IOPA',
  CBCT: 'CBCT',
}

/** "CHECKED_IN" → "Checked in"; known codes get their proper form. */
export function labelFor(code: string | null | undefined): string {
  if (!code) return ''
  if (SPECIAL[code]) return SPECIAL[code]
  if (!/^[A-Z0-9_]+$/.test(code)) return code
  const words = code.toLowerCase().split('_').filter(Boolean)
  if (words.length === 0) return code
  words[0] = words[0][0].toUpperCase() + words[0].slice(1)
  return words.join(' ')
}
