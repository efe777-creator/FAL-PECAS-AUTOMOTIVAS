import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
import {
  compatFaltante,
  compatMotivo,
  compatSealDisplayLabel,
} from '@/services/compatibility/compatCopy'
import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'
import type { ReactNode } from 'react'

type Props = {
  verdict: CompatibilityVerdict | null | undefined
  /** Rótulo do veículo ativo (ex.: Hyundai HB20 2019). */
  vehicleLabel?: string | null
  /** Link/ação “Trocar” / “Alterar veículo”. */
  vehicleAction?: ReactNode
  loading?: boolean
  emptyHint?: string
  showMotivo?: boolean
  showFaltante?: boolean
  framed?: boolean
  incompatEmphasis?: boolean
  className?: string
  children?: ReactNode
}

/**
 * Único bloco de estado E.1.
 * `framed` (PDP): faixa estilo referência — status + veículo à esquerda, ação à direita.
 */
export function CompatVerdictSummary({
  verdict,
  vehicleLabel,
  vehicleAction,
  loading = false,
  emptyHint,
  showMotivo = true,
  showFaltante = false,
  framed = false,
  incompatEmphasis = false,
  className = '',
  children,
}: Props) {
  if (!verdict) {
    const hint = loading
      ? 'Verificando compatibilidade…'
      : emptyHint || 'Confirme um veículo no chip do header para ver se esta peça serve.'
    return (
      <p className={['m-0 text-xs text-fal-muted', className].filter(Boolean).join(' ')} role="status">
        {hint}
      </p>
    )
  }

  const seal = resolveCardSeal(verdict)
  const motivo = showMotivo ? compatMotivo(verdict) : null
  const faltante = showFaltante ? compatFaltante(verdict) : null

  if (framed) {
    const frameTone =
      seal.kind === 'hide'
        ? 'border-fal-danger/35 bg-fal-danger/10 dark:bg-fal-danger/15'
        : seal.kind === 'compatible'
          ? 'border-fal-success/35 bg-fal-success/10 dark:bg-fal-success/15'
          : seal.kind === 'similar'
            ? 'border-fal-yellow/50 bg-fal-yellow/15 dark:bg-fal-yellow/10'
            : 'border-fal-line bg-fal-bg dark:bg-fal-surface-2'

    const statusText =
      seal.kind === 'hide'
        ? incompatEmphasis
          ? 'Incompatível com o veículo ativo'
          : compatSealDisplayLabel(verdict)
        : seal.kind === 'compatible'
          ? 'Compatível com seu veículo'
          : seal.kind === 'similar'
            ? 'Compatível similar'
            : 'A verificar'

    const statusColor =
      seal.kind === 'hide'
        ? 'text-fal-danger'
        : seal.kind === 'compatible'
          ? 'text-fal-success'
          : 'text-fal-navy dark:text-fal-fg'

    return (
      <div
        className={['rounded-fal border px-3 py-2.5', frameTone, className]
          .filter(Boolean)
          .join(' ')}
        role="status"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className={['m-0 text-sm font-bold leading-snug', statusColor].join(' ')}>
              {seal.kind === 'compatible' ? (
                <span className="mr-1.5 inline-block" aria-hidden="true">
                  ✓
                </span>
              ) : null}
              {statusText}
              {vehicleLabel && seal.kind !== 'hide' ? (
                <span className="font-semibold text-fal-ink dark:text-fal-fg">
                  {' '}
                  — {vehicleLabel}
                </span>
              ) : null}
            </p>
            {seal.kind === 'hide' && vehicleLabel ? (
              <p className="m-0 text-[11px] text-fal-muted">Veículo: {vehicleLabel}</p>
            ) : null}
            {motivo ? <p className="m-0 text-[11px] text-fal-muted">Motivo: {motivo}</p> : null}
            {faltante ? <p className="m-0 text-[11px] text-fal-muted">Falta: {faltante}</p> : null}
          </div>
          {vehicleAction ? (
            <div className="shrink-0 pt-0.5 text-xs font-semibold">{vehicleAction}</div>
          ) : null}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className={['space-y-1.5', className].filter(Boolean).join(' ')} role="status">
      {vehicleLabel ? (
        <p className="m-0 text-[11px] text-fal-muted sm:text-xs">
          Veículo: <span className="font-semibold text-fal-fg">{vehicleLabel}</span>
          {vehicleAction ? <> · {vehicleAction}</> : null}
        </p>
      ) : null}

      {seal.kind === 'hide' ? (
        <p
          className={[
            'm-0 font-bold text-fal-danger',
            incompatEmphasis ? 'text-sm' : 'text-xs',
          ].join(' ')}
        >
          {incompatEmphasis ? 'Incompatível com o veículo ativo' : compatSealDisplayLabel(verdict)}
        </p>
      ) : (
        <CompatibilityStateBadge verdict={verdict} variant="card" />
      )}

      {motivo ? <p className="m-0 text-[11px] text-fal-muted">Motivo: {motivo}</p> : null}
      {faltante ? <p className="m-0 text-[11px] text-fal-muted">Falta: {faltante}</p> : null}
      {children}
    </div>
  )
}
