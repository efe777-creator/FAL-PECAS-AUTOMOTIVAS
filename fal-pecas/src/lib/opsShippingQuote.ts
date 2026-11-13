/** Cotação original (checkout) vs operacional (ops_quotes) — frete do cliente imutável. */

import { listContractedVolumeRaw, parseVolumeDims } from '@/lib/orderPacking'

export type CheckoutQuoteSnapshot = {
  label: string | null
  company: string | null
  serviceId: number | null
  serviceCode: string | null
  amount: number | null
  quoteId: string | null
  volumes: Array<{
    lengthCm: number
    widthCm: number
    heightCm: number
    weightKg: number
  }>
  volumeCount: number
  totalWeightKg: number | null
  frozenAt: string | null
}

export type OpsQuoteOption = {
  serviceId: number
  company: string | null
  name: string | null
  price: number
  deliveryTime: string | null
}

export type OpsQuoteEntry = {
  at: string
  by: string | null
  volumes: CheckoutQuoteSnapshot['volumes']
  options: OpsQuoteOption[]
  selectedServiceId: number | null
  quotedAmount: number | null
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function volumesFromMeta(meta: Record<string, unknown> | null | undefined) {
  const out: CheckoutQuoteSnapshot['volumes'] = []
  for (const raw of listContractedVolumeRaw(meta ?? null)) {
    const d = parseVolumeDims(raw)
    if (d) out.push(d)
  }
  return out
}

/** Congela snapshot a partir do metadata atual (sem inventar se já existe checkout_quote). */
export function ensureCheckoutQuoteFromMeta(
  metadata: Record<string, unknown> | null | undefined,
  chargedShipping?: number | null,
): CheckoutQuoteSnapshot {
  const meta = metadata && typeof metadata === 'object' ? metadata : {}
  const existing = meta.checkout_quote
  if (existing && typeof existing === 'object') {
    return parseCheckoutQuote(existing as Record<string, unknown>, chargedShipping)
  }
  const me = meta.me && typeof meta.me === 'object' ? (meta.me as Record<string, unknown>) : {}
  const volumes = volumesFromMeta(meta)
  const totalWeight =
    volumes.reduce((s, v) => s + v.weightKg, 0) || num(me.weightKg) || null
  const label = str(meta.label)
  const company = label?.includes('—')
    ? label.split('—')[0]?.trim() ?? null
    : label?.includes('-')
      ? label.split('-')[0]?.trim() ?? null
      : null
  return {
    label,
    company,
    serviceId: num(meta.service_id ?? me.service_id),
    serviceCode: str(meta.service_code ?? meta.serviceCode),
    amount: num(meta.charged_shipping ?? chargedShipping ?? me.quoted_amount),
    quoteId: str(meta.quote_id ?? me.checkout_snapshot_ref),
    volumes,
    volumeCount: volumes.length,
    totalWeightKg: totalWeight,
    frozenAt: new Date().toISOString(),
  }
}

export function parseCheckoutQuote(
  raw: Record<string, unknown>,
  chargedFallback?: number | null,
): CheckoutQuoteSnapshot {
  const volumes: CheckoutQuoteSnapshot['volumes'] = []
  const volsRaw = raw.volumes
  if (Array.isArray(volsRaw)) {
    for (const v of volsRaw) {
      const d = parseVolumeDims(v)
      if (d) volumes.push(d)
    }
  } else {
    const d = parseVolumeDims(volsRaw)
    if (d) volumes.push(d)
  }
  return {
    label: str(raw.label),
    company: str(raw.company),
    serviceId: num(raw.service_id ?? raw.serviceId),
    serviceCode: str(raw.service_code ?? raw.serviceCode),
    amount: num(raw.amount ?? raw.charged_shipping) ?? num(chargedFallback),
    quoteId: str(raw.quote_id ?? raw.quoteId),
    volumes,
    volumeCount: num(raw.volume_count) ?? volumes.length,
    totalWeightKg:
      num(raw.total_weight_kg ?? raw.totalWeightKg) ??
      (volumes.length ? volumes.reduce((s, v) => s + v.weightKg, 0) : null),
    frozenAt: str(raw.frozen_at ?? raw.frozenAt),
  }
}

export function parseOpsQuotes(
  metadata: Record<string, unknown> | null | undefined,
): OpsQuoteEntry[] {
  const raw = metadata?.ops_quotes
  if (!Array.isArray(raw)) return []
  const out: OpsQuoteEntry[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const volumes: OpsQuoteEntry['volumes'] = []
    if (Array.isArray(o.volumes)) {
      for (const v of o.volumes) {
        const d = parseVolumeDims(v)
        if (d) volumes.push(d)
      }
    }
    const options: OpsQuoteOption[] = []
    if (Array.isArray(o.options)) {
      for (const opt of o.options) {
        if (!opt || typeof opt !== 'object') continue
        const x = opt as Record<string, unknown>
        const serviceId = num(x.service_id ?? x.id ?? x.serviceId)
        const price = num(x.price ?? x.amount)
        if (serviceId == null || price == null) continue
        options.push({
          serviceId,
          company: str(x.company),
          name: str(x.name ?? x.service),
          price,
          deliveryTime: str(x.delivery_time ?? x.deliveryTime),
        })
      }
    }
    out.push({
      at: str(o.at) ?? '',
      by: str(o.by),
      volumes,
      options,
      selectedServiceId: num(o.selected_service_id ?? o.selectedServiceId),
      quotedAmount: num(o.quoted_amount ?? o.quotedAmount),
    })
  }
  return out.filter((e) => e.at)
}

export function latestOpsQuote(
  metadata: Record<string, unknown> | null | undefined,
): OpsQuoteEntry | null {
  const list = parseOpsQuotes(metadata)
  return list.length ? list[list.length - 1]! : null
}

export function checkoutQuoteToJson(q: CheckoutQuoteSnapshot): Record<string, unknown> {
  return {
    label: q.label,
    company: q.company,
    service_id: q.serviceId,
    service_code: q.serviceCode,
    amount: q.amount,
    quote_id: q.quoteId,
    volumes: q.volumes,
    volume_count: q.volumeCount,
    total_weight_kg: q.totalWeightKg,
    frozen_at: q.frozenAt,
  }
}
