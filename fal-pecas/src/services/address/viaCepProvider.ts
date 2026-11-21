import { normalizeCep } from '@/lib/cep'
import type { CepLookupResult, CepProvider } from '@/types'

type ViaCepJson = {
  erro?: boolean | string
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

type BrasilApiJson = {
  cep?: string
  state?: string
  city?: string
  neighborhood?: string
  street?: string
  message?: string
}

export class CepNotFoundError extends Error {
  constructor(message = 'CEP não encontrado') {
    super(message)
    this.name = 'CepNotFoundError'
  }
}

export class CepUnavailableError extends Error {
  constructor(message = 'Consulta de CEP indisponível no momento') {
    super(message)
    this.name = 'CepUnavailableError'
  }
}

export class CepInvalidError extends Error {
  constructor(message = 'CEP inválido') {
    super(message)
    this.name = 'CepInvalidError'
  }
}

async function fetchJson(url: string, ms = 8000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`http_${res.status}`)
    return await res.json()
  } finally {
    window.clearTimeout(timer)
  }
}

async function lookupViaCep(digits: string): Promise<CepLookupResult> {
  const data = (await fetchJson(`https://viacep.com.br/ws/${digits}/json/`)) as ViaCepJson
  if (data.erro === true || data.erro === 'true') throw new CepNotFoundError()
  const city = (data.localidade ?? '').trim()
  const state = (data.uf ?? '').trim().toUpperCase()
  if (!city || !state) throw new CepNotFoundError()
  return {
    cep: digits,
    street: (data.logradouro ?? '').trim(),
    district: (data.bairro ?? '').trim(),
    city,
    state,
  }
}

async function lookupBrasilApi(digits: string): Promise<CepLookupResult> {
  try {
    const data = (await fetchJson(
      `https://brasilapi.com.br/api/cep/v1/${digits}`,
    )) as BrasilApiJson
    const city = (data.city ?? '').trim()
    const state = (data.state ?? '').trim().toUpperCase()
    if (!city || !state) throw new CepNotFoundError()
    return {
      cep: digits,
      street: (data.street ?? '').trim(),
      district: (data.neighborhood ?? '').trim(),
      city,
      state,
    }
  } catch (e) {
    if (e instanceof CepNotFoundError) throw e
    // BrasilAPI 404
    if (e instanceof Error && e.message === 'http_404') throw new CepNotFoundError()
    throw new CepUnavailableError()
  }
}

const CEP_CACHE_TTL_MS = 10 * 60_000
const cepCache = new Map<string, { at: number; value: CepLookupResult }>()

export function clearCepLookupCache() {
  cepCache.clear()
}

/** Provider CEP — ViaCEP com fallback BrasilAPI; cache curto em memória. */
export const viaCepProvider: CepProvider = {
  async lookupByCep(cep: string): Promise<CepLookupResult> {
    const digits = normalizeCep(cep)
    if (digits.length !== 8) throw new CepInvalidError()

    const hit = cepCache.get(digits)
    if (hit && Date.now() - hit.at < CEP_CACHE_TTL_MS) {
      return hit.value
    }

    try {
      const value = await lookupViaCep(digits)
      cepCache.set(digits, { at: Date.now(), value })
      return value
    } catch (e) {
      if (e instanceof CepNotFoundError) throw e
      // timeout/rede/5xx → tenta fallback
      try {
        const value = await lookupBrasilApi(digits)
        cepCache.set(digits, { at: Date.now(), value })
        return value
      } catch (e2) {
        if (e2 instanceof CepNotFoundError || e2 instanceof CepInvalidError) throw e2
        throw new CepUnavailableError()
      }
    }
  },
}
