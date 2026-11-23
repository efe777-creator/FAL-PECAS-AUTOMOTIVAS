/**
 * Porta para futura API de mestre veicular (fonte estável).
 * Hoje o cadastro é operado na guia admin; sync/CSV/fipeX são provisórios.
 * Quando a API existir: implementar `syncFromMasterApi` e passar a gravar
 * evidence_kind = 'master_api' via setModelQualityStatus / upsert canônico.
 */

export type VehicleMasterSyncResult = {
  modelsTouched: number
  versionsTouched: number
  source: 'master_api'
}

export type VehicleMasterProvider = {
  /** true quando credenciais/endpoint estiverem configurados. */
  isConfigured(): boolean
  /** Sincroniza mestre a partir da API. Fail-closed se não configurado. */
  syncCatalog(opts?: { since?: string }): Promise<VehicleMasterSyncResult>
}

export const pendingVehicleMasterProvider: VehicleMasterProvider = {
  isConfigured() {
    return false
  },
  async syncCatalog() {
    throw new Error(
      'API de mestre veicular ainda não configurada — use a guia admin (staff_override) até a fonte estável.',
    )
  },
}

/** Evidence kinds aceitos pelo RPC (contrato). */
export const VEHICLE_QUALITY_EVIDENCE_KINDS = [
  'staff_override',
  'master_api',
  'oem_a1',
  'a2_concordant',
] as const

export type VehicleQualityEvidenceKind = (typeof VEHICLE_QUALITY_EVIDENCE_KINDS)[number]

/** Override operacional na guia — sem URL. */
export const STAFF_QUALITY_EVIDENCE_KIND: VehicleQualityEvidenceKind = 'staff_override'
