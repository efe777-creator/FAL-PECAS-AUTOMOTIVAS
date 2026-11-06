import type { ReactNode } from 'react'

type Variant = 'card' | 'gallery' | 'thumb'

const shell: Record<Variant, string> = {
  /** Cards do catálogo / carrosséis — área um pouco maior, foto preenche melhor */
  card: 'flex h-[132px] w-full items-center justify-center overflow-hidden rounded-[10px] bg-[#f8f9fa] sm:h-[176px]',
  /** Área principal da PDP */
  gallery:
    'flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#f8f9fa] lg:min-h-[480px]',
  /** Miniaturas / busca / carrinho */
  thumb: 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-[#f8f9fa]',
}

/** Padding interno: card apertado (fotos com margem branca própria); gallery respira mais. */
const pad: Record<Variant, string> = {
  card: 'p-1 sm:p-1.5',
  gallery: 'p-2.5 sm:p-4',
  thumb: 'p-0.5',
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

/** Classes da `<img>` — card com zoom leve (ideal); gallery/thumb fiéis. */
export const productMediaImgClass =
  'max-h-full max-w-full object-contain object-center'

/** Card/carrossel: ~18% maior para compensar margem branca típica das fotos de peça. */
export const productMediaImgClassCard =
  'h-full w-full origin-center object-contain object-center scale-[1.18]'

export const productMediaImgClassGallery =
  'max-h-full max-w-full origin-center object-contain object-center scale-[1.06]'
