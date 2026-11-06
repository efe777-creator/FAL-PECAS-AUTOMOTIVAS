import type { ReactNode } from 'react'

type Variant = 'card' | 'gallery' | 'thumb'

const shell: Record<Variant, string> = {
  /** Cards do catálogo / carrosséis */
  card: 'flex h-[120px] w-full items-center justify-center overflow-hidden rounded-[10px] bg-[#f8f9fa] sm:h-[168px]',
  /** Área principal da PDP */
  gallery:
    'flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#f8f9fa] lg:min-h-[480px]',
  /** Miniaturas / busca / carrinho */
  thumb: 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-[#f8f9fa]',
}

const pad: Record<Variant, string> = {
  card: 'p-2.5 sm:p-3',
  gallery: 'p-3 sm:p-5',
  thumb: 'p-1',
}

/**
 * Enquadra foto de peça sem cortar (contain) e sem “moldura” cinza feia.
 * Fundo neutro claro — some em fotos com fundo branco; não cria faixa escura.
 */
export function ProductMediaFrame({
  variant,
  children,
  className = '',
}: {
  variant: Variant
  children: ReactNode
  className?: string
}) {
  return (
    <div className={[shell[variant], className].filter(Boolean).join(' ')}>
      <div className={['flex h-full w-full items-center justify-center', pad[variant]].join(' ')}>
        {children}
      </div>
    </div>
  )
}

/** Classes da `<img>` dentro do frame. */
export const productMediaImgClass =
  'max-h-full max-w-full object-contain object-center'
