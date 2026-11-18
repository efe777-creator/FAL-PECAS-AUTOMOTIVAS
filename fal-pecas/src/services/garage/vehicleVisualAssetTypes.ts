export type VisualAssetFormat = 'glb' | 'gltf'
export type VisualAssetSource = 'acquired' | 'ai' | 'first_party'
/** review = fila humana; retired = arquivado (preferir sobre revoked). */
export type VisualAssetStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'revoked'
  | 'retired'
export type VisualCompatStatus = 'pending' | 'approved' | 'rejected' | 'revoked'

export type VehicleVisualAsset = {
  id: string
  code: string
  displayName: string
  storagePath: string
  format: VisualAssetFormat
  polyCount: number | null
  textureBudgetMb: number | null
  source: VisualAssetSource
  vendor: string | null
  license: string | null
  commercialOk: boolean
  redistributeOk: boolean
  version: string
  status: VisualAssetStatus
  approvedAt: string | null
}

/** IA / draft nunca conta como “aprovado comercial” automático. */
export function assetReadyForPublicViewer(
  asset: Pick<VehicleVisualAsset, 'status' | 'source' | 'commercialOk'>,
): boolean {
  if (asset.status !== 'approved') return false
  if (asset.source === 'ai' && !asset.commercialOk) return false
  return true
}

export type CompatMatchInput = {
  manufacturerId: string | null
  modelId: string | null
  versionId: string | null
  year: number | null
  generation?: string | null
  bodyStyle?: string | null
  facelift?: string | null
}

export type CompatRow = {
  manufacturerId: string | null
  modelId: string | null
  versionId: string | null
  yearFrom: number | null
  yearTo: number | null
  generation?: string | null
  bodyStyle?: string | null
  facelift?: string | null
  status: VisualCompatStatus
}

export function compatMatchesIdentity(row: CompatRow, id: CompatMatchInput): boolean {
  if (row.status !== 'approved') return false
  if (row.manufacturerId && row.manufacturerId !== id.manufacturerId) return false
  if (row.modelId && row.modelId !== id.modelId) return false
  if (row.versionId && row.versionId !== id.versionId) return false
  if (row.yearFrom != null && id.year != null && row.yearFrom > id.year) return false
  if (row.yearTo != null && id.year != null && row.yearTo < id.year) return false
  if (row.generation && id.generation && row.generation.toLowerCase() !== id.generation.toLowerCase()) {
    return false
  }
  if (row.bodyStyle && id.bodyStyle && row.bodyStyle.toLowerCase() !== id.bodyStyle.toLowerCase()) {
    return false
  }
  // Facelift na compat exige igualdade quando a identity informa facelift;
  // se a identity não tem facelift, linhas com facelift preenchido não casam.
  if (row.facelift && row.facelift.trim()) {
    if (!id.facelift || row.facelift.toLowerCase() !== id.facelift.toLowerCase()) return false
  }
  return true
}

export function visualAssetsNeverWrite2A(): true {
  return true
}
