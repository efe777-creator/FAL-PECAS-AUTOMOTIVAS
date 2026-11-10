import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Select'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { useVehicleOptions } from '@/hooks/useCatalog'
import {
  reconcileVehicleFilter,
  selectOptionsWithValue,
} from '@/services/plates/reconcileVehicleFilter'
import { VEHICLE_NOT_INFORMED_LABEL } from '@/services/vehicles/vehicleNotInformed'
import { buildVehicleQuery, vehicleModelKey, vehicleModelYearKey } from '@/services/vehicles/vehicleService'
import type { VehicleFilter } from '@/types'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'

/** Preserva "" quando a option "Não informado" está na lista; senão limpa para undefined. */
function optionalSelectValue(
  raw: string,
  options: Array<{ value: string; label: string }>,
): string | undefined {
  if (
    raw === '' &&
    options.some((o) => o.value === '' && o.label === VEHICLE_NOT_INFORMED_LABEL)
  ) {
    return ''
  }
  return raw || undefined
}

export type VehicleSelectorProps = {
  compact?: boolean
  /** Pré-preenche filtros (conferência pós-placa) sem aplicar busca. Remonte com `key` se mudar. */
  initialFilter?: VehicleFilter
  /** Se definido, o botão confirma localmente em vez de navegar. */
  onConfirm?: (filter: VehicleFilter) => void
  confirmLabel?: string
  hideQuickPick?: boolean
  title?: string
  subtitle?: string
}

/**
 * Seletor de veículo — TODOS os campos são opcionais.
 * Label oficial: "Montadora" (nunca "marca do carro").
 * Chaves compostas maker|model evitam colisão de homônimos.
 */
export function VehicleSelector({
  compact = false,
  initialFilter,
  onConfirm,
  confirmLabel = 'Ver peças compatíveis',
  hideQuickPick = false,
  title = 'Encontre peças para seu veículo',
  subtitle = 'Você pode informar apenas um critério ou combinar Montadora, Modelo, Ano, Motor e Versão. Nenhum campo é obrigatório.',
}: VehicleSelectorProps) {
  const navigate = useNavigate()
  const { data: tree, loading, error } = useVehicleOptions()

  const seeded = useMemo(() => {
    if (!initialFilter) return {} as VehicleFilter
    if (!tree) return initialFilter
    return reconcileVehicleFilter(initialFilter, tree)
  }, [initialFilter, tree])

  const [filter, setFilter] = useState<VehicleFilter>(seeded)
  const [seedKey, setSeedKey] = useState(() => JSON.stringify(seeded))

  // Quando a árvore chega ou o initialFilter muda, re-sincroniza o estado.
  const nextSeedKey = JSON.stringify(seeded)
  if (nextSeedKey !== seedKey) {
    setSeedKey(nextSeedKey)
    setFilter(seeded)
  }

  const modelOptions = useMemo(() => {
    if (!tree) return []
    const base = !filter.maker
      ? [...new Set(Object.values(tree.modelsByMaker).flat())]
          .sort()
          .map((m) => ({ value: m, label: m }))
      : (tree.modelsByMaker[filter.maker] ?? []).map((m) => ({ value: m, label: m }))
    return selectOptionsWithValue(base, filter.model)
  }, [tree, filter.maker, filter.model])

  const yearOptions = useMemo(() => {
    if (!tree) return []
    let base: Array<{ value: string; label: string }> = []
    if (!filter.model) {
      const all = Object.values(tree.yearsByModel).flat()
      base = [...new Set(all)]
        .sort((a, b) => Number(b) - Number(a))
        .map((y) => ({ value: y, label: y }))
    } else if (filter.maker) {
      const key = vehicleModelKey(filter.maker, filter.model)
      base = (tree.yearsByModel[key] ?? []).map((y) => ({ value: y, label: y }))
    } else {
      const matches = Object.entries(tree.yearsByModel)
        .filter(([k]) => k.endsWith(`|${filter.model}`))
        .flatMap(([, years]) => years)
      base = [...new Set(matches)]
        .sort((a, b) => Number(b) - Number(a))
        .map((y) => ({ value: y, label: y }))
    }
    return selectOptionsWithValue(base, filter.year)
  }, [tree, filter.maker, filter.model, filter.year])

  const engineOptions = useMemo(() => {
    if (!tree) return []
    let base: Array<{ value: string; label: string }> = []
    if (filter.maker && filter.model && filter.year) {
      const key = vehicleModelYearKey(filter.maker, filter.model, filter.year)
      const byYear = tree.enginesByModelYear[key] ?? []
      if (byYear.length) base = byYear.map((e) => ({ value: e, label: e }))
    }
    if (!base.length && filter.maker && filter.model) {
      const key = vehicleModelKey(filter.maker, filter.model)
      base = (tree.enginesByModel[key] ?? []).map((e) => ({ value: e, label: e }))
    }
    if (!base.length) {
      const all = Object.values(tree.enginesByModelYear).flat()
      base = [...new Set(all)].sort().map((e) => ({ value: e, label: e }))
    }
    return selectOptionsWithValue(base, filter.engine)
  }, [tree, filter.maker, filter.model, filter.year, filter.engine])

  const versionOptions = useMemo(() => {
    if (!tree || !filter.model) return selectOptionsWithValue([], filter.version)
    let base: Array<{ value: string; label: string }> = []
    if (filter.maker) {
      const key = vehicleModelKey(filter.maker, filter.model)
      base = (tree.versionsByModel[key] ?? []).map((v) => ({ value: v, label: v }))
    } else {
      const matches = Object.entries(tree.versionsByModel)
        .filter(([k]) => k.endsWith(`|${filter.model}`))
        .flatMap(([, versions]) => versions)
      base = [...new Set(matches)].map((v) => ({ value: v, label: v }))
    }
    return selectOptionsWithValue(base, filter.version)
  }, [tree, filter.maker, filter.model, filter.version])

  const makerOptions = useMemo(() => {
    if (!tree) return []
    return selectOptionsWithValue(
      tree.makers.map((m) => ({ value: m, label: m })),
      filter.maker,
    )
  }, [tree, filter.maker])

  if (loading) return <Loading label="Carregando veículos…" />
  if (error || !tree) return <ErrorState message={error ?? 'Dados de veículo indisponíveis'} />

  return (
    <div
      className={[
        'rounded-[18px] bg-white text-fal-navy-dark shadow-[0_20px_50px_rgba(0,0,0,0.2)]',
        compact ? 'p-4' : 'p-6',
      ].join(' ')}
    >
      <h2 className={['mt-0 font-extrabold', compact ? 'text-xl' : 'text-[23px]'].join(' ')}>
        {title}
      </h2>
      <p className="text-sm text-fal-muted">{subtitle}</p>

      {!hideQuickPick ? (
        <div className="mt-3 border-t border-fal-line/60 pt-3">
          <SavedVehiclesQuickPick />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Montadora"
          name="maker"
          placeholder="Todas / opcional"
          value={filter.maker ?? ''}
          options={makerOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              maker: e.target.value || undefined,
              model: undefined,
              year: undefined,
              engine: undefined,
              version: undefined,
            }))
          }
        />
        <Select
          label="Modelo"
          name="model"
          placeholder="Todos / opcional"
          value={filter.model ?? ''}
          options={modelOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              model: e.target.value || undefined,
              year: undefined,
              engine: undefined,
              version: undefined,
            }))
          }
        />
        <Select
          label="Ano"
          name="year"
          placeholder="Todos / opcional"
          value={filter.year ?? ''}
          options={yearOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              year: e.target.value || undefined,
              engine: undefined,
            }))
          }
        />
        <Select
          label="Motor"
          name="engine"
          placeholder="Todos / opcional"
          value={filter.engine ?? ''}
          options={engineOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              engine: optionalSelectValue(e.target.value, engineOptions),
            }))
          }
        />
        <Select
          label="Versão"
          name="version"
          placeholder="Todas / opcional"
          value={filter.version ?? ''}
          options={versionOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              version: optionalSelectValue(e.target.value, versionOptions),
            }))
          }
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        className="mt-4"
        onClick={() => {
          if (onConfirm) {
            onConfirm(filter)
            return
          }
          const params = buildVehicleQuery(filter)
          const qs = params.toString()
          navigate(qs ? `/catalogo?${qs}` : '/catalogo')
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  )
}
