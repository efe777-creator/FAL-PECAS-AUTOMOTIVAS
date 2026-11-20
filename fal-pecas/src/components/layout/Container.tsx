import type { ReactNode } from 'react'

type ContainerMaxWidth = 'default' | 'pdp'

/**
 * Largura da loja.
 * - `default` (1240): catálogo, home, cart, etc.
 * - `pdp` (1440): somente Página de Produto — spec redesign PDP.
 */
export function Container({
  children,
  className = '',
  maxWidth = 'default',
}: {
  children: ReactNode
  className?: string
  maxWidth?: ContainerMaxWidth
}) {
  const maxCls = maxWidth === 'pdp' ? 'max-w-[1440px]' : 'max-w-[1240px]'
  return (
    <div className={['mx-auto w-full', maxCls, 'px-[14px] sm:px-[22px]', className].join(' ')}>
      {children}
    </div>
  )
}
