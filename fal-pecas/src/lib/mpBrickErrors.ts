/**
 * Mensagens do Card Payment Brick (Secure Fields) → copy PT para o cliente.
 */

export function mapMpBrickError(err: unknown): {
  userMessage: string
  setupFailed: boolean
  raw: string
} {
  const raw =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : err && typeof err === 'object' && 'cause' in err
          ? String((err as { cause: unknown }).cause)
          : 'Erro no formulário de cartão'

  const lower = raw.toLowerCase()
  const setupFailed =
    lower.includes('secure fields') ||
    lower.includes('fields_setup_failed') ||
    lower.includes('fields setup')

  if (setupFailed) {
    return {
      userMessage:
        'Não foi possível carregar o formulário seguro do cartão. Tente novamente ou pague com Pix.',
      setupFailed: true,
      raw,
    }
  }

  return {
    userMessage: raw.startsWith('The ') || raw.startsWith('Failed ')
      ? 'Não foi possível usar o cartão agora. Tente novamente ou use Pix.'
      : raw,
    setupFailed: false,
    raw,
  }
}
