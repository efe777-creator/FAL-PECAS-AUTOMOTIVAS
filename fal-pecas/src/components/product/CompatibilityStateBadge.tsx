import type { CompatibilityVerdict } from '@/services/compatibility/compatibilityEngine'

const STYLES: Record<
  CompatibilityVerdict['state'],
  string
> = {
  confirmed: 'border-fal-success/40 bg-fal-success/10 text-fal-success',
  probable: 'border-fal-yellow/50 bg-fal-yellow/15 text-fal-navy-dark',
  unconfirmed: 'border-fal-line bg-fal-bg text-fal-muted',
}

/**
 * Badge que só consome o veredito do motor — sem lógica de classificação.
 */
export function CompatibilityStateBadge({
  verdict,
  className = '',
}: {
  verdict: CompatibilityVerdict | null | undefined
  className?: string
}) {
  if (!verdict) return null
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
