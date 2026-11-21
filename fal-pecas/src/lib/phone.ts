/** Telefone BR: máscara dinâmica; persistência só dígitos. */

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/** (11) 99999-9999 ou (11) 9999-9999 */
export function formatPhoneMask(value: string): string {
  const d = normalizePhone(value)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function isValidPhone(value: string): boolean {
  const d = normalizePhone(value)
  return d.length === 10 || d.length === 11
}

/** Celular BR apto a WhatsApp: 11 dígitos e 3º dígito = 9 (ex.: 11987654321). */
export function isValidWhatsAppPhone(value: string): boolean {
  const d = normalizePhone(value)
  return d.length === 11 && d[2] === '9'
}

export function phoneInvalidMessage(): string {
  return 'Telefone inválido. Use DDD + número (10 ou 11 dígitos).'
}

export function whatsappPhoneInvalidMessage(): string {
  return 'WhatsApp inválido. Use celular com DDD (11 dígitos, ex.: 11 9xxxx-xxxx).'
}

export function whatsappPhoneFieldHint(): string {
  return 'Celular com WhatsApp (DDD + 9). Se não informar, a confirmação da conta será por e-mail.'
}
