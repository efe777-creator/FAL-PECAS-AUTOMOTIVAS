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
