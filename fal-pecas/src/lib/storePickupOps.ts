/** Retirada na loja — autorização pós-separação (metadata.pickup). */

export type StorePickupMeta = {
  authorizedAt: string | null
  authorizedBy: string | null
  pickedUpAt: string | null
}

export function parseStorePickupMeta(
  metadata: Record<string, unknown> | null | undefined,
): StorePickupMeta {
  const raw = metadata?.pickup
  if (!raw || typeof raw !== 'object') {
    return { authorizedAt: null, authorizedBy: null, pickedUpAt: null }
  }
  const p = raw as Record<string, unknown>
  return {
    authorizedAt: p.authorized_at != null ? String(p.authorized_at) : null,
    authorizedBy: p.authorized_by != null ? String(p.authorized_by) : null,
    pickedUpAt: p.picked_up_at != null ? String(p.picked_up_at) : null,
  }
}

export function isStorePickupAuthorized(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(parseStorePickupMeta(metadata).authorizedAt)
}
