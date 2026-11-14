export const SECURE_FIELD_CONTAINER_IDS = [
  'cardNumberSecureField_container',
  'expirationDateSecureField_container',
  'securityCodeSecureField_container',
] as const

export function hasAllSecureFieldContainers(containerIds: Iterable<string>): boolean {
  const mounted = new Set(containerIds)
  return SECURE_FIELD_CONTAINER_IDS.every((id) => mounted.has(id))
}
