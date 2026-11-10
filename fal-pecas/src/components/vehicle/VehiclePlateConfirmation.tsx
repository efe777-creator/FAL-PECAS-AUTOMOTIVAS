import { Button } from '@/components/common/Button'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import type { PlateLookupResult } from '@/services/plates/plateTypes'
import { plateResultToFilter } from '@/services/plates/plateTypes'
import type { VehicleFilter } from '@/types'
import { useMemo, useState } from 'react'

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

  const filter = pickedCandidate ?? initial

  return (
    <div className="space-y-3">
      {result.isMock ? (
        <p className="rounded-[9px] border border-[#f0d48a] bg-[#fff8db] px-3 py-2 text-xs font-semibold text-fal-navy-dark">
          Ambiente de teste (mock) — esta identificação não é uma consulta real de placa.
        </p>
      ) : null}

      {result.message ? (
        <p className="m-0 text-sm text-fal-muted">{result.message}</p>
      ) : (
        <p className="m-0 text-sm text-fal-muted">
          Confira os dados do veículo <strong>{result.plate}</strong> antes de ver as peças.
        </p>
      )}

      {result.status === 'ambiguous' && result.candidates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {result.candidates.map((c, idx) => {
            const label = [c.maker, c.model, c.year, c.engine].filter(Boolean).join(' · ')
            return (
              <Button
                key={`${label}-${idx}`}
                variant="outline"
                type="button"
                onClick={() =>
                  setPickedCandidate(
                    plateResultToFilter({
                      ...result,
                      maker: c.maker,
                      model: c.model,
                      year: c.year,
                      engine: c.engine,
                      version: c.version,
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

      <VehicleSelector
        key={[filter.maker, filter.model, filter.year, filter.engine, filter.version].join('|')}
        compact={compact}
        initialFilter={filter}
        hideQuickPick
        title="Confirme o veículo"
        subtitle="Corrija qualquer campo se necessário. Os filtros só serão aplicados após confirmar."
        confirmLabel="Confirmar e ver peças"
        onConfirm={onConfirm}
      />

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
