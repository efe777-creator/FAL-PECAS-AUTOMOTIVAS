import {
  DEFAULT_SHIPPING_ETA_POLICY,
  type ShippingEtaPolicy,
} from '@/lib/shippingEtaPolicy'
import { getSupabase } from '@/lib/supabase'

function rowToPolicy(row: Record<string, unknown>): ShippingEtaPolicy {
  const buffer = Number(row.me_buffer_days ?? 0) || 0
  const prep = Number(row.me_prep_days ?? 0) || 0
  const prepIncluded = row.me_prep_included_in_carrier !== false
  const legacyExtra = prepIncluded ? buffer : buffer + prep
  const extra = Math.max(0, legacyExtra)
  return {
    dayCountMode:
      row.day_count_mode === 'calendar_days' ? 'calendar_days' : 'business_days',
    me: {
      extraDays: extra,
      prepDays: 0,
      bufferDays: extra,
      prepIncludedInCarrier: true,
    },
    own: {
      dayCountMode:
        row.own_day_count_mode === 'calendar_days' ? 'calendar_days' : 'business_days',
      extraDays: Math.max(0, Number(row.own_extra_days ?? 0) || 0),
    },
    mock: {
      economicMin: Number(row.mock_economic_min ?? 5) || 0,
      economicMax: Number(row.mock_economic_max ?? 8) || 0,
      expressMin: Number(row.mock_express_min ?? 2) || 0,
      expressMax: Number(row.mock_express_max ?? 4) || 0,
    },
    pickup: {
      availableInDaysMin: Number(row.pickup_days_min ?? 0) || 0,
      availableInDaysMax: Number(row.pickup_days_max ?? 1) || 0,
    },
  }
}

export async function getShippingEtaPolicy(): Promise<ShippingEtaPolicy> {
  const { data, error } = await getSupabase()
    .from('store_shipping_eta_policy')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return { ...DEFAULT_SHIPPING_ETA_POLICY }
  return rowToPolicy(data as Record<string, unknown>)
}

export async function saveShippingEtaPolicy(policy: ShippingEtaPolicy): Promise<ShippingEtaPolicy> {
  const extra = Math.max(0, policy.me.extraDays)
  const { data: existing, error: readErr } = await getSupabase()
    .from('store_shipping_eta_policy')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (readErr) throw readErr

  const payload = {
    day_count_mode: policy.dayCountMode,
    me_prep_days: 0,
    me_buffer_days: extra,
    me_prep_included_in_carrier: true,
    own_day_count_mode: policy.own.dayCountMode,
    own_extra_days: Math.max(0, policy.own.extraDays),
    mock_economic_min: policy.mock.economicMin,
    mock_economic_max: policy.mock.economicMax,
    mock_express_min: policy.mock.expressMin,
    mock_express_max: policy.mock.expressMax,
    pickup_days_min: policy.pickup.availableInDaysMin,
    pickup_days_max: policy.pickup.availableInDaysMax,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await getSupabase()
      .from('store_shipping_eta_policy')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return rowToPolicy(data as Record<string, unknown>)
  }

  const { data, error } = await getSupabase()
    .from('store_shipping_eta_policy')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return rowToPolicy(data as Record<string, unknown>)
}

/** Última cotação ME — prazos reais (carrier) por serviço, se existirem. */
export type MeQuoteEtaSample = {
  serviceId: number
  name: string
  carrierMin: number
  carrierMax: number
  quotedAt: string | null
}

export async function listRecentMeCarrierEtas(limit = 12): Promise<MeQuoteEtaSample[]> {
  const { data, error } = await getSupabase()
    .from('shipping_quotes')
    .select('created_at, options')
    .eq('provider', 'melhorenvio')
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = (data ?? [])[0] as { created_at?: string; options?: unknown } | undefined
  if (!row || !Array.isArray(row.options)) return []
  const out: MeQuoteEtaSample[] = []
  for (const raw of row.options.slice(0, limit)) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const serviceId = Number(o.service_id ?? 0)
    if (!serviceId) continue
    const fal = o.fal_policy && typeof o.fal_policy === 'object'
      ? (o.fal_policy as Record<string, unknown>)
      : null
    const extraAlready = Number(fal?.extra_days ?? fal?.buffer_days_applied ?? 0) || 0
    let carrierMin = Number(o.carrier_eta_min ?? NaN)
    let carrierMax = Number(o.carrier_eta_max ?? NaN)
    if (Number.isNaN(carrierMin)) {
      carrierMin = Math.max(0, Number(o.eta_days_min ?? 0) - extraAlready)
    }
    if (Number.isNaN(carrierMax)) {
      carrierMax = Math.max(carrierMin, Number(o.eta_days_max ?? carrierMin) - extraAlready)
    }
    out.push({
      serviceId,
      name: String(o.name ?? `Serviço ${serviceId}`),
      carrierMin: Math.max(0, carrierMin),
      carrierMax: Math.max(0, carrierMax),
      quotedAt: row.created_at ?? null,
    })
  }
  return out
}
