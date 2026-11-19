import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'

const STYLES: Record<CompatibilityVerdict['state'], string> = {
  confirmed: 'border-fal-success/40 bg-fal-success/10 text-fal-success',
  probable: 'border-fal-yellow/50 bg-fal-yellow/15 text-fal-navy-dark dark:text-fal-fg',
  unconfirmed: 'border-fal-line bg-fal-bg text-fal-muted',
}

const CARD_STYLES = {
  compatible: 'border-fal-success/40 bg-fal-success/10 text-fal-success',
  similar: 'border-fal-yellow/50 bg-fal-yellow/15 text-fal-navy-dark dark:text-fal-fg',
  check: 'border-fal-line bg-fal-bg/95 text-fal-muted',
} as const

/**
 * Badge que só consome o veredito do motor — sem lógica de classificação.
 * `variant="card"` = copy E.1 (Compatível / similar / A verificar).
 */
export function CompatibilityStateBadge({
  verdict,
  className = '',
  variant = 'pdp',
  compact = false,
}: {
  verdict: CompatibilityVerdict | null | undefined
  className?: string
  variant?: 'pdp' | 'card'
  compact?: boolean
}) {
  if (!verdict) return null

  if (variant === 'card') {
    const seal = resolveCardSeal(verdict)
    if (seal.kind === 'hide') return null
    const tip = verdict.evidences.map((e) => e.detail).join(' · ')
    return (
      <span
        role="status"
        title={tip || seal.label}
        className={[
          'inline-flex max-w-full items-baseline gap-1 rounded-[8px] border font-extrabold shadow-sm',
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
          CARD_STYLES[seal.kind],
          className,
        ].join(' ')}
      >
        <span className="truncate">{seal.label}</span>
        {seal.micro ? (
          <span className="shrink-0 text-[9px] font-bold opacity-80">{seal.micro}</span>
        ) : null}
      </span>
    )
  }

  const tip = verdict.evidences.map((e) => e.detail).join(' · ')
  return (
    <span
      role="status"
      title={tip || verdict.label}
      className={[
        'inline-flex max-w-full items-center rounded-[8px] border px-2 py-0.5 text-[11px] font-extrabold',
        STYLES[verdict.state],
        className,
      ].join(' ')}
    >
      <span className="truncate">{verdict.label}</span>
    </span>
  )
}
