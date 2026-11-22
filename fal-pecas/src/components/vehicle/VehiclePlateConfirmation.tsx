import { Button } from '@/components/common/Button'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import {
  assertPlateAgainstCatalog,
  plateBandAssertivenessCopy,
  type PlateConfidenceBand,
} from '@/services/plates/plateIdentityAssert'
import {
  buildPlateSourceSnapshot,
  formatSourceSnapshotExtras,
} from '@/services/plates/plateSourceSnapshot'
import type { PlateLookupResult } from '@/services/plates/plateTypes'
import { plateResultToFilter } from '@/services/plates/plateTypes'
import type { VehicleFilter, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useState } from 'react'

function bandTone(band: PlateConfidenceBand): string {
  if (band === 'A') return 'border-fal-line bg-fal-surface-2 text-fal-muted'
  if (band === 'B') return 'border-fal-yellow-dark/40 bg-fal-yellow/20 text-fal-navy-dark'
  return 'border-amber-700/40 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100'
}

export type VehiclePlateConfirmationProps = {
  result: PlateLookupResult
  /** Árvore FAL para re-assert após escolha de candidato. */
  tree?: VehicleOptionTree | null
  compact?: boolean
  onConfirm: (filter: VehicleFilter) => void
  onCancelManual: () => void
  onRetryPlate?: () => void
}

export function VehiclePlateConfirmation({
  result,
  tree = null,
  compact,
  onConfirm,
  onCancelManual,
  onRetryPlate,
}: VehiclePlateConfirmationProps) {
  const [asserted, setAsserted] = useState(result)
  const [pickedCandidate, setPickedCandidate] = useState<VehicleFilter | null>(null)

  useEffect(() => {
    setAsserted(result)
    setPickedCandidate(null)
  }, [result])

  const initial = useMemo(() => plateResultToFilter(asserted), [asserted])
  const band: PlateConfidenceBand = asserted.confidenceBand ?? 'B'
  const needsCandidatePick =
    asserted.status === 'ambiguous' && asserted.candidates.length > 0 && !pickedCandidate
  /** Hard-block: faixa D exige correção manual ou nova placa — não confirma seed cego. */
  const hardBlockBandD = band === 'D' && !pickedCandidate
  const blockConfirm = needsCandidatePick || hardBlockBandD

  const filter = pickedCandidate ?? initial
  const dualYearLine = formatSourceSnapshotExtras(
    asserted.sourceSnapshot ??
      buildPlateSourceSnapshot({
        plate: asserted.plate,
        queriedAt: asserted.queriedAt,
        source: asserted.source,
        status: asserted.status,
        maker: asserted.maker,
        model: asserted.model,
        year: asserted.year,
        yearModel: asserted.yearModel ?? asserted.year,
        yearFabrication: asserted.yearFabrication,
        engine: asserted.engine,
        version: asserted.version,
        engineRaw: asserted.engineRaw,
        versionRaw: asserted.versionRaw,
        fuel: asserted.fuel,
        transmission: asserted.transmission,
        confidence: asserted.confidence,
      }),
  )
  const showDualYear =
    Boolean(asserted.yearFabrication) &&
    Boolean(asserted.yearModel ?? asserted.year) &&
    String(asserted.yearFabrication).slice(0, 4) !==
      String(asserted.yearModel ?? asserted.year).slice(0, 4)

  function pickCandidate(c: (typeof asserted.candidates)[number]) {
    const seeded: PlateLookupResult = {
      ...asserted,
      maker: c.maker,
      model: c.model,
      year: c.year ?? asserted.year,
      engine: c.engine ?? asserted.engine,
      version: c.version ?? asserted.version,
      manufacturerId: c.manufacturerId ?? asserted.manufacturerId,
      modelId: c.modelId ?? asserted.modelId,
      versionId: c.versionId ?? asserted.versionId,
      // Após escolha explícita, sai do estado ambíguo para re-assert focado no pick.
      status: 'found',
      candidates: [],
    }
    const next = tree ? assertPlateAgainstCatalog(seeded, tree) : seeded
    setAsserted(next)
    setPickedCandidate(plateResultToFilter(next))
  }

  return (
    <div className="space-y-3" aria-busy={false}>
      {asserted.isMock ? (
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
          {asserted.identityLlmAssisted ? ' · assistência IA aplicada' : ''}
          {asserted.identityAsserted ? ' · validado no catálogo FAL' : ''}
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
        {asserted.message ? (
          <p className="m-0 text-sm text-fal-muted">{asserted.message}</p>
        ) : (
          <p className="m-0 text-sm text-fal-muted">
            Encontramos o veículo <strong>{asserted.plate}</strong>. Confira antes de buscar.
            Modelo, versão, motor e ano ficam separados — sem evidência use{' '}
            <strong>Não informado</strong> (não inventamos compatibilidade).
          </p>
        )}
      </div>

      {showDualYear ? (
        <p
          className="m-0 rounded-[9px] border border-fal-line bg-fal-surface-2 px-3 py-2 text-xs text-fal-muted"
          role="note"
        >
          Ano fabricação <strong>{asserted.yearFabrication}</strong> ≠ ano-modelo{' '}
          <strong>{asserted.yearModel ?? asserted.year}</strong>. Peças usam o{' '}
          <strong>ano-modelo</strong> — confira o seletor.
          {dualYearLine ? ` (${dualYearLine})` : ''}
        </p>
      ) : dualYearLine && (asserted.fuel || asserted.transmission) ? (
        <p className="m-0 rounded-[9px] border border-[#e8edf5] bg-fal-surface-2 px-3 py-2 text-xs text-fal-muted">
          {dualYearLine} (informativo — combustível/câmbio não entram no filtro de peças).
        </p>
      ) : asserted.fuel || asserted.transmission ? (
        <p className="m-0 rounded-[9px] border border-[#e8edf5] bg-fal-surface-2 px-3 py-2 text-xs text-fal-muted">
          {asserted.fuel ? (
            <>
              Combustível: <strong>{asserted.fuel}</strong>
            </>
          ) : null}
          {asserted.fuel && asserted.transmission ? ' · ' : null}
          {asserted.transmission ? (
            <>
              Câmbio: <strong>{asserted.transmission}</strong>
            </>
          ) : null}{' '}
          (apenas informativo — não entra no filtro de peças).
        </p>
      ) : null}

      {needsCandidatePick ? (
        <p className="m-0 text-sm font-semibold text-fal-fg">
          Escolha uma das opções abaixo antes de confirmar — modelos próximos no cadastro.
        </p>
      ) : null}

      {asserted.status === 'ambiguous' && asserted.candidates.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Configurações possíveis do veículo"
        >
          {asserted.candidates.map((c, idx) => {
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
                onClick={() => pickCandidate(c)}
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
              plate: asserted.plate || f.plate,
              manufacturerId: sameIdentity
                ? base.manufacturerId ?? asserted.manufacturerId ?? undefined
                : undefined,
              modelId: sameIdentity ? base.modelId ?? asserted.modelId ?? undefined : undefined,
              versionId: sameIdentity
                ? base.versionId ?? asserted.versionId ?? undefined
                : undefined,
              engineRaw: sameIdentity
                ? base.engineRaw ?? asserted.engineRaw ?? undefined
                : f.engineRaw,
              versionRaw: sameIdentity
                ? base.versionRaw ?? asserted.versionRaw ?? undefined
                : f.versionRaw,
              sourceSnapshot: sameIdentity
                ? base.sourceSnapshot ?? asserted.sourceSnapshot ?? undefined
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
