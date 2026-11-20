import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'

const STYLES: Record<CompatibilityVerdict['state'], string> = {
  confirmed: 'border-fal-success/40 bg-fal-success/10 text-fal-success',
  probable: 'border-fal-yellow/50 bg-fal-yellow/15 text-fal-navy-dark dark:text-fal-fg',
  unconfirmed: 'border-fal-line bg-fal-bg text-fal-muted',
}

/** Selos E.1 no card — fundos opacos, legíveis sobre foto clara. */
const CARD_STYLES = {
  compatible: 'border-fal-success bg-fal-success text-white',
  similar: 'border-fal-yellow-dark bg-fal-yellow text-fal-navy-dark',
  check: 'border-fal-line bg-fal-surface text-fal-navy dark:bg-fal-surface-2 dark:text-fal-fg',
  hide: 'border-fal-danger bg-fal-danger text-white',
} as const

/**
 * Badge que só consome o veredito do motor — sem lógica de classificação.
 * `variant="card"` = copy E.1 (Compatível / similar / A verificar / Incompatível).
 */
export function CompatibilityStateBadge({
  verdict,
  className = '',
  variant = 'pdp',
}: {
  verdict: CompatibilityVerdict | null | undefined
  className?: string
  variant?: 'pdp' | 'card'
  /** @deprecated Card usa tamanho único legível. */
  compact?: boolean
}) {
  if (!verdict) return null

  if (variant === 'card') {
    const seal = resolveCardSeal(verdict)
    // Sem veredito de cruzamento: não pinta selo vazio.
    if (seal.kind === 'hide' && !seal.label) return null
    const tip = verdict.evidences.map((e) => e.detail).join(' · ')
    return (
      <span
        role="status"
        title={tip || seal.label}
        className={[
          'inline-flex max-w-[min(100%,11rem)] items-baseline gap-0.5 rounded-[8px] border-2 px-2 py-1 text-[11px] font-black leading-tight shadow-fal sm:text-xs',
          CARD_STYLES[seal.kind],
          className,
        ].join(' ')}
      >
        <span className="truncate">{seal.label}</span>
        {seal.micro ? (
          <span className="shrink-0 text-[10px] font-extrabold opacity-90"> {seal.micro}</span>
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
