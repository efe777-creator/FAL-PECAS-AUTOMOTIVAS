import type { ReactNode } from 'react'

export type BadgeVariant = 'default' | 'promo' | 'kit'

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  // Amarelo FAL — oferta / default (admin, PDP promo, legado).
  default:
    'bg-fal-yellow px-2 py-1 text-[11px] font-extrabold text-fal-navy-dark',
  promo:
    'bg-fal-yellow px-1.5 py-0.5 text-[10px] font-extrabold text-fal-navy-dark shadow-sm sm:text-[11px]',
  // Navy FAL — tipo Kit (espírito do pill PDP).
  kit: 'border border-fal-navy/25 bg-fal-navy px-1.5 py-0.5 text-[10px] font-extrabold text-fal-yellow shadow-sm sm:text-[11px]',
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: BadgeVariant
}) {
  return (
    <span
      role="status"
      className={['inline-flex rounded-md', VARIANT_CLASS[variant]].join(' ')}
    >
      {children}
    </span>
  )
}
