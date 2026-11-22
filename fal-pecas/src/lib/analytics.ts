/**
 * Facade de analytics (prep Ads / #15-A).
 * No-op até: consent marketing + pelo menos um ID (GTM / GA / Meta).
 * Scripts: `marketingTags.syncMarketingTags()` (Consent Mode + inject).
 */

import { hasMarketingConsent } from '@/lib/cookieNotice'

export type AnalyticsEventName =
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  /** Fase 7 lite — funil de fit (incompat contado à parte). */
  | 'compat_gate_shown'
  | 'compat_gate_continue'
  | 'compat_gate_complete_vehicle'
  | 'compat_gate_replace'
  | 'compat_item_replaced'
  | 'compat_order_fit_log'

export type AnalyticsPayload = Record<string, unknown>

export type AnalyticsSink = (event: AnalyticsEventName, payload: AnalyticsPayload) => void

declare global {
  interface Window {
    /** GTM/gtag: objetos de evento e arrays de args. */
    dataLayer?: unknown[]
    falAnalyticsDebug?: boolean
  }
}

function readEnv(name: string): string {
  const v = (import.meta.env[name] as string | undefined)?.trim() ?? ''
  return v
}

export function getAnalyticsIds() {
  return {
    gtmId: readEnv('VITE_GTM_ID'),
    gaMeasurementId: readEnv('VITE_GA_MEASUREMENT_ID'),
    metaPixelId: readEnv('VITE_META_PIXEL_ID'),
  }
}

export function hasAnalyticsIdsConfigured(
  ids = getAnalyticsIds(),
): boolean {
  return Boolean(ids.gtmId || ids.gaMeasurementId || ids.metaPixelId)
}

/** Pronto para disparar (consent + IDs). Scripts via marketingTags. */
export function canTrackAnalytics(
  opts: {
    marketingConsent?: boolean
    idsConfigured?: boolean
  } = {},
): boolean {
  const marketing =
    opts.marketingConsent ??
    (typeof window !== 'undefined' ? hasMarketingConsent() : false)
  const ids =
    opts.idsConfigured ?? hasAnalyticsIdsConfigured()
  return marketing && ids
}

let testSink: AnalyticsSink | null = null

/** Só testes — injeta sink observável. */
export function __setAnalyticsTestSink(sink: AnalyticsSink | null): void {
  testSink = sink
}

function pushDataLayer(event: AnalyticsEventName, payload: AnalyticsPayload): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event, ...payload })
}

/**
 * Dispara evento do funil. Sem consent/IDs → no-op.
 * Com IDs: empurra dataLayer (GTM/GA consomem após syncMarketingTags).
 */
export function track(
  event: AnalyticsEventName,
  payload: AnalyticsPayload = {},
): void {
  if (testSink) {
    testSink(event, payload)
    return
  }
  if (!canTrackAnalytics()) return
  pushDataLayer(event, payload)
  if (typeof window !== 'undefined' && window.falAnalyticsDebug) {
    // eslint-disable-next-line no-console
    console.debug('[fal-analytics]', event, payload)
  }
}

export function trackPageView(path: string, title?: string): void {
  const pageTitle =
    title ??
    (typeof document !== 'undefined' ? document.title : undefined)
  track('page_view', { page_path: path, page_title: pageTitle })
}

export function trackViewItem(input: {
  itemId: string
  itemName: string
  price?: number
  quantity?: number
}): void {
  track('view_item', {
    currency: 'BRL',
    value: input.price,
    items: [
      {
        item_id: input.itemId,
        item_name: input.itemName,
        price: input.price,
        quantity: input.quantity ?? 1,
      },
    ],
  })
}

export function trackAddToCart(input: {
  itemId: string
  itemName: string
  price?: number
  quantity: number
}): void {
  track('add_to_cart', {
    currency: 'BRL',
    value: input.price != null ? input.price * input.quantity : undefined,
    items: [
      {
        item_id: input.itemId,
        item_name: input.itemName,
        price: input.price,
        quantity: input.quantity,
      },
    ],
  })
}

export function trackBeginCheckout(input: {
  value?: number
  itemCount?: number
}): void {
  track('begin_checkout', {
    currency: 'BRL',
    value: input.value,
    items_count: input.itemCount,
  })
}

export function trackPurchase(input: {
  orderId: string
  value: number
  currency?: string
}): void {
  track('purchase', {
    transaction_id: input.orderId,
    value: input.value,
    currency: input.currency ?? 'BRL',
  })
}

/** Contagens do gate — incompat sempre separado de “a verificar”. */
export type CompatGateCounts = {
  unconfirmedCount: number
  incompatCount: number
  itemCount: number
}

export function trackCompatGateShown(counts: CompatGateCounts): void {
  track('compat_gate_shown', {
    unconfirmed_count: counts.unconfirmedCount,
    incompat_count: counts.incompatCount,
    items_count: counts.itemCount,
  })
}

export function trackCompatGateContinue(counts: CompatGateCounts): void {
  track('compat_gate_continue', {
    unconfirmed_count: counts.unconfirmedCount,
    incompat_count: counts.incompatCount,
    items_count: counts.itemCount,
  })
}

export function trackCompatGateCompleteVehicle(counts: CompatGateCounts): void {
  track('compat_gate_complete_vehicle', {
    unconfirmed_count: counts.unconfirmedCount,
    incompat_count: counts.incompatCount,
    items_count: counts.itemCount,
  })
}

export function trackCompatGateReplace(input: {
  productId: string
  incompatCount: number
}): void {
  track('compat_gate_replace', {
    item_id: input.productId,
    incompat_count: input.incompatCount,
  })
}

export function trackCompatItemReplaced(input: {
  fromProductId: string
  toProductId: string
  fromEquivalence?: boolean
}): void {
  track('compat_item_replaced', {
    from_item_id: input.fromProductId,
    to_item_id: input.toProductId,
    from_equivalence: Boolean(input.fromEquivalence),
  })
}

export function trackCompatOrderFitLog(input: {
  orderId: string
  unconfirmedCount: number
  incompatCount: number
}): void {
  track('compat_order_fit_log', {
    transaction_id: input.orderId,
    unconfirmed_count: input.unconfirmedCount,
    incompat_count: input.incompatCount,
  })
}
