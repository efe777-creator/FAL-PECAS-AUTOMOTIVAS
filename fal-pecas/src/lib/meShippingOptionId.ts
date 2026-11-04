/** Parse / build ids `meq:<quoteUuid>:<serviceId>` (D12). */

export function buildMeqOptionId(quoteId: string, serviceId: string | number): string {
  return `meq:${quoteId}:${serviceId}`
}

export function parseMeqOptionId(optionId: string): {
  quoteId: string
  serviceId: number
} | null {
  if (!optionId.startsWith('meq:')) return null
  const parts = optionId.split(':')
  if (parts.length < 3) return null
  const quoteId = parts[1] ?? ''
  const serviceId = Number(parts[2])
  if (!quoteId || !Number.isFinite(serviceId)) return null
  // UUID loose check
  if (!/^[0-9a-f-]{36}$/i.test(quoteId) && quoteId !== 'ephemeral') return null
  return { quoteId, serviceId }
}

export function isMeqOptionId(optionId: string): boolean {
  return parseMeqOptionId(optionId) != null
}
