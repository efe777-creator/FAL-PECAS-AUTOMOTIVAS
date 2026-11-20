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
  /** Link/ação “Trocar” ao lado do veículo. */
  vehicleAction?: ReactNode
  /** Sem veredito ainda, com fit ativo. */
  loading?: boolean
  /** Sem fit — texto curto. */
  emptyHint?: string
  showMotivo?: boolean
  showFaltante?: boolean
  /** Caixa com borda (buy-box PDP). */
  framed?: boolean
  /** Copy longa no incompatível (PDP). */
  incompatEmphasis?: boolean
  className?: string
  children?: ReactNode
}

/**
 * Único bloco de estado E.1 (selo / incompat / motivo / faltante).
 * Evita repetir a mesma árvore em buy-box, detalhes e linhas do carrinho.
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

  const frameClass = framed
    ? [
        'rounded-[10px] border px-3 py-2.5',
        seal.kind === 'hide'
          ? 'border-fal-danger/40 bg-fal-danger/10'
          : seal.kind === 'compatible'
            ? 'border-fal-success/40 bg-fal-success/10'
            : 'border-fal-line bg-fal-bg',
      ].join(' ')
    : ''

  return (
    <div
      className={[frameClass, 'space-y-1.5', className].filter(Boolean).join(' ')}
      role="status"
    >
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
