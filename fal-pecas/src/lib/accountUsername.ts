/** Username de login: mesma regra no cadastro e no perfil. */
export const USERNAME_MIN = 3
export const USERNAME_MAX = 32
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Retorna username limpo ou null se vazio. Lança Error com mensagem de UI se inválido. */
export function parseOptionalUsername(raw: string): string | null {
  const cleaned = normalizeUsername(raw)
  if (!cleaned) return null
  if (cleaned.length < USERNAME_MIN || cleaned.length > USERNAME_MAX) {
    throw new Error(
      `Usuário: ${USERNAME_MIN}–${USERNAME_MAX} caracteres (letras, números, . _ -).`,
    )
  }
  if (!USERNAME_PATTERN.test(cleaned)) {
    throw new Error('Usuário: use apenas letras, números, ponto, _ ou -.')
  }
  return cleaned
}

export function usernameFieldHint(): string {
  return `Opcional. ${USERNAME_MIN}–${USERNAME_MAX} caracteres (letras, números, . _ -). Serve para entrar sem e-mail.`
}
