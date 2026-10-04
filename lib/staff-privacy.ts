/** Staff fields only clinic admins may see (pay, bank, government IDs, home details). */
const STAFF_PRIVATE_FIELDS = [
  'salary',
  'bankAccountNo',
  'bankIfsc',
  'aadharNumber',
  'panNumber',
  'dateOfBirth',
  'address',
  'city',
  'state',
  'pincode',
  'emergencyContact',
  'emergencyPhone',
  'alternatePhone',
] as const

/** Remove private staff fields unless the viewer is an admin. */
export function redactStaff<T extends Record<string, any>>(
  staff: T,
  viewerRole?: string | null
): T {
  if (viewerRole === 'ADMIN') return staff
  const copy: Record<string, any> = { ...staff }
  for (const f of STAFF_PRIVATE_FIELDS) delete copy[f]
  return copy as T
}
