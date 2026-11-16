/** Mensagens amigáveis a partir do JSON de erro das Edges FAL PAY. */

/** Extrai descrição legível de `detail` Asaas (`{ errors: [{ description }] }`) ou string. */
export function formatEdgeDetail(detail: unknown): string | null {
  if (detail == null) return null
  if (typeof detail === 'string') {
    const t = detail.trim()
    return t || null
  }
  if (typeof detail === 'object') {
    const errors = (detail as { errors?: unknown }).errors
    if (Array.isArray(errors) && errors.length) {
      const parts = errors
        .map((e) => {
          if (!e || typeof e !== 'object') return null
          const d = (e as { description?: unknown }).description
          return typeof d === 'string' && d.trim() ? d.trim() : null
        })
        .filter((x): x is string => Boolean(x))
      if (parts.length) return parts.join(' ')
    }
  }
  return null
}

export function falEdgeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const row = data as { error?: string; detail?: unknown; message?: string }
    const detailText = formatEdgeDetail(row.detail)
    if (row.error === 'ASAAS_API_KEY missing' || row.error === 'MP_ACCESS_TOKEN missing') {
      return 'Pagamento indisponível no momento. Tente mais tarde.'
    }
    if (row.error === 'payment_route_mismatch') {
      return detailText || 'Este pagamento deve ser processado por outro provedor.'
    }
    if (row.error === 'installments_not_allowed') {
      return detailText || 'Parcelamento não permitido para este pedido.'
    }
    if (row.error === 'payer_document_required') {
      return 'Informe CPF ou CNPJ na conta para continuar.'
    }
    if (row.error === 'method_not_allowed') {
      return detailText || 'Meio de pagamento indisponível.'
    }
    if (row.error === 'payment_inconclusive') {
      return (
        detailText ||
        'Pagamento em verificação no provedor. Não tente criar de novo — use “Já paguei” ou aguarde.'
      )
    }
    if (row.error === 'payment_creating_in_progress') {
      return detailText || 'Pagamento em andamento. Aguarde alguns segundos e tente novamente.'
    }
    if (row.error === 'payment_method_conflict') {
      return (
        detailText ||
        'Já existe cobrança pendente com outro meio neste pedido. Cancele a compra ou conclua o pagamento atual.'
      )
    }
    if (row.error === 'asaas_create_failed') {
      return detailText || 'Não foi possível criar a cobrança. Tente outro meio ou valor.'
    }
    if (row.error) {
      return detailText || row.error
    }
  }
  return fallback
}
