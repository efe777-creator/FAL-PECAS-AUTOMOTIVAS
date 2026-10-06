/**
 * Ícones de categoria na vitrine.
<<<<<<< Updated upstream
 * Sem coluna emoji no banco — resolve por slug/nome (Grupos L1).
 *
 * Contratos visuais (eFe):
 * - Suspensão → mola / amortecedor
 * - Direção → engrenagem
 * - Óleos → óleo (ok)
=======
 * Resolve por slug/nome (Grupos L1). Emoji do banco só entra se não for placeholder
 * e se não houver mapeamento conhecido (assets/contrato visual).
 *
 * Contratos visuais (eFe):
 * - Suspensão → asset mola/amortecedor
 * - Direção → engrenagem
 * - Óleos → óleo
>>>>>>> Stashed changes
 * - Freio → disco/pinça (asset)
 * - Filtro → funil/filtro (asset)
 */

export type CategoryIcon =
  | { type: 'emoji'; value: string }
  | { type: 'image'; src: string; alt: string }

<<<<<<< Updated upstream
const BY_SLUG: Record<string, CategoryIcon> = {
  suspensao: { type: 'emoji', value: '🗜️' }, // mola/amortecedor (aproximação)
  direcao: { type: 'emoji', value: '⚙️' }, // engrenagem
  'oleos-e-fluidos': { type: 'emoji', value: '🛢️' },
  freios: { type: 'image', src: '/icons/categories/freios.png', alt: 'Freios' },
  filtros: { type: 'image', src: '/icons/categories/filtros.png', alt: 'Filtros' },
=======
const PLACEHOLDER_EMOJI = new Set(['📦'])

const SUSPENSAO_IMG = '/icons/categories/suspensao.png'
const FREIOS_IMG = '/icons/categories/freios.png'
const FILTROS_IMG = '/icons/categories/filtros.png'

const BY_SLUG: Record<string, CategoryIcon> = {
  suspensao: { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' },
  direcao: { type: 'emoji', value: '⚙️' },
  'oleos-e-fluidos': { type: 'emoji', value: '🛢️' },
  freios: { type: 'image', src: FREIOS_IMG, alt: 'Freios' },
  filtros: { type: 'image', src: FILTROS_IMG, alt: 'Filtros' },
>>>>>>> Stashed changes
  'componentes-de-manutencao': { type: 'emoji', value: '🛠️' },
  outro: { type: 'emoji', value: '📦' },
  'outros-produtos': { type: 'emoji', value: '🚘' },
}

<<<<<<< Updated upstream
/** Preferência: asset mola/amortecedor para Suspensão. */
const SUSPENSAO_IMG = '/icons/categories/suspensao.png'

=======
>>>>>>> Stashed changes
const BY_NAME_HINT: Array<{ re: RegExp; icon: CategoryIcon }> = [
  { re: /suspens/i, icon: { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' } },
  { re: /dire[cç][aã]o/i, icon: { type: 'emoji', value: '⚙️' } },
  { re: /[oó]leo|fluido|lubrific/i, icon: { type: 'emoji', value: '🛢️' } },
<<<<<<< Updated upstream
  { re: /freio/i, icon: { type: 'image', src: '/icons/categories/freios.png', alt: 'Freios' } },
  { re: /filtro/i, icon: { type: 'image', src: '/icons/categories/filtros.png', alt: 'Filtros' } },
  { re: /manuten/i, icon: { type: 'emoji', value: '🛠️' } },
]

=======
  { re: /freio/i, icon: { type: 'image', src: FREIOS_IMG, alt: 'Freios' } },
  { re: /filtro/i, icon: { type: 'image', src: FILTROS_IMG, alt: 'Filtros' } },
  { re: /manuten/i, icon: { type: 'emoji', value: '🛠️' } },
]

function resolveBySlugOrName(slug: string, name: string): CategoryIcon | null {
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug]
  for (const row of BY_NAME_HINT) {
    if (row.re.test(name) || (slug && row.re.test(slug))) return row.icon
  }
  return null
}

>>>>>>> Stashed changes
export function resolveCategoryIcon(input: {
  slug?: string | null
  name?: string | null
  emoji?: string | null
}): CategoryIcon {
<<<<<<< Updated upstream
  if (input.emoji?.trim()) return { type: 'emoji', value: input.emoji.trim() }

  const slug = (input.slug ?? '').trim().toLowerCase()
  if (slug === 'suspensao') {
    return { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' }
  }
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug]

  const name = (input.name ?? '').trim()
  for (const row of BY_NAME_HINT) {
    if (row.re.test(name) || row.re.test(slug)) return row.icon
=======
  const slug = (input.slug ?? '').trim().toLowerCase()
  const name = (input.name ?? '').trim()
  const mapped = resolveBySlugOrName(slug, name)
  if (mapped) return mapped

  const emoji = input.emoji?.trim()
  if (emoji && !PLACEHOLDER_EMOJI.has(emoji)) {
    return { type: 'emoji', value: emoji }
>>>>>>> Stashed changes
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
