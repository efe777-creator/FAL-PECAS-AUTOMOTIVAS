/**
 * Normalização de nomes de entidades FAL (FAL-IMP-02).
 *
 * Políticas:
 * - Chave de matching: sem acento, maiúsculas, espaços colapsados
 *   (CHEVROLET ≈ Chevrolet ≈ chevrolet ≈ Chévrolet).
 * - Categoria (exibição): MAIÚSCULAS pt-BR.
 * - Montadora / fabricante / modelo (exibição): trim + espaços colapsados
 *   (preserva casing comercial: Chevrolet, BMW, CAOA Chery).
 */

export function collapseSpaces(input: string): string {
  return input.replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

/** Remove diacríticos (NFD) mantendo a letra base. */
export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Chave canônica para igualdade / busca / anti-duplicidade.
 * Não usar como texto de exibição.
 */
export function normalizeEntityMatchKey(input: string | null | undefined): string {
  if (input == null) return ''
  return stripDiacritics(collapseSpaces(String(input))).toLocaleUpperCase('pt-BR')
}

export function entityNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = normalizeEntityMatchKey(a)
  const kb = normalizeEntityMatchKey(b)
  return Boolean(ka) && ka === kb
}

/** Categorias comerciais: sempre maiúsculas. */
export function formatCategoryName(input: string): string {
  return collapseSpaces(input).toLocaleUpperCase('pt-BR')
}

/** Montadoras, fabricantes de peça, modelos: limpa espaços; preserva casing. */
export function formatCatalogDisplayName(input: string): string {
  return collapseSpaces(input)
}

/** Partículas pt-BR em minúsculas no meio do nome (D4 title case). */
const TITLE_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o'])

/** Marcas/siglas comerciais que permanecem ALL CAPS na vitrine. */
const TITLE_PRESERVE_UPPER = new Set([
  'ABS',
  'BMW',
  'GM',
  'TRW',
  'VW',
  'NGK',
  'SKF',
  'KYB',
  'OEM',
  'NAP',
])

/**
 * Title case comercial para vitrine (D4).
 * Preserva whitelist de siglas (BMW, TRW) e partículas pt-BR.
 * Não usar como chave de matching — use `normalizeEntityMatchKey`.
 */
export function toCommercialTitleCase(input: string | null | undefined): string {
  const raw = collapseSpaces(input ?? '')
  if (!raw) return ''
  const words = raw.split(' ')
  return words
    .map((word, index) => {
      if (!word) return word
      const upper = word.toLocaleUpperCase('pt-BR')
      if (TITLE_PRESERVE_UPPER.has(upper)) return upper
      const lower = word.toLocaleLowerCase('pt-BR')
      if (index > 0 && TITLE_PARTICLES.has(lower)) return lower
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1)
    })
    .join(' ')
}

export function findByEntityName<T extends { name: string }>(
  items: T[],
  query: string,
): T | undefined {
  const key = normalizeEntityMatchKey(query)
  if (!key) return undefined
  return items.find((item) => normalizeEntityMatchKey(item.name) === key)
}
