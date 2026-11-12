import {
  DEFAULT_SHIPPING_ETA_POLICY,
  type ShippingEtaPolicy,
} from '@/lib/shippingEtaPolicy'
import { getSupabase } from '@/lib/supabase'

function rowToPolicy(row: Record<string, unknown>): ShippingEtaPolicy {
  return {
    dayCountMode:
      row.day_count_mode === 'calendar_days' ? 'calendar_days' : 'business_days',
    me: {
      prepDays: Number(row.me_prep_days ?? DEFAULT_SHIPPING_ETA_POLICY.me.prepDays) || 0,
      bufferDays: Number(row.me_buffer_days ?? 0) || 0,
      prepIncludedInCarrier: Boolean(row.me_prep_included_in_carrier),
    },
    own: {
      dayCountMode:
        row.own_day_count_mode === 'calendar_days' ? 'calendar_days' : 'business_days',
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
  const { data: existing, error: readErr } = await getSupabase()
    .from('store_shipping_eta_policy')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (readErr) throw readErr

  const payload = {
    day_count_mode: policy.dayCountMode,
    me_prep_days: policy.me.prepDays,
    me_buffer_days: policy.me.bufferDays,
    me_prep_included_in_carrier: policy.me.prepIncludedInCarrier,
    own_day_count_mode: policy.own.dayCountMode,
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
