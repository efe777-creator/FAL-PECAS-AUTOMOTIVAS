import type { VehicleModel, VehicleVersion } from '@/types'
import { effectiveVehicleClass } from '@/lib/vehicles/normalizeVehicleBodyConfig'

export type AdminVehicleModelFilters = {
  searchName?: string
  makerId?: string
  year?: string
  quality?: string
  status?: string
  fuel?: string
  transmission?: string
  traction?: string
  /** Classe efetiva (versão ou modelo). */
  vehicleClass?: string
  bodyConfiguration?: string
  /** Fonte da VV: admin | import | plate. */
  source?: string
}

function blank(v: string | null | undefined): boolean {
  return v == null || !String(v).trim()
}

/**
 * Filtro puro da listagem admin de modelos.
 * Campo vazio = todos. Valor escolhido não inclui NULL (exceto quando o valor é literalmente vazio — não usamos isso).
 * Modelo entra se alguma versão ativa casa (ou se o critério é só do modelo).
 */
export function filterAdminVehicleModels(
  models: VehicleModel[],
  versionsByModelId: Map<string, VehicleVersion[]>,
  makerNameById: Map<string, string>,
  filters: AdminVehicleModelFilters,
  opts?: {
    qualityLabel?: (q: VehicleModel['qualityStatus']) => string
    statusLabel?: (s: VehicleModel['status']) => string
  },
): VehicleModel[] {
  const q = (filters.searchName ?? '').trim().toLowerCase()
  const yearN = (filters.year ?? '').trim() ? Number((filters.year ?? '').trim()) : null
  const yearOk = yearN != null && Number.isInteger(yearN)
  const makerId = (filters.makerId ?? '').trim()
  const quality = (filters.quality ?? '').trim()
  const status = (filters.status ?? '').trim()
  const fuel = (filters.fuel ?? '').trim()
  const transmission = (filters.transmission ?? '').trim()
  const traction = (filters.traction ?? '').trim()
  const vehicleClass = (filters.vehicleClass ?? '').trim()
  const bodyConfiguration = (filters.bodyConfiguration ?? '').trim()
  const source = (filters.source ?? '').trim()

  const needsVv =
    yearOk ||
    Boolean(fuel) ||
    Boolean(transmission) ||
    Boolean(traction) ||
    Boolean(bodyConfiguration) ||
    Boolean(source) ||
    Boolean(vehicleClass)

  return models.filter((m) => {
    if (makerId && m.manufacturerId !== makerId) return false
    if (quality && (m.qualityStatus ?? 'review') !== quality) return false
    if (status && m.status !== status) return false

    const vvs = versionsByModelId.get(m.id) ?? []

    if (needsVv) {
      const match = vvs.some((v) => {
        if (v.status === 'inactive') return false
        if (yearOk && v.year !== yearN) return false
        if (fuel && (v.fuel ?? '') !== fuel) return false
        if (transmission && (v.transmission ?? '') !== transmission) return false
        if (traction && (v.traction ?? '') !== traction) return false
        if (bodyConfiguration && (v.bodyConfiguration ?? '') !== bodyConfiguration) {
          return false
        }
        if (source && (v.source ?? '') !== source) return false
        if (vehicleClass) {
          const eff = effectiveVehicleClass(v.vehicleClass, m.vehicleClass)
          if (eff !== vehicleClass) return false
        }
        return true
      })
      // Classe só no modelo (sem VV): ainda casa se o modelo tem a classe e não há filtro de VV dimensional
      if (!match) {
        if (
          vehicleClass &&
          !yearOk &&
          !fuel &&
          !transmission &&
          !traction &&
          !bodyConfiguration &&
          !source
        ) {
          if (effectiveVehicleClass(null, m.vehicleClass) !== vehicleClass) return false
        } else {
          return false
        }
      }
    }

    if (q) {
      const maker = (makerNameById.get(m.manufacturerId) ?? '').toLowerCase()
      const qualityLabel = (opts?.qualityLabel?.(m.qualityStatus) ?? m.qualityStatus ?? '')
        .toLowerCase()
      const statusLabel = (opts?.statusLabel?.(m.status) ?? m.status).toLowerCase()
      const hayModel = [
        m.name,
        maker,
        qualityLabel,
        statusLabel,
        m.qualityStatus ?? '',
        m.reviewNote ?? '',
        m.vehicleClass ?? '',
      ]
        .join(' ')
        .toLowerCase()
      const hayVv = vvs
        .map((v) =>
          [
            v.year,
            v.engine,
            v.versionName,
            v.fuel,
            v.transmission,
            v.traction,
            v.bodyConfiguration,
          ]
            .filter((x) => !blank(x as string | null))
            .join(' '),
        )
        .join(' ')
        .toLowerCase()
      if (!hayModel.includes(q) && !hayVv.includes(q)) return false
    }
    return true
  })
}
