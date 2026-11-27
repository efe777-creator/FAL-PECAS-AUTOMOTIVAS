import { Button } from '@/components/common/Button'
import { VEHICLE_FUEL_SELECT_OPTIONS } from '@/lib/vehicles/normalizeVehicleFuel'
import type { MasterDiffCandidate, MasterDiffStatus } from '@/services/vehicles/diffVehicleMasterCandidates'

const STATUS_LABEL: Record<MasterDiffStatus, string> = {
  novo: 'Novo',
  ja_cadastrado: 'Já',
  enriquece: 'Enriquece',
  conflito: 'Conflito',
}

const STATUS_CLASS: Record<MasterDiffStatus, string> = {
  novo: 'bg-emerald-100 text-emerald-900',
  ja_cadastrado: 'bg-fal-line/60 text-fal-muted',
  enriquece: 'bg-sky-100 text-sky-950',
  conflito: 'bg-amber-100 text-amber-900',
}

export type VehicleMasterConsultPreviewProps = {
  rows: MasterDiffCandidate[]
  statusFilter: MasterDiffStatus | ''
  onStatusFilterChange: (v: MasterDiffStatus | '') => void
  onChange: (rows: MasterDiffCandidate[]) => void
  onApply: () => void
  busy?: boolean
  allowed?: boolean
}

export function VehicleMasterConsultPreview({
  rows,
  statusFilter,
  onStatusFilterChange,
  onChange,
  onApply,
  busy,
  allowed = true,
}: VehicleMasterConsultPreviewProps) {
  const visible = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows
  const selectedCount = rows.filter((r) => r.selected).length

  function patch(id: string, patch: Partial<MasterDiffCandidate>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function setVisibleSelected(selected: boolean) {
    const ids = new Set(visible.map((r) => r.id))
    onChange(rows.map((r) => (ids.has(r.id) ? { ...r, selected } : r)))
  }

  function markNovosEnriquece() {
    onChange(
      rows.map((r) => ({
        ...r,
        selected: r.status === 'novo' || r.status === 'enriquece',
      })),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-fal-muted">
          Estado{' '}
          <select
            className="ml-1 rounded-md border border-fal-line bg-fal-surface px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as MasterDiffStatus | '')}
          >
            <option value="">Todos</option>
            <option value="novo">Novo</option>
            <option value="enriquece">Enriquece</option>
            <option value="ja_cadastrado">Já cadastrado</option>
            <option value="conflito">Conflito</option>
          </select>
        </label>
        <Button type="button" variant="light" size="sm" onClick={() => setVisibleSelected(true)}>
          Marcar visíveis
        </Button>
        <Button type="button" variant="light" size="sm" onClick={() => setVisibleSelected(false)}>
          Desmarcar visíveis
        </Button>
        <Button type="button" variant="light" size="sm" onClick={markNovosEnriquece}>
          Marcar só novos+enriquece
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busy || !allowed || selectedCount === 0}
          onClick={onApply}
        >
          Aplicar {selectedCount} selecionado{selectedCount === 1 ? '' : 's'}
        </Button>
      </div>
      <p className="m-0 text-sm text-fal-muted">
        {visible.length} na vista · {selectedCount} marcados no total. Linha desmarcada não grava
        (nem modelo, nem versão, nem motor, nem anos).
      </p>
      <div className="max-h-[min(60dvh,640px)] overflow-auto rounded-[12px] border border-fal-line fal-admin-scroll">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-fal-surface-2">
            <tr>
              <th className="px-2 py-2">
                <span className="sr-only">Selecionar</span>
              </th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2">Montadora</th>
              <th className="px-2 py-2">Modelo</th>
              <th className="px-2 py-2">Versão</th>
              <th className="px-2 py-2">Motor</th>
              <th className="px-2 py-2">Combustível</th>
              <th className="px-2 py-2">Ano início</th>
              <th className="px-2 py-2">Ano fim</th>
              <th className="px-2 py-2">Nota</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-fal-line/70">
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={(e) => patch(r.id, { selected: e.target.checked })}
                    aria-label={`Selecionar ${r.maker} ${r.model}`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full min-w-[6rem] rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.maker}
                    onChange={(e) => patch(r.id, { maker: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full min-w-[6rem] rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.model}
                    onChange={(e) => patch(r.id, { model: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full min-w-[5rem] rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.version}
                    onChange={(e) => patch(r.id, { version: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full min-w-[4rem] rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.engine}
                    onChange={(e) => patch(r.id, { engine: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className="w-full rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.fuel}
                    onChange={(e) => patch(r.id, { fuel: e.target.value })}
                  >
                    <option value="">—</option>
                    {VEHICLE_FUEL_SELECT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="w-20 rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.yearStart}
                    onChange={(e) => patch(r.id, { yearStart: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="w-20 rounded border border-fal-line bg-fal-bg px-1 py-0.5"
                    value={r.yearEnd}
                    onChange={(e) => patch(r.id, { yearEnd: Number(e.target.value) })}
                  />
                </td>
                <td className="max-w-[14rem] px-2 py-1.5 text-xs text-fal-muted">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
