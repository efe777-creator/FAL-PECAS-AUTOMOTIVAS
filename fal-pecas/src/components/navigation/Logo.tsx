import { Link } from 'react-router-dom'
import logoFal from '@/assets/logos/logo-fal-transparente.png'

/**
 * Logo FAL — asset de LOGOTIPO/logo-fal-transparente.png
 * Sem recorte/redesenho; proporção preservada (object-contain).
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={[
        'flex h-12 w-14 shrink-0 items-center justify-start overflow-visible sm:h-14 sm:w-16 lg:h-[78px] lg:w-[104px]',
        className,
      ].join(' ')}
      aria-label="FAL Peças Automotivas — Início"
    >
      <img
        src={logoFal}
        alt="FAL Peças Automotivas"
        className="block h-11 w-auto max-w-14 object-contain sm:h-12 sm:max-w-16 lg:h-[72px] lg:max-w-[104px]"
      />
    </Link>
  )
}
