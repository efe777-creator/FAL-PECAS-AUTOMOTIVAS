/**
 * Regras de enriquecimento vs conflito para atributos técnicos da VV.
 * Fase 2 — não altera a chave natural; só decide o que fazer com cada campo.
 */

export type EnrichDecision =
  | { kind: 'enrich'; next: string }
  | { kind: 'unchanged' }
  | { kind: 'conflict'; current: string; incoming: string }
  | { kind: 'skip' }

function norm(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t ? t : null
}

/**
 * Campo vazio recebe valor → enrich.
 * Mesmo valor → unchanged.
 * Valor preenchido ≠ incoming → conflict (não sobrescreve).
 * Incoming vazio → skip.
 */
export function decideAttributeEnrichment(
  current: string | null | undefined,
  incoming: string | null | undefined,
): EnrichDecision {
  const cur = norm(current)
  const next = norm(incoming)
  if (!next) return { kind: 'skip' }
  if (!cur) return { kind: 'enrich', next }
  if (cur.toLowerCase() === next.toLowerCase()) return { kind: 'unchanged' }
  return { kind: 'conflict', current: cur, incoming: next }
}

export type TechAttributeBag = {
  transmission?: string | null
  transmissionDetail?: string | null
  traction?: string | null
  tractionDetail?: string | null
  bodyConfiguration?: string | null
  vehicleClass?: string | null
  fuel?: string | null
}

export type TechEnrichPlan = {
  patch: TechAttributeBag
  conflicts: Array<{ attribute: string; current: string; incoming: string }>
  enriched: string[]
  unchanged: string[]
}

const ATTRS: Array<keyof TechAttributeBag> = [
  'fuel',
  'transmission',
  'transmissionDetail',
  'traction',
  'tractionDetail',
  'bodyConfiguration',
  'vehicleClass',
]

/** Compara estado atual com proposta e monta patch só com enriquecimentos seguros. */
export function planTechAttributeEnrichment(
  current: TechAttributeBag,
  incoming: TechAttributeBag,
): TechEnrichPlan {
  const patch: TechAttributeBag = {}
  const conflicts: TechEnrichPlan['conflicts'] = []
  const enriched: string[] = []
  const unchanged: string[] = []

  for (const key of ATTRS) {
    const d = decideAttributeEnrichment(current[key], incoming[key])
    if (d.kind === 'enrich') {
      patch[key] = d.next
      enriched.push(key)
    } else if (d.kind === 'unchanged') {
      unchanged.push(key)
    } else if (d.kind === 'conflict') {
      conflicts.push({ attribute: key, current: d.current, incoming: d.incoming })
    }
  }

  return { patch, conflicts, enriched, unchanged }
}
