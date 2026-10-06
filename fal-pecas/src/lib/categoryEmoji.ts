/**
 * Ícones de categoria na vitrine.
 * Sem coluna emoji no banco — resolve por slug/nome (Grupos L1).
 *
 * Contratos visuais (eFe):
 * - Suspensão → mola / amortecedor
 * - Direção → engrenagem
 * - Óleos → óleo (ok)
 * - Freio → disco/pinça (asset)
 * - Filtro → funil/filtro (asset)
 */

export type CategoryIcon =
  | { type: 'emoji'; value: string }
  | { type: 'image'; src: string; alt: string }

const BY_SLUG: Record<string, CategoryIcon> = {
  suspensao: { type: 'emoji', value: '🗜️' }, // mola/amortecedor (aproximação)
  direcao: { type: 'emoji', value: '⚙️' }, // engrenagem
  'oleos-e-fluidos': { type: 'emoji', value: '🛢️' },
  freios: { type: 'image', src: '/icons/categories/freios.png', alt: 'Freios' },
  filtros: { type: 'image', src: '/icons/categories/filtros.png', alt: 'Filtros' },
  'componentes-de-manutencao': { type: 'emoji', value: '🛠️' },
  outro: { type: 'emoji', value: '📦' },
  'outros-produtos': { type: 'emoji', value: '🚘' },
}

/** Preferência: asset mola/amortecedor para Suspensão. */
const SUSPENSAO_IMG = '/icons/categories/suspensao.png'

const BY_NAME_HINT: Array<{ re: RegExp; icon: CategoryIcon }> = [
  { re: /suspens/i, icon: { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' } },
  { re: /dire[cç][aã]o/i, icon: { type: 'emoji', value: '⚙️' } },
  { re: /[oó]leo|fluido|lubrific/i, icon: { type: 'emoji', value: '🛢️' } },
  { re: /freio/i, icon: { type: 'image', src: '/icons/categories/freios.png', alt: 'Freios' } },
  { re: /filtro/i, icon: { type: 'image', src: '/icons/categories/filtros.png', alt: 'Filtros' } },
  { re: /manuten/i, icon: { type: 'emoji', value: '🛠️' } },
]

export function resolveCategoryIcon(input: {
  slug?: string | null
  name?: string | null
  emoji?: string | null
}): CategoryIcon {
  if (input.emoji?.trim()) return { type: 'emoji', value: input.emoji.trim() }

  const slug = (input.slug ?? '').trim().toLowerCase()
  if (slug === 'suspensao') {
    return { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' }
  }
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug]

  const name = (input.name ?? '').trim()
  for (const row of BY_NAME_HINT) {
    if (row.re.test(name) || row.re.test(slug)) return row.icon
  }

  return { type: 'emoji', value: '📦' }
}

/** @deprecated use resolveCategoryIcon */
export function resolveCategoryEmoji(input: {
  slug?: string | null
  name?: string | null
  emoji?: string | null
}): string {
  const icon = resolveCategoryIcon(input)
  return icon.type === 'emoji' ? icon.value : '📦'
}
