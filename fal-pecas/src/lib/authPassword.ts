/** Regra única de senha (login / cadastro / redefinir). */
export const MIN_PASSWORD_LENGTH = 6

export function passwordRuleHint(): string {
  return `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`
}

export function passwordTooShortMessage(): string {
  return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
}
