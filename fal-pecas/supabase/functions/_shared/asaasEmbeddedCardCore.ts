/**
 * Cartão de crédito embutido (checkout FAL → API Asaas).
 * Débito NÃO usa este módulo — doc Asaas: débito só via invoiceUrl.
 * PAN/CVV nunca devem ser logados nem gravados no ledger.
 */

export type AsaasCreditCardInput = {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export type AsaasCreditCardHolderInfoInput = {
  name: string
  email: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
  mobilePhone?: string
  address?: string
  province?: string
}

export type AsaasDeviceInfoInput = {
  colorDepth?: number
  screenHeight?: number
  screenWidth?: number
  timeZoneOffset?: number
  language?: string
  userAgent?: string
}

export type ParsedAsaasEmbeddedCardBody = {
  orderId: string
  installments: number
  creditCard: AsaasCreditCardInput
  creditCardHolderInfo: AsaasCreditCardHolderInfoInput
  deviceInfo: AsaasDeviceInfoInput | null
  callbackUrl: string | null
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function reqString(raw: unknown, field: string, minLen = 1): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s.length < minLen) throw new Error(`${field}_obrigatorio`)
  return s
}

/** Valida e normaliza payload do client para cobrança embutida (somente crédito). */
export function parseAsaasEmbeddedCardClientBody(
  body: Record<string, unknown>,
): ParsedAsaasEmbeddedCardBody {
  const orderId = reqString(body.orderId, 'orderId')

  let installments = 1
  if (body.installments !== undefined && body.installments !== null) {
    installments = Math.floor(Number(body.installments))
    if (!Number.isFinite(installments) || installments < 1 || installments > 21) {
      throw new Error('installments_invalido')
    }
  }

  const cardRaw = body.creditCard
  if (!cardRaw || typeof cardRaw !== 'object') throw new Error('creditCard_obrigatorio')
  const card = cardRaw as Record<string, unknown>

  const number = onlyDigits(reqString(card.number, 'creditCard.number', 13))
  if (number.length < 13 || number.length > 19) throw new Error('creditCard.number_invalido')

  const expiryMonth = onlyDigits(reqString(card.expiryMonth, 'creditCard.expiryMonth'))
  const monthNum = Number(expiryMonth)
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error('creditCard.expiryMonth_invalido')
  }
  const expiryMonthPad = String(monthNum).padStart(2, '0')

  let expiryYear = onlyDigits(reqString(card.expiryYear, 'creditCard.expiryYear'))
  if (expiryYear.length === 2) expiryYear = `20${expiryYear}`
  if (expiryYear.length !== 4) throw new Error('creditCard.expiryYear_invalido')

  const ccv = onlyDigits(reqString(card.ccv, 'creditCard.ccv', 3))
  if (ccv.length < 3 || ccv.length > 4) throw new Error('creditCard.ccv_invalido')

  const holderRaw = body.creditCardHolderInfo
  if (!holderRaw || typeof holderRaw !== 'object') {
    throw new Error('creditCardHolderInfo_obrigatorio')
  }
  const holder = holderRaw as Record<string, unknown>
  const cpfCnpj = onlyDigits(reqString(holder.cpfCnpj, 'creditCardHolderInfo.cpfCnpj', 11))
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    throw new Error('creditCardHolderInfo.cpfCnpj_invalido')
  }
  const postalCode = onlyDigits(reqString(holder.postalCode, 'creditCardHolderInfo.postalCode', 8))
  if (postalCode.length !== 8) throw new Error('creditCardHolderInfo.postalCode_invalido')
  const phone = onlyDigits(reqString(holder.phone, 'creditCardHolderInfo.phone', 10))
  const mobileRaw =
    typeof holder.mobilePhone === 'string' && holder.mobilePhone.trim()
      ? onlyDigits(holder.mobilePhone)
      : phone

  let deviceInfo: AsaasDeviceInfoInput | null = null
  if (body.deviceInfo && typeof body.deviceInfo === 'object') {
    const d = body.deviceInfo as Record<string, unknown>
    deviceInfo = {
      colorDepth: d.colorDepth != null ? Number(d.colorDepth) : undefined,
      screenHeight: d.screenHeight != null ? Number(d.screenHeight) : undefined,
      screenWidth: d.screenWidth != null ? Number(d.screenWidth) : undefined,
      timeZoneOffset: d.timeZoneOffset != null ? Number(d.timeZoneOffset) : undefined,
      language: typeof d.language === 'string' ? d.language : undefined,
      userAgent: typeof d.userAgent === 'string' ? d.userAgent.slice(0, 512) : undefined,
    }
  }

  const callbackUrl =
    typeof body.callbackUrl === 'string' && body.callbackUrl.startsWith('https://')
      ? body.callbackUrl.trim().slice(0, 2000)
      : null

  return {
    orderId,
    installments,
    creditCard: {
      holderName: reqString(card.holderName, 'creditCard.holderName', 2),
      number,
      expiryMonth: expiryMonthPad,
      expiryYear,
      ccv,
    },
    creditCardHolderInfo: {
      name: reqString(holder.name, 'creditCardHolderInfo.name', 2),
      email: reqString(holder.email, 'creditCardHolderInfo.email', 5),
      cpfCnpj,
      postalCode,
      addressNumber: reqString(holder.addressNumber, 'creditCardHolderInfo.addressNumber'),
      phone,
      mobilePhone: mobileRaw,
      address: typeof holder.address === 'string' ? holder.address.trim() : undefined,
      province: typeof holder.province === 'string' ? holder.province.trim() : undefined,
    },
    deviceInfo,
    callbackUrl,
  }
}

/** Anexa dados de cartão ao body POST /payments (sem mutar o base além do necessário). */
export function attachCreditCardToAsaasCreateBody(
  base: Record<string, unknown>,
  input: {
    creditCard: AsaasCreditCardInput
    creditCardHolderInfo: AsaasCreditCardHolderInfoInput
    remoteIp: string
    deviceInfo?: AsaasDeviceInfoInput | null
    callbackUrl?: string | null
  },
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...base,
    creditCard: { ...input.creditCard },
    creditCardHolderInfo: { ...input.creditCardHolderInfo },
    remoteIp: input.remoteIp,
  }
  if (input.callbackUrl) {
    out.threeDSecure = { callbackUrl: input.callbackUrl }
  }
  if (input.deviceInfo) {
    out.deviceInfo = {
      ...input.deviceInfo,
      remoteIp: input.remoteIp,
    }
  }
  return out
}

/** Body para POST /payments/{id}/payWithCreditCard (cobrança já criada na fatura). */
export function buildAsaasPayWithCreditCardBody(input: {
  creditCard: AsaasCreditCardInput
  creditCardHolderInfo: AsaasCreditCardHolderInfoInput
  remoteIp: string
  deviceInfo?: AsaasDeviceInfoInput | null
  callbackUrl?: string | null
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    creditCard: { ...input.creditCard },
    creditCardHolderInfo: { ...input.creditCardHolderInfo },
  }
  if (input.callbackUrl) {
    out.threeDSecure = { callbackUrl: input.callbackUrl }
  }
  if (input.deviceInfo) {
    out.deviceInfo = {
      ...input.deviceInfo,
      remoteIp: input.remoteIp,
    }
  }
  return out
}

/** Sanitiza erro Asaas sem ecoar número do cartão. */
export function sanitizeAsaasCardErrorBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  try {
    const raw = JSON.stringify(body)
    if (/creditCard|ccv|"number"\s*:/i.test(raw)) {
      return { error: 'asaas_card_declined_or_invalid' }
    }
  } catch {
    return { error: 'asaas_card_error' }
  }
  return body
}
