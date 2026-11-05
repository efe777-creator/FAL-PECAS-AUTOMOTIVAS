/** Identidade comercial da loja (env). Sem inventar CNPJ/contato. */

export type StoreIdentity = {
  legalName: string
  cnpj: string | null
  cnpjFormatted: string | null
  phone: string | null
  phoneDisplay: string | null
  email: string | null
  cityState: string | null
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

function formatCnpj(digits: string): string | null {
  if (digits.length !== 14) return null
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function formatPhoneBr(digits: string): string | null {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return digits.length >= 10 ? digits : null
}

export function getStoreIdentity(): StoreIdentity {
  const legalName =
    (import.meta.env.VITE_STORE_LEGAL_NAME as string | undefined)?.trim() ||
    'FAL Peças Automotivas'
  const cnpjDigits = digitsOnly(
    (import.meta.env.VITE_STORE_CNPJ as string | undefined)?.trim() ?? '',
  )
  const phoneDigits = digitsOnly(
    (import.meta.env.VITE_STORE_PHONE as string | undefined)?.trim() ||
      (import.meta.env.VITE_WHATSAPP_PHONE as string | undefined)?.trim() ||
      '',
  )
  const email = (import.meta.env.VITE_STORE_EMAIL as string | undefined)?.trim() || null
  const cityState =
    (import.meta.env.VITE_STORE_CITY_STATE as string | undefined)?.trim() || null

  return {
    legalName,
    cnpj: cnpjDigits.length === 14 ? cnpjDigits : null,
    cnpjFormatted: cnpjDigits.length === 14 ? formatCnpj(cnpjDigits) : null,
    phone: phoneDigits.length >= 10 ? phoneDigits : null,
    phoneDisplay: phoneDigits.length >= 10 ? formatPhoneBr(phoneDigits) : null,
    email: email && email.includes('@') ? email : null,
    cityState,
  }
}
