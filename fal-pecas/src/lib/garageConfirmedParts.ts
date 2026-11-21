import {
  classifyCompatibility,
  type PvcCompatRow,
  type VehicleCompatInput,
} from '@/services/compatibility/compatibilityEngine'
import type { Product } from '@/types'

/** Mantém só produtos com compatibilidade confirmada via PVC completo. */
export function filterConfirmedCompatibleProducts(
  products: Product[],
  vehicle: VehicleCompatInput | null | undefined,
  pvcByProductId: Map<string, PvcCompatRow[]>,
): Product[] {
  if (!vehicle?.maker?.trim() || !vehicle?.model?.trim()) return []
  return products.filter((product) => {
    const rows = pvcByProductId.get(product.id) ?? []
    return classifyCompatibility(vehicle, rows).state === 'confirmed'
  })
}

/** Une páginas sem duplicar id (paginação searchCatalog → confirmed). */
export function mergeUniqueProductsById(
  existing: Product[],
  next: Product[],
): Product[] {
  if (!next.length) return existing
  const seen = new Set(existing.map((p) => p.id))
  const out = existing.slice()
  for (const p of next) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}
