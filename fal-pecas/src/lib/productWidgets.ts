/**
 * Registry de widgets/trilhos de produtos (Home e futuras superfícies).
 * Estrutura pronta; kinds `planned` só entram quando o loader tiver fonte real.
 */

export type ProductWidgetKind =
  | 'featured'
  | 'offers'
  | 'bestsellers'
  | 'new_arrivals'
  | 'campaign'

export type ProductWidgetStatus = 'ready' | 'planned'

export type ProductWidgetDef = {
  kind: ProductWidgetKind
  /** Ordem default na Home (menor = primeiro). */
  sortOrder: number
  status: ProductWidgetStatus
  title: string
  subtitle: string
  linkLabel: string
  /** Destino do “ver todos”. */
  catalogHref: string
  defaultLimit: number
  tone: 'white' | 'sand'
}

/**
 * Catálogo canônico. Não remover kinds planned — só implementar o loader depois.
 * Notes #13/#18 / home comercial.
 */
export const PRODUCT_WIDGET_DEFS: readonly ProductWidgetDef[] = [
  {
    kind: 'featured',
    sortOrder: 10,
    status: 'ready',
    title: 'Destaques',
    subtitle: 'Seleção da loja — deslize para ver mais',
    linkLabel: 'Ver catálogo →',
    catalogHref: '/catalogo',
    defaultLimit: 16,
    tone: 'white',
  },
  {
    kind: 'offers',
    sortOrder: 20,
    status: 'ready',
    title: 'Ofertas',
    subtitle: 'Preço promocional ativo na loja',
    linkLabel: 'Ver ofertas →',
    catalogHref: '/catalogo?promo=1',
    defaultLimit: 8,
    tone: 'sand',
  },
  {
    kind: 'bestsellers',
    sortOrder: 30,
    status: 'ready',
    title: 'Mais vendidos',
    subtitle: 'Os itens que mais saem na FAL',
    linkLabel: 'Ver catálogo →',
    catalogHref: '/catalogo',
    defaultLimit: 12,
    tone: 'white',
  },
  {
    kind: 'new_arrivals',
    sortOrder: 40,
    status: 'planned',
    title: 'Novidades',
    subtitle: 'Recém-chegados no estoque',
    linkLabel: 'Ver novidades →',
    catalogHref: '/catalogo?sort=newest',
    defaultLimit: 12,
    tone: 'white',
  },
  {
    kind: 'campaign',
    sortOrder: 50,
    status: 'planned',
    title: 'Campanha',
    subtitle: 'Trilho de produtos de campanha (futuro); CTA do banner já filtra via href',
    linkLabel: 'Ver seleção →',
    catalogHref: '/catalogo',
    defaultLimit: 12,
    tone: 'sand',
  },
] as const

export function getProductWidgetDef(kind: ProductWidgetKind): ProductWidgetDef | undefined {
  return PRODUCT_WIDGET_DEFS.find((d) => d.kind === kind)
}

/** Widgets prontos para a Home (exclui planned). */
export function listReadyProductWidgets(): ProductWidgetDef[] {
  return PRODUCT_WIDGET_DEFS.filter((d) => d.status === 'ready').sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
}

/** Inclui planned — admin/planejamento / feature flags futuras. */
export function listAllProductWidgets(): ProductWidgetDef[] {
  return [...PRODUCT_WIDGET_DEFS].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function isProductWidgetReady(kind: ProductWidgetKind): boolean {
  return getProductWidgetDef(kind)?.status === 'ready'
}
