import { getSupabase } from '@/lib/supabase'

export type OwnDeliveryCepRange = { from: string; to: string }

export type OwnDeliveryRate = {
  id: string
  serviceCode: string
  label: string
  amount: number
  etaDaysMin: number
  etaDaysMax: number
}

export type OwnDeliverySettings = {
  id: string
  enabled: boolean
  coverageLabel: string
  cepRanges: OwnDeliveryCepRange[]
  rates: OwnDeliveryRate[]
}

type Row = {
  id: string
  enabled: boolean
  coverage_label: string
  cep_ranges: OwnDeliveryCepRange[] | null
  rates: OwnDeliveryRate[] | null
}

function onlyDigits8(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8)
}

function map(row: Row): OwnDeliverySettings {
  return {
    id: String(row.id),
    enabled: Boolean(row.enabled),
    coverageLabel: row.coverage_label || 'São Paulo — capital',
    cepRanges: Array.isArray(row.cep_ranges) ? row.cep_ranges : [],
    rates: Array.isArray(row.rates) ? row.rates : [],
  }
}

export function cepInOwnDeliveryRanges(postalCode: string, ranges: OwnDeliveryCepRange[]): boolean {
  const digits = onlyDigits8(postalCode)
  if (digits.length !== 8) return false
  return ranges.some((r) => {
    const from = onlyDigits8(r.from)
    const to = onlyDigits8(r.to)
    return from.length === 8 && to.length === 8 && digits >= from && digits <= to
  })
}

export async function getOwnDeliverySettings(): Promise<OwnDeliverySettings | null> {
  const { data, error } = await getSupabase()
    .from('store_own_delivery_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? map(data as Row) : null
}

export async function upsertOwnDeliverySettings(input: {
  id?: string
  enabled: boolean
  coverageLabel: string
  cepRanges: OwnDeliveryCepRange[]
  rates: OwnDeliveryRate[]
}): Promise<OwnDeliverySettings> {
  if (!input.coverageLabel.trim()) throw new Error('Informe o rótulo de cobertura.')
  if (!input.cepRanges.length) throw new Error('Informe ao menos uma faixa de CEP.')
  for (const r of input.cepRanges) {
    if (onlyDigits8(r.from).length !== 8 || onlyDigits8(r.to).length !== 8) {
      throw new Error('Faixas de CEP devem ter 8 dígitos (de/até).')
    }
  }
  if (!input.rates.length) throw new Error('Informe ao menos uma modalidade na tabela.')
  for (const rate of input.rates) {
    if (!rate.id.startsWith('own:')) throw new Error(`ID da modalidade deve começar com own: (${rate.id})`)
    if (!rate.label.trim()) throw new Error('Label da modalidade obrigatório.')
    if (!(rate.amount >= 0)) throw new Error('Valor da modalidade inválido.')
  }

  const payload = {
    enabled: input.enabled,
    coverage_label: input.coverageLabel.trim(),
    cep_ranges: input.cepRanges.map((r) => ({
      from: onlyDigits8(r.from),
      to: onlyDigits8(r.to),
    })),
    rates: input.rates.map((r) => ({
      id: r.id.trim(),
      serviceCode: r.serviceCode.trim() || 'fal_sp',
      label: r.label.trim(),
      amount: Number(r.amount),
      etaDaysMin: Number(r.etaDaysMin) || 1,
      etaDaysMax: Number(r.etaDaysMax) || 3,
    })),
    updated_at: new Date().toISOString(),
  }

  const existing = input.id ? { id: input.id } : await getOwnDeliverySettings()
  const q = getSupabase().from('store_own_delivery_settings')
  const { data, error } = existing?.id
    ? await q.update(payload).eq('id', existing.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}
