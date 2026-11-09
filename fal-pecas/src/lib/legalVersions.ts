/** Versões públicas dos documentos legais resumidos (AJUSTE-027). */

export const LEGAL_VERSIONS = {
  terms: '2026-11-09',
  privacy: '2026-11-09',
  returns: '2026-11-09',
} as const

export type LegalDocKind = 'termos' | 'privacidade' | 'trocas-devolucoes'

export function legalVersionFor(kind: LegalDocKind): string {
  if (kind === 'termos') return LEGAL_VERSIONS.terms
  if (kind === 'privacidade') return LEGAL_VERSIONS.privacy
  return LEGAL_VERSIONS.returns
}
