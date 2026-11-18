/** PLANO 2A E1 — display curto alinhado a `vehicle_identity_fal_code` (SQL). */
export function vehicleIdentityFalCode(identityId: string | null | undefined): string | null {
  if (!identityId) return null
  const hex = identityId.replace(/-/g, '')
  if (hex.length < 8) return null
  return `FAL-${hex.slice(0, 8).toUpperCase()}`
}
