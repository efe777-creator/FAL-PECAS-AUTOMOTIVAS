import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Select'
import { ADMIN_CHIP } from '@/lib/adminLabels'
import { VEHICLE_FUEL_SELECT_OPTIONS } from '@/lib/vehicles/normalizeVehicleFuel'
import { VEHICLE_TRACTION_SELECT_OPTIONS } from '@/lib/vehicles/normalizeVehicleTraction'
import type { MasterDiffCandidate, MasterDiffStatus } from '@/services/vehicles/diffVehicleMasterCandidates'
import {
  mergeIdentitySuggestion,
  refineVehicleIdentityFields,
  suggestVehicleIdentityAssist,
} from '@/services/admin/vehicleIdentityAssistClient'

const STATUS_LABEL: Record<MasterDiffStatus, string> = {
  novo: 'Novo',
  ja_cadastrado: 'Já',
  enriquece: 'Enriquece',
  conflito: 'Conflito',
}

const STATUS_CLASS: Record<MasterDiffStatus, string> = {
  novo: ADMIN_CHIP.ok,
  ja_cadastrado: ADMIN_CHIP.neutral,
  enriquece: ADMIN_CHIP.info,
  conflito: ADMIN_CHIP.warn,
}

export type VehicleMasterConsultPreviewProps = {
  rows: MasterDiffCandidate[]
  statusFilter: MasterDiffStatus | ''
  onStatusFilterChange: (v: MasterDiffStatus | '') => void
  onChange: (rows: MasterDiffCandidate[]) => void
  onApply: () => void
  busy?: boolean
  allowed?: boolean
  onAssistMessage?: (msg: string, kind?: 'success' | 'error') => void
}

export function VehicleMasterConsultPreview({
  rows,
  statusFilter,
  onStatusFilterChange,
  onChange,
  onApply,
  busy,
  allowed = true,
  onAssistMessage,
}: VehicleMasterConsultPreviewProps) {
  const visible = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows
  const selectedCount = rows.filter((r) => r.selected).length

  function patch(id: string, patch: Partial<MasterDiffCandidate>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function suggestAiForRow(r: MasterDiffCandidate) {
    const local = refineVehicleIdentityFields(r)
    const raw = [r.maker, local.model, local.engine, local.version, local.fuel, local.traction]
      .filter(Boolean)
      .join(' ')
    let ai: Awaited<ReturnType<typeof suggestVehicleIdentityAssist>> | null = null
    try {
      ai = await suggestVehicleIdentityAssist({
        rawName: raw,
        maker: r.maker,
        model: local.model,
        engine: local.engine,
        version: local.version,
        fuel: local.fuel,
        traction: local.traction,
      })
    } catch {
      ai = null
    }
    const next = mergeIdentitySuggestion(local, ai?.suggestion ?? null)
    const changes: string[] = []
    if (next.model !== r.model) changes.push(`modelo ${next.model}`)
    if (next.engine !== r.engine) changes.push(`motor ${next.engine || '—'}`)
    if (next.version !== r.version) changes.push(`versão ${next.version || '—'}`)
    if (next.fuel !== r.fuel) changes.push(`combustível ${next.fuel || '—'}`)
    if ((next.traction || '') !== (r.traction || '')) changes.push(`tração ${next.traction || '—'}`)
    if (!changes.length) {
      onAssistMessage?.('Nada a corrigir nesta linha.', 'success')
      return
    }
    patch(r.id, next)
    const aiNote = ai?.suggestion ? '' : ' A IA não devolveu correção; valeu a regra local.'
    onAssistMessage?.(`Sugestão aplicada: ${changes.join(', ')}.${aiNote} Revise antes de gravar.`, 'success')
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
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[200px]">
          <Select
            label="Estado"
            name="master-diff-status"
            placeholder="Todos"
            options={[
              { value: 'novo', label: 'Novo' },
              { value: 'enriquece', label: 'Enriquece' },
              { value: 'ja_cadastrado', label: 'Já cadastrado' },
              { value: 'conflito', label: 'Conflito' },
            ]}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as MasterDiffStatus | '')}
          />
        </div>
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
        {visible.length} na vista · {selectedCount} marcados no total. Linha desmarcada não grava.
        Contrato: 1.0 / 8V / 16V / Turbo = motor · Tiggo 5X = modelo · Comfortline = versão ·
        4x4/AWD = tração. A mesma configuração junta os anos seguidos em que ela existe.
        Se o motor ou a versão muda, começa outro período. Ano sem essa configuração não entra.
      </p>
      <div className="fal-admin-scroll max-h-[min(60dvh,640px)] overflow-auto rounded-[14px] border border-fal-line bg-fal-surface">
        <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
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
              <th className="px-2 py-2">Tração</th>
              <th className="px-2 py-2">Ano início</th>
              <th className="px-2 py-2">Ano fim</th>
              <th className="px-2 py-2">IA</th>
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
                  <span className={`rounded-[10px] px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="fal-field w-full min-w-[6rem] rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.maker}
                    onChange={(e) => patch(r.id, { maker: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="fal-field w-full min-w-[6rem] rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.model}
                    onChange={(e) => patch(r.id, { model: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="fal-field w-full min-w-[5rem] rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.version}
                    onChange={(e) => patch(r.id, { version: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="fal-field w-full min-w-[4rem] rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.engine}
                    onChange={(e) => patch(r.id, { engine: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className="fal-field w-full rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
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
                  <select
                    className="fal-field w-full rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.traction ?? ''}
                    onChange={(e) => patch(r.id, { traction: e.target.value })}
                  >
                    <option value="">—</option>
                    {VEHICLE_TRACTION_SELECT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="fal-field w-20 rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.yearStart}
                    onChange={(e) => patch(r.id, { yearStart: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="fal-field w-20 rounded-[9px] border border-fal-line bg-fal-surface px-2 py-1.5 text-fal-fg"
                    value={r.yearEnd}
                    onChange={(e) => patch(r.id, { yearEnd: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    disabled={busy || !allowed}
                    onClick={() => void suggestAiForRow(r)}
                  >
                    Sugerir
                  </Button>
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
