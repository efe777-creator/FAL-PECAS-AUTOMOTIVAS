/** Regras de composição das grades da Home (Onda 3). */

/** Ofertas têm prioridade: remove da lista de destaques o que já aparece em ofertas. */
export function excludeProductsById<T extends { id: string }>(
  source: T[],
  exclude: Array<{ id: string }>,
): T[] {
  if (!source.length || !exclude.length) return source
  const ban = new Set(exclude.map((p) => p.id))
  return source.filter((p) => !ban.has(p.id))
}
