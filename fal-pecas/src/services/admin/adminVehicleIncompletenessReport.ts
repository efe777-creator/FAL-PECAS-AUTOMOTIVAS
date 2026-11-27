import { getSupabase } from '@/lib/supabase'

export type VehicleIncompletenessReport = {
  totalActiveVersions: number
  withoutEngine: number
  withoutVersionName: number
  withoutFuel: number
  withoutTransmission: number
  withoutTraction: number
  withoutBodyConfiguration: number
  withoutYear: number
  generatedAt: string
}

/**
 * Relatório de incompletude do mestre (Fase 6).
 * Contagens no momento da consulta — não usa números fixos da auditoria.
 */
export async function adminFetchVehicleIncompletenessReport(): Promise<VehicleIncompletenessReport> {
  const sb = getSupabase()
  const base = () =>
    sb.from('vehicle_versions').select('id', { count: 'exact', head: true }).eq('status', 'active')

  const [
    total,
    withoutEngine,
    withoutVersionName,
    withoutFuel,
    withoutTransmission,
    withoutTraction,
    withoutBody,
    withoutYear,
  ] = await Promise.all([
    base(),
    base().or('engine.is.null,engine.eq.'),
    base().or('version_name.is.null,version_name.eq.'),
    base().is('fuel', null),
    base().is('transmission', null),
    base().is('traction', null),
    base().is('body_configuration', null),
    base().is('year', null),
  ])

  for (const r of [
    total,
    withoutEngine,
    withoutVersionName,
    withoutFuel,
    withoutTransmission,
    withoutTraction,
    withoutBody,
    withoutYear,
  ]) {
    if (r.error) throw r.error
  }

  return {
    totalActiveVersions: total.count ?? 0,
    withoutEngine: withoutEngine.count ?? 0,
    withoutVersionName: withoutVersionName.count ?? 0,
    withoutFuel: withoutFuel.count ?? 0,
    withoutTransmission: withoutTransmission.count ?? 0,
    withoutTraction: withoutTraction.count ?? 0,
    withoutBodyConfiguration: withoutBody.count ?? 0,
    withoutYear: withoutYear.count ?? 0,
    generatedAt: new Date().toISOString(),
  }
}
