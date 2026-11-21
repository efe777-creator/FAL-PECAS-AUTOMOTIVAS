/** Stages do caso pós-venda (F3) — payload em order_events. */

export type PostSaleStage =
  | 'aberto'
  | 'em_analise'
  | 'autorizada'
  | 'recusada'
  | 'aguardando_peca'
  | 'em_conferencia'
  | 'resolvido'

export type PostSaleReturnMode = 'me_codigo' | 'wa' | 'loja'

export const POST_SALE_STAGE_LABEL: Record<PostSaleStage, string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  autorizada: 'Autorizada',
  recusada: 'Recusada',
  aguardando_peca: 'Aguardando peça',
  em_conferencia: 'Em conferência',
  resolvido: 'Resolvido',
}

export const POST_SALE_RETURN_MODE_LABEL: Record<PostSaleReturnMode, string> = {
  me_codigo: 'Código Melhor Envio',
  wa: 'WhatsApp / Correios manual',
  loja: 'Devolver na loja',
}

export type MeReversePayload = {
  tracking_code?: string | null
  tracking_url?: string | null
  protocol?: string | null
  expires_at?: string | null
  service_id?: number | null
  amount?: number | null
  attached_at?: string | null
}

export function asPostSaleStage(v: unknown): PostSaleStage | null {
  const s = String(v ?? '')
  if (
    s === 'aberto' ||
    s === 'em_analise' ||
    s === 'autorizada' ||
    s === 'recusada' ||
    s === 'aguardando_peca' ||
    s === 'em_conferencia' ||
    s === 'resolvido'
  ) {
    return s
  }
  return null
}

export function asPostSaleReturnMode(v: unknown): PostSaleReturnMode | null {
  const s = String(v ?? '')
  if (s === 'me_codigo' || s === 'wa' || s === 'loja') return s
  return null
}

export function parseMeReversePayload(v: unknown): MeReversePayload | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  return {
    tracking_code: o.tracking_code != null ? String(o.tracking_code) : null,
    tracking_url: o.tracking_url != null ? String(o.tracking_url) : null,
    protocol: o.protocol != null ? String(o.protocol) : null,
    expires_at: o.expires_at != null ? String(o.expires_at) : null,
    service_id: o.service_id != null ? Number(o.service_id) : null,
    amount: o.amount != null ? Number(o.amount) : null,
    attached_at: o.attached_at != null ? String(o.attached_at) : null,
  }
}

export function meReverseCodeValid(me: MeReversePayload | null | undefined, now = Date.now()): boolean {
  const code = String(me?.tracking_code ?? '').trim()
  if (!code) return false
  if (!me?.expires_at) return true
  const exp = Date.parse(String(me.expires_at))
  if (Number.isNaN(exp)) return true
  return exp > now
}

export function isPostSaleTipo(tipo: string | null | undefined): boolean {
  const t = String(tipo ?? '').toLowerCase()
  return t.startsWith('pos_venda') || t === 'pos_entrega'
}
