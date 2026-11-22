import { getSupabase } from '@/lib/supabase'

export type VehicleMasterStats = {
  manufacturersActive: number
  modelsActive: number
  versionsActive: number
  /** Modelos com production_year_start preenchido (vida de linha). */
  modelsWithProductionYears: number
}

async function countActive(table: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

/** Contagens ativas do mestre (montadoras / modelos / vehicle_versions). */
export async function adminFetchVehicleMasterStats(): Promise<VehicleMasterStats> {
  const [manufacturersActive, modelsActive, versionsActive, withLife] = await Promise.all([
    countActive('manufacturers'),
    countActive('models'),
    countActive('vehicle_versions'),
    getSupabase()
      .from('models')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('production_year_start', 'is', null),
  ])
  if (withLife.error) throw withLife.error
  return {
    manufacturersActive,
    modelsActive,
    versionsActive,
    modelsWithProductionYears: withLife.count ?? 0,
  }
}
