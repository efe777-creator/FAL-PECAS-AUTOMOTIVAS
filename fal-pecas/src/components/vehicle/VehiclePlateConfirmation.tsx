import { Button } from '@/components/common/Button'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import {
  plateBandAssertivenessCopy,
  type PlateConfidenceBand,
} from '@/services/plates/plateIdentityAssert'
import type { PlateLookupResult } from '@/services/plates/plateTypes'
import { plateResultToFilter } from '@/services/plates/plateTypes'
import type { VehicleFilter } from '@/types'
import { useMemo, useState } from 'react'

function bandTone(band: PlateConfidenceBand): string {
  if (band === 'A') return 'border-fal-line bg-fal-surface-2 text-fal-muted'
  if (band === 'B') return 'border-fal-yellow-dark/40 bg-fal-yellow/20 text-fal-navy-dark'
  return 'border-amber-700/40 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100'
}

export type VehiclePlateConfirmationProps = {
  result: PlateLookupResult
  compact?: boolean
  onConfirm: (filter: VehicleFilter) => void
  onCancelManual: () => void
  onRetryPlate?: () => void
}

export function VehiclePlateConfirmation({
  result,
  compact,
  onConfirm,
  onCancelManual,
  onRetryPlate,
}: VehiclePlateConfirmationProps) {
  const initial = useMemo(() => plateResultToFilter(result), [result])
  const [pickedCandidate, setPickedCandidate] = useState<VehicleFilter | null>(null)
  const band: PlateConfidenceBand = result.confidenceBand ?? 'B'
  const needsCandidatePick =
    result.status === 'ambiguous' && result.candidates.length > 0 && !pickedCandidate
  /** Hard-block: faixa D exige correção manual ou nova placa — não confirma seed cego. */
  const hardBlockBandD = band === 'D' && !pickedCandidate
  const blockConfirm = needsCandidatePick || hardBlockBandD

  const filter = pickedCandidate ?? initial

  return (
    <div className="space-y-3" aria-busy={false}>
      {result.isMock ? (
        <p className="rounded-[9px] border border-fal-yellow-dark/50 bg-fal-yellow/30 px-3 py-2 text-xs font-semibold text-fal-navy-dark">
          Ambiente de teste (mock) — esta identificação não é uma consulta real de placa.
        </p>
      ) : null}

      <div
        className={`rounded-[9px] border px-3 py-2 text-xs font-semibold ${bandTone(band)}`}
        role="status"
      >
        <p className="m-0">
          Confiança da identificação: <strong>faixa {band}</strong>
          {result.identityLlmAssisted ? ' · assistência IA aplicada' : ''}
          {result.identityAsserted ? ' · validado no catálogo FAL' : ''}
        </p>
        <p className="mb-0 mt-1 font-normal">{plateBandAssertivenessCopy(band)}</p>
      </div>

      {hardBlockBandD ? (
        <p className="m-0 rounded-[9px] border border-amber-700/40 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Faixa D — confirme escolhendo um candidato (se houver), selecione manualmente ou tente
          outra placa. Não gravamos identificação de baixa certeza sem revisão.
        </p>
      ) : null}

      <div role="status" aria-live="polite">
        {result.message ? (
          <p className="m-0 text-sm text-fal-muted">{result.message}</p>
        ) : (
          <p className="m-0 text-sm text-fal-muted">
            Encontramos o veículo <strong>{result.plate}</strong>. Confira antes de buscar.
            Modelo, versão, motor e ano ficam separados — sem evidência use{' '}
            <strong>Não informado</strong> (não inventamos compatibilidade).
          </p>
        )}
      </div>

      {needsCandidatePick ? (
        <p className="m-0 text-sm font-semibold text-fal-fg">
          Escolha uma das opções abaixo antes de confirmar — modelos próximos no cadastro.
        </p>
      ) : null}

      {result.fuel || result.transmission ? (
        <p className="m-0 rounded-[9px] border border-[#e8edf5] bg-fal-surface-2 px-3 py-2 text-xs text-fal-muted">
          {result.fuel ? (
            <>
              Combustível: <strong>{result.fuel}</strong>
            </>
          ) : null}
          {result.fuel && result.transmission ? ' · ' : null}
          {result.transmission ? (
            <>
              Câmbio: <strong>{result.transmission}</strong>
            </>
          ) : null}
          {' '}
          (apenas informativo — não entra no filtro de peças).
        </p>
      ) : null}

      {result.status === 'ambiguous' && result.candidates.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Configurações possíveis do veículo"
        >
          {result.candidates.map((c, idx) => {
            const label = [c.maker, c.model, c.year, c.engine].filter(Boolean).join(' · ')
            const selected =
              pickedCandidate?.maker === (c.maker ?? undefined) &&
              pickedCandidate?.model === (c.model ?? undefined) &&
              pickedCandidate?.year === (c.year ?? undefined)
            return (
              <Button
                key={`${label}-${idx}`}
                variant={selected ? 'primary' : 'outline'}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setPickedCandidate(
                    plateResultToFilter({
                      ...result,
                      maker: c.maker,
                      model: c.model,
                      year: c.year,
                      engine: c.engine,
                      version: c.version,
                      manufacturerId: c.manufacturerId ?? result.manufacturerId,
                      modelId: c.modelId ?? result.modelId,
                      versionId: c.versionId ?? null,
                    }),
                  )
                }
              >
                {label || `Opção ${idx + 1}`}
              </Button>
            )
          })}
        </div>
      ) : null}

      {!blockConfirm ? (
        <VehicleSelector
          key={[filter.maker, filter.model, filter.year, filter.engine, filter.version].join('|')}
          compact={compact}
          initialFilter={filter}
          hideQuickPick
          title="Confirme o veículo"
          subtitle="Modelo, versão, motor e ano separados. Corrija se necessário; campos sem evidência ficam em Não informado. Os filtros só entram após confirmar."
          confirmLabel="Confirmar e ver peças"
          onConfirm={(f) => {
            const base = pickedCandidate ?? initial
            const sameIdentity =
              (f.maker ?? '').toLowerCase() === (base.maker ?? '').toLowerCase() &&
              (f.model ?? '').toLowerCase() === (base.model ?? '').toLowerCase()
            onConfirm({
              ...f,
              plate: result.plate || f.plate,
              manufacturerId: sameIdentity
                ? base.manufacturerId ?? result.manufacturerId ?? undefined
                : undefined,
              modelId: sameIdentity ? base.modelId ?? result.modelId ?? undefined : undefined,
              versionId: sameIdentity
                ? base.versionId ?? result.versionId ?? undefined
                : undefined,
              engineRaw: sameIdentity
                ? base.engineRaw ?? result.engineRaw ?? undefined
                : f.engineRaw,
              versionRaw: sameIdentity
                ? base.versionRaw ?? result.versionRaw ?? undefined
                : f.versionRaw,
              sourceSnapshot: sameIdentity
                ? base.sourceSnapshot ?? result.sourceSnapshot ?? undefined
                : f.sourceSnapshot ?? base.sourceSnapshot,
            })
          }}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="light" type="button" onClick={onCancelManual}>
          Selecionar manualmente
        </Button>
        {onRetryPlate ? (
          <Button variant="light" type="button" onClick={onRetryPlate}>
            Tentar outra placa
          </Button>
        ) : null}
      </div>
    </div>
  )
}
