/** Banners da Home (item 07) — estático até admin de campanhas (09/10). */

export type HomeBanner = {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  to: string
  /** Ícone/imagem opcional em /public */
  imageSrc?: string
  tone: 'navy' | 'steel' | 'sand'
}

export const HOME_BANNERS: HomeBanner[] = [
  {
    id: 'suspensao',
    title: 'Suspensão pronta para o dia a dia',
    subtitle: 'Amortecedores, bandejas e buchas com aplicação certa.',
    ctaLabel: 'Ver suspensão',
    to: '/catalogo?cat=suspensao',
    imageSrc: '/icons/categories/suspensao.png',
    tone: 'navy',
  },
  {
    id: 'freios',
    title: 'Freios com segurança em primeiro lugar',
    subtitle: 'Pastilhas, discos e componentes para parar bem.',
    ctaLabel: 'Ver freios',
    to: '/catalogo?cat=freios',
    imageSrc: '/icons/categories/freios.png',
    tone: 'steel',
  },
  {
    id: 'filtros',
    title: 'Filtros para manter o motor limpo',
    subtitle: 'Óleo, ar e combustível — troque no tempo certo.',
    ctaLabel: 'Ver filtros',
    to: '/catalogo?cat=filtros',
    imageSrc: '/icons/categories/filtros.png',
    tone: 'sand',
  },
]
