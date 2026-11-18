/** Limites iniciais G3 (proposta eFe) — Storage galeria pessoal. */
export const VEHICLE_ASSET_MAX_PER_VEHICLE = 8
export const VEHICLE_ASSET_MAX_BYTES = 5 * 1024 * 1024
export const VEHICLE_ASSET_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const VEHICLE_ASSET_BUCKET = 'customer-vehicle-images'
export const VEHICLE_ASSET_SIGNED_TTL_SEC = 3600

export function validateVehicleAssetFile(file: File): string | null {
  const mime = (file.type || '').toLowerCase()
  if (!(VEHICLE_ASSET_ALLOWED_MIME as readonly string[]).includes(mime)) {
    return 'Formato inválido. Use JPEG, PNG ou WebP.'
  }
  if (file.size <= 0 || file.size > VEHICLE_ASSET_MAX_BYTES) {
    return 'Arquivo deve ter no máximo 5 MB.'
  }
  return null
}

export function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}
