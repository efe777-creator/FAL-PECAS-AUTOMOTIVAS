import type { CompatibilityVerdict } from '@/services/compatibility/compatibilityEngine'
import {
  compatFaltante,
  compatMotivo,
  compatSealDisplayLabel,
} from '@/services/compatibility/compatCopy'
import { resolveCardSeal } from '@/services/compatibility/compatibilityEngine'

const KEY = 'fal_compat_decision_log_v1'

export type CompatDecisionAction =
  | 'continue_unconfirmed'
  | 'continue_incompatible'
  | 'confirmed'

export type CompatDecisionEntry = {
  productId: string
  name: string
  sku?: string
  sealLabel: string
  action: CompatDecisionAction
  motivo?: string | null
  faltante?: string | null
  at: string
}

export type CompatDecisionLog = {
  gatedAt: string
  entries: CompatDecisionEntry[]
}

export function readCompatDecisionLog(): CompatDecisionLog | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CompatDecisionLog
    if (!parsed?.gatedAt || !Array.isArray(parsed.entries)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearCompatDecisionLog(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(KEY)
}

export function writeCompatDecisionLog(log: CompatDecisionLog): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(KEY, JSON.stringify(log))
}

/** Monta entradas a partir dos vereditos (só itens que não são Compatível confirmado). */
export function buildCompatDecisionEntries(
  items: { productId: string; name: string; sku?: string }[],
  verdicts: Map<string, CompatibilityVerdict>,
): CompatDecisionEntry[] {
  const at = new Date().toISOString()
  const entries: CompatDecisionEntry[] = []
  for (const item of items) {
    const verdict = verdicts.get(item.productId)
    if (!verdict) continue
    const seal = resolveCardSeal(verdict)
    if (seal.kind === 'compatible') continue
    const action: CompatDecisionAction =
      seal.kind === 'hide' ? 'continue_incompatible' : 'continue_unconfirmed'
    entries.push({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      sealLabel: compatSealDisplayLabel(verdict),
      action,
      motivo: compatMotivo(verdict),
      faltante: compatFaltante(verdict),
      at,
    })
  }
  return entries
}

export function compatGateCounts(entries: CompatDecisionEntry[]): {
  unconfirmedCount: number
  incompatCount: number
  itemCount: number
} {
  const incompatCount = entries.filter((e) => e.action === 'continue_incompatible').length
  const unconfirmedCount = entries.filter((e) => e.action === 'continue_unconfirmed').length
  return {
    unconfirmedCount,
    incompatCount,
    itemCount: entries.length,
  }
}

/** Texto do gate E.4 para confirmDialog. */
export function compatGateDialogCopy(entries: CompatDecisionEntry[]): {
  title: string
  message: string
  confirmLabel: string
} {
  const hasIncompat = entries.some((e) => e.action === 'continue_incompatible')
  const lines = entries
    .slice(0, 6)
    .map((e) => {
      const ref = e.sku ? `${e.sku} — ` : ''
      const extra = e.faltante ? ` — Falta: ${e.faltante}` : e.motivo ? ` — ${e.motivo}` : ''
      return `· ${ref}${e.name} — ${e.sealLabel}${extra}`
    })
    .join('\n')
  const more = entries.length > 6 ? `\n· …e mais ${entries.length - 6}` : ''

  if (hasIncompat) {
    return {
      title: 'Peça incompatível com o veículo atual',
      message:
        `Uma ou mais peças não cruzam com o veículo ativo:\n\n${lines}${more}\n\n` +
        'Deseja seguir mesmo assim?',
      confirmLabel: 'Seguir mesmo assim',
    }
  }

  return {
    title: 'Antes de pagar',
    message:
      `Estas peças ainda não estão confirmadas para o veículo:\n\n${lines}${more}\n\n` +
      'Complete os dados do veículo na garagem ou continue sem confirmar.',
    confirmLabel: 'Continuar sem confirmar',
  }
}
