import { getSupabase } from '@/lib/supabase'
import type { OwnPricingMode, Product } from '@/types'
import { adminListProducts, adminUpsertProduct } from '@/services/admin/adminProductService'

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
  pricingMode: OwnPricingMode
  maxDistanceKm: number | null
  etaDaysMin: number
  etaDaysMax: number
}

export type OwnVehicleCategory = {
  id: string
  code: string
  label: string
  icon: string
  capacityPol: number
  maxDistanceKm: number | null
  sortOrder: number
  active: boolean
}

export type OwnVehicleTariff = {
  id: string
  categoryId: string
  tarifaMinima: number
  valorPorKm: number
  adicional: number
  active: boolean
  version: number
}

type SettingsRow = {
  id: string
  enabled: boolean
  coverage_label: string
  cep_ranges: OwnDeliveryCepRange[] | null
  rates: OwnDeliveryRate[] | null
  pricing_mode?: string | null
  max_distance_km?: number | null
  eta_days_min?: number | null
  eta_days_max?: number | null
}

function onlyDigits8(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8)
}

function slugCode(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
}

function mapSettings(row: SettingsRow): OwnDeliverySettings {
  return {
    id: String(row.id),
    enabled: Boolean(row.enabled),
    coverageLabel: row.coverage_label || 'São Paulo — capital',
    cepRanges: Array.isArray(row.cep_ranges) ? row.cep_ranges : [],
    rates: Array.isArray(row.rates) ? row.rates : [],
    pricingMode: row.pricing_mode === 'distance_vehicle' ? 'distance_vehicle' : 'flat',
    maxDistanceKm: row.max_distance_km == null ? null : Number(row.max_distance_km),
    etaDaysMin: Number(row.eta_days_min) || 1,
    etaDaysMax: Number(row.eta_days_max) || 3,
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
  return data ? mapSettings(data as SettingsRow) : null
}

export async function upsertOwnDeliverySettings(input: {
  id?: string
  enabled: boolean
  coverageLabel: string
  cepRanges: OwnDeliveryCepRange[]
  rates: OwnDeliveryRate[]
  pricingMode: OwnPricingMode
  maxDistanceKm: number | null
  etaDaysMin: number
  etaDaysMax: number
}): Promise<OwnDeliverySettings> {
  if (!input.coverageLabel.trim()) throw new Error('Informe o rótulo de cobertura.')
  if (!input.cepRanges.length) throw new Error('Informe ao menos uma faixa de CEP.')
  for (const r of input.cepRanges) {
    if (onlyDigits8(r.from).length !== 8 || onlyDigits8(r.to).length !== 8) {
      throw new Error('Faixas de CEP devem ter 8 dígitos (de/até).')
    }
  }
  if (input.pricingMode === 'flat') {
    if (!input.rates.length) throw new Error('Informe ao menos uma modalidade na tabela flat.')
    for (const rate of input.rates) {
      if (!rate.id.startsWith('own:')) throw new Error(`ID da modalidade deve começar com own: (${rate.id})`)
      if (!rate.label.trim()) throw new Error('Label da modalidade obrigatório.')
      if (!(rate.amount >= 0)) throw new Error('Valor da modalidade inválido.')
    }
  }
  if (input.maxDistanceKm != null && !(input.maxDistanceKm > 0)) {
    throw new Error('Distância máxima inválida.')
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
    pricing_mode: input.pricingMode,
    max_distance_km: input.maxDistanceKm,
    eta_days_min: input.etaDaysMin,
    eta_days_max: input.etaDaysMax,
    updated_at: new Date().toISOString(),
  }

  const existing = input.id ? { id: input.id } : await getOwnDeliverySettings()
  const q = getSupabase().from('store_own_delivery_settings')
  const { data, error } = existing?.id
    ? await q.update(payload).eq('id', existing.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return mapSettings(data as SettingsRow)
}

function mapCategory(r: Record<string, unknown>): OwnVehicleCategory {
  return {
    id: String(r.id),
    code: String(r.code),
    label: String(r.label),
    icon: String(r.icon ?? 'vehicle'),
    capacityPol: Number(r.capacity_pol),
    maxDistanceKm: r.max_distance_km == null ? null : Number(r.max_distance_km),
    sortOrder: Number(r.sort_order),
    active: Boolean(r.active),
  }
}

export async function listOwnVehicleCategories(): Promise<OwnVehicleCategory[]> {
  const { data, error } = await getSupabase()
    .from('own_vehicle_categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((r) => mapCategory(r as Record<string, unknown>))
}

export async function upsertOwnVehicleCategory(input: {
  id?: string
  code?: string
  label: string
  icon: string
  capacityPol: number
  maxDistanceKm: number | null
  sortOrder: number
  active: boolean
}): Promise<OwnVehicleCategory> {
  if (!input.label.trim()) throw new Error('Nome da modalidade obrigatório.')
  if (!(input.capacityPol > 0)) throw new Error('Capacidade POL inválida.')
  if (input.maxDistanceKm != null && !(input.maxDistanceKm > 0)) {
    throw new Error('Km máximo inválido.')
  }
  const code = (input.code?.trim() || slugCode(input.label) || `veiculo_${Date.now()}`).slice(0, 40)
  const payload = {
    code,
    label: input.label.trim(),
    icon: input.icon.trim() || 'vehicle',
    capacity_pol: input.capacityPol,
    max_distance_km: input.maxDistanceKm,
    sort_order: input.sortOrder,
    active: input.active,
    updated_at: new Date().toISOString(),
  }
  const q = getSupabase().from('own_vehicle_categories')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return mapCategory(data as Record<string, unknown>)
}

export async function deleteOwnVehicleCategory(id: string): Promise<void> {
  const { error } = await getSupabase().from('own_vehicle_categories').delete().eq('id', id)
  if (error) throw error
}

function mapTariff(r: Record<string, unknown>): OwnVehicleTariff {
  return {
    id: String(r.id),
    categoryId: String(r.category_id),
    tarifaMinima: Number(r.tarifa_minima),
    valorPorKm: Number(r.valor_por_km),
    adicional: Number(r.adicional ?? 0),
    active: Boolean(r.active),
    version: Number(r.version) || 1,
  }
}

export async function listOwnVehicleTariffs(): Promise<OwnVehicleTariff[]> {
  const { data, error } = await getSupabase().from('own_vehicle_tariffs').select('*').order('created_at')
  if (error) throw error
  return (data ?? []).map((r) => mapTariff(r as Record<string, unknown>))
}

export async function createOwnVehicleTariff(input: {
  categoryId: string
  tarifaMinima: number
  valorPorKm: number
  adicional: number
  active: boolean
}): Promise<OwnVehicleTariff> {
  if (!(input.tarifaMinima >= 0) || !(input.valorPorKm >= 0) || !(input.adicional >= 0)) {
    throw new Error('Tarifa inválida.')
  }
  const { data: prev } = await getSupabase()
    .from('own_vehicle_tariffs')
    .select('version')
    .eq('category_id', input.categoryId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const version = (prev?.version ? Number(prev.version) : 0) + 1

  if (input.active) {
    await getSupabase()
      .from('own_vehicle_tariffs')
      .update({ active: false })
      .eq('category_id', input.categoryId)
      .eq('active', true)
  }

  const { data, error } = await getSupabase()
    .from('own_vehicle_tariffs')
    .insert({
      category_id: input.categoryId,
      tarifa_minima: input.tarifaMinima,
      valor_por_km: input.valorPorKm,
      adicional: input.adicional,
      active: input.active,
      version,
    })
    .select()
    .single()
  if (error) throw error
  return mapTariff(data as Record<string, unknown>)
}

/** Atualiza a tarifa ativa em lugar (ou cria versão se preferir histórico). Aqui edita a linha ativa. */
export async function updateOwnVehicleTariff(input: {
  id: string
  tarifaMinima: number
  valorPorKm: number
  adicional: number
  active: boolean
}): Promise<OwnVehicleTariff> {
  if (!(input.tarifaMinima >= 0) || !(input.valorPorKm >= 0) || !(input.adicional >= 0)) {
    throw new Error('Tarifa inválida.')
  }
  const { data, error } = await getSupabase()
    .from('own_vehicle_tariffs')
    .update({
      tarifa_minima: input.tarifaMinima,
      valor_por_km: input.valorPorKm,
      adicional: input.adicional,
      active: input.active,
    })
    .eq('id', input.id)
    .select()
    .single()
  if (error) throw error
  return mapTariff(data as Record<string, unknown>)
}

export async function deleteOwnVehicleTariff(id: string): Promise<void> {
  const { error } = await getSupabase().from('own_vehicle_tariffs').delete().eq('id', id)
  if (error) throw error
}

export async function listOwnManualReviews(limit = 50) {
  const { data, error } = await getSupabase()
    .from('own_manual_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function listOwnAdminAudit(limit = 50) {
  const { data, error } = await getSupabase()
    .from('own_admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/** Lista produtos para gestão POL na Logística (mesma tabela products). */
export async function listProductsForOwnPol(params?: {
  q?: string
  status?: string
  missingPol?: boolean
}): Promise<Product[]> {
  const rows = await adminListProducts({
    q: params?.q,
    status: params?.status,
  })
  if (params?.missingPol) return rows.filter((p) => p.polUnit == null)
  return rows
}

export async function saveProductPol(input: {
  product: Product
  polUnit: number | null
  logisticPorte: Product['logisticPorte']
  vehicleMinCode: string | null
  compatibleVehicleCodes: string[]
  ownDeliveryAllowed: boolean
}): Promise<Product> {
  return adminUpsertProduct({
    id: input.product.id,
    name: input.product.name,
    sku: input.product.sku,
    commercialRef: input.product.commercialRef,
    categoryId: input.product.categoryId ?? null,
    brandId: input.product.brandId ?? null,
    supplierId: input.product.supplierId ?? null,
    price: input.product.price,
    promoPrice: input.product.promoPrice ?? null,
    status: input.product.status,
    shortDescription: input.product.shortDescription,
    description: input.product.description,
    posicao: input.product.posicao,
    lado: input.product.lado,
    isAvailable: input.product.available,
    weightKg: input.product.weightKg,
    heightCm: input.product.heightCm,
    widthCm: input.product.widthCm,
    lengthCm: input.product.lengthCm,
    weightOrigin: input.product.weightOrigin,
    heightOrigin: input.product.heightOrigin,
    widthOrigin: input.product.widthOrigin,
    lengthOrigin: input.product.lengthOrigin,
    polUnit: input.polUnit,
    logisticPorte: input.logisticPorte,
    vehicleMinCode: input.vehicleMinCode,
    compatibleVehicleCodes: input.compatibleVehicleCodes,
    ownDeliveryAllowed: input.ownDeliveryAllowed,
    polOrigin: 'manual',
    logisticProfileOrigin: 'manual',
    syncBasePromoLists: false,
  })
}

export const OWN_VEHICLE_ICON_OPTIONS = [
  { value: 'motorcycle', label: 'Motocicleta' },
  { value: 'car', label: 'Carro' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Caminhão' },
  { value: 'utilitario', label: 'Utilitário' },
  { value: 'vehicle', label: 'Genérico' },
] as const
