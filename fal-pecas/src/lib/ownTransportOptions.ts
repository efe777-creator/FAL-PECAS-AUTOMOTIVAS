/** Opções de transporte para frete próprio (Uber/99/apps + FAL). */

export type OwnTransportOption = {
  id: string
  label: string
}

export const OWN_TRANSPORT_OPTIONS: readonly OwnTransportOption[] = [
  { id: 'uber', label: 'Uber' },
  { id: '99', label: '99' },
  { id: 'lalamove', label: 'Lalamove' },
  { id: 'motoboy_fal', label: 'Motoboy FAL' },
  { id: 'van_fal', label: 'Van / frota FAL' },
  { id: 'outro', label: 'Outro / terceirizado' },
] as const

export function ownTransportLabel(
  id: string | null | undefined,
  options?: readonly OwnTransportOption[] | null,
): string {
  const list = options?.length ? options : OWN_TRANSPORT_OPTIONS
  const hit = list.find((o) => o.id === id)
  return hit?.label ?? (id ? String(id) : '—')
}

export type OwnDispatchDetails = {
  transportMode: string | null
  appCost: number | null
  trackingUrl: string | null
  note: string | null
}

export function parseOwnDispatchDetails(
  metadata: Record<string, unknown> | null | undefined,
): OwnDispatchDetails {
  const own = metadata?.own
  if (!own || typeof own !== 'object') {
    return { transportMode: null, appCost: null, trackingUrl: null, note: null }
  }
  const o = own as Record<string, unknown>
  const appCostRaw = o.app_cost ?? o.appCost
  return {
    transportMode:
      o.transport_mode != null
        ? String(o.transport_mode)
        : o.transportMode != null
          ? String(o.transportMode)
          : null,
    appCost:
      appCostRaw != null && Number.isFinite(Number(appCostRaw)) ? Number(appCostRaw) : null,
    trackingUrl:
      o.tracking_url != null
        ? String(o.tracking_url)
        : o.trackingUrl != null
          ? String(o.trackingUrl)
          : null,
    note: o.dispatch_note != null ? String(o.dispatch_note) : null,
  }
}
