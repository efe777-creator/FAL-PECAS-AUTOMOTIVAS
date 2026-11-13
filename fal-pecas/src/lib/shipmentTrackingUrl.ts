/** Monta URL de rastreio quando possível (cliente/admin). */

export function buildTrackingUrl(input: {
  trackingCode?: string | null
  trackingUrl?: string | null
  carrier?: string | null
  provider?: string | null
}): string | null {
  const explicit = String(input.trackingUrl ?? '').trim()
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit
    if (explicit.startsWith('www.')) return `https://${explicit}`
  }

  const code = String(input.trackingCode ?? '').trim()
  if (!code) return null

  if (/^https?:\/\//i.test(code)) return code
  if (code.startsWith('www.')) return `https://${code}`

  const carrier = `${input.carrier ?? ''} ${input.provider ?? ''}`.toLowerCase()
  // Código Correios típico: AA123456789BR
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(code) || /correios|sedex|pac/i.test(carrier)) {
    return `https://www.linkcorreios.com.br/?id=${encodeURIComponent(code)}`
  }
  if (/melhor\s*envio|melhorenvio/i.test(carrier)) {
    return `https://melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`
  }
  return null
}
