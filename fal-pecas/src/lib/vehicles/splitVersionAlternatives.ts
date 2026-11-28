/**
 * Expande versões alternativas separadas por `/` ou `|` em várias linhas.
 * Não trata prefixo MARCA/ (isso já é removido em splitApiModelo).
 */
export function splitVersionAlternatives(raw: string | null | undefined): string[] {
  const t = String(raw ?? '').trim()
  if (!t) return ['']
  const parts = t
    .split(/\s*[|/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length <= 1) return [t]
  return parts
}
