/**
 * Expande termos da busca via mapa termo → expands_to (prep IA / sinônimos).
 * Substitui token a token (compatível com AND do RPC). Frases multi-palavra:
 * tenta match do restante da string a partir de cada posição.
 */

export type SynonymMap = Map<string, string>

function normToken(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

/** Monta mapa a partir de linhas (term → expands_to). */
export function synonymMapFromRows(
  rows: Array<{ term: string; expandsTo: string }>,
): SynonymMap {
  const map: SynonymMap = new Map()
  for (const r of rows) {
    const t = normToken(r.term)
    const e = r.expandsTo.trim()
    if (t && e) map.set(t, e)
  }
  return map
}

/**
 * Se flag off ou mapa vazio, devolve q original.
 * Preferência: match de frase (mais tokens) antes de token único.
 */
export function expandSearchQuery(q: string, map: SynonymMap | null | undefined): string {
  const raw = q.trim()
  if (!raw || !map?.size) return raw

  const tokens = raw.split(/\s+/).filter(Boolean)
  if (!tokens.length) return raw

  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    let matched = false
    for (let len = Math.min(4, tokens.length - i); len >= 1; len -= 1) {
      const phrase = normToken(tokens.slice(i, i + len).join(' '))
      const exp = map.get(phrase)
      if (exp) {
        out.push(exp)
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      out.push(tokens[i]!)
      i += 1
    }
  }
  return out.join(' ')
}
