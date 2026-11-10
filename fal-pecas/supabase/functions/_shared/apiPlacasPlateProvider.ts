/**
 * Adapter comercial API Placas — consulta veicular simples (`/basico/{placa}`).
 * Docs: https://apiplacas.com.br/documentacao
 * Base: https://wdapi2.com.br/v3
 *
 * Secrets (Edge only): APIPLACAS_TOKEN · PLATE_PROVIDER=apiplacas
 * Nunca VITE_ / nunca no frontend.
 */
import type { PlateLookupProvider, PlateProviderRaw } from './plateProvider.ts'
import { splitApiModelo } from './splitApiModelo.ts'

const DEFAULT_BASE = 'https://wdapi2.com.br/v3'

function asString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s.length ? s : null
}

/** Montadoras da API vêm em CAIXA ALTA; alinha ao cadastro FAL (Title Case) sem inventar. */
function softTitleCase(value: string | null): string | null {
  if (!value) return null
  return value
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s\-_/])(\S)/g, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('pt-BR'))
}

/** Aliases comuns da API Placas → nomes do cadastro FAL. */
const MAKER_ALIASES: Record<string, string> = {
  vw: 'Volkswagen',
  volkswagen: 'Volkswagen',
  gm: 'Chevrolet',
  chevrolet: 'Chevrolet',
  chevy: 'Chevrolet',
  fiat: 'Fiat',
  ford: 'Ford',
  toyota: 'Toyota',
  honda: 'Honda',
  hyundai: 'Hyundai',
  renault: 'Renault',
  peugeot: 'Peugeot',
  citroen: 'Citroën',
  'citroën': 'Citroën',
  nissan: 'Nissan',
  jeep: 'Jeep',
  mitsubishi: 'Mitsubishi',
  mercedes: 'Mercedes-Benz',
  'mercedes-benz': 'Mercedes-Benz',
  bmw: 'BMW',
  audi: 'Audi',
  kia: 'Kia',
  volvo: 'Volvo',
  iveco: 'Iveco',
  scania: 'Scania',
}

function normalizeMakerName(raw: string | null): string | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  if (MAKER_ALIASES[key]) return MAKER_ALIASES[key]
  // Siglas curtas (ex.: BMW) permanecem em maiúsculas
  if (/^[A-Z]{2,4}$/.test(raw.trim())) return raw.trim().toUpperCase()
  return softTitleCase(raw)
}

/** Extrai ano AAAA sem inventar; "2019/2020" → "2019". */
export function extractYear(raw: unknown): string | null {
  const s = asString(raw)
  if (!s) return null
  const m = s.match(/(?:19|20)\d{2}/)
  return m ? m[0] : null
}

function unavailable(message?: string): PlateProviderRaw {
  return {
    status: 'unavailable',
    maker: null,
    model: null,
    year: null,
    version: null,
    engine: null,
    fuel: null,
    transmission: null,
    confidence: null,
    vehicleGroup: null,
    message:
      message ?? 'Consulta temporariamente indisponível. Selecione o veículo manualmente.',
  }
}

function notFound(message?: string): PlateProviderRaw {
  return {
    status: 'not_found',
    maker: null,
    model: null,
    year: null,
    version: null,
    engine: null,
    fuel: null,
    transmission: null,
    confidence: null,
    vehicleGroup: null,
    message: message ?? 'Não foi possível identificar o veículo pela placa.',
  }
}

/** Mapeia payload `/basico/{placa}` → contrato FAL (sem inventar motor/versão). */
export function mapApiPlacasBasicoToRaw(body: unknown): PlateProviderRaw {
  const root = (body ?? {}) as Record<string, unknown>

  if (root.error === true) {
    const codigo = asString(root.codigo)?.toLowerCase() ?? ''
    if (codigo === 'placa_invalida') {
      return {
        ...notFound(),
        status: 'invalid_plate',
        message: 'Formato inválido. Use placa antiga (ABC1234) ou Mercosul (ABC1D23).',
      }
    }
    if (codigo === 'placa_nao_encontrada') return notFound()
    if (codigo === 'saldo_insuficiente') {
      return unavailable('Consulta temporariamente indisponível. Selecione o veículo manualmente.')
    }
    return notFound(asString(root.message) ?? undefined)
  }

  const basico = (root.basico ?? {}) as Record<string, unknown>
  if (basico.error === true) {
    return notFound()
  }

  const dados = (basico.dados ?? {}) as Record<string, unknown>
  const maker = normalizeMakerName(asString(dados.marca))
  // /basico frequentemente devolve modelo composto ("HB20 1.0M UNIQUE") — separar.
  const split = splitApiModelo(asString(dados.modelo))
  const model = split.model
  const engine =
    asString(dados.motor) ??
    asString(dados.motorizacao) ??
    asString(dados.cilindrada) ??
    split.engine
  const version =
    asString(dados.versao) ??
    asString(dados.versão) ??
    asString(dados.version) ??
    split.version
  const year =
    extractYear(dados.ano) ??
    extractYear(dados.anoModelo) ??
    extractYear(dados.ano_modelo)
  const fuel = asString(dados.combustivel) ?? asString(dados.combustível)

  if (!maker && !model) return notFound()

  const incomplete = !year || !maker || !model
  return {
    status: incomplete ? 'incomplete' : 'found',
    maker,
    model,
    year,
    version,
    engine,
    fuel,
    transmission: null,
    confidence: incomplete ? 0.6 : 0.85,
    vehicleGroup: null,
    message: incomplete
      ? 'Identificação parcial — confira e complete os dados se necessário.'
      : null,
  }
}

function mapHttpError(status: number, body: unknown): PlateProviderRaw {
  const root = (body ?? {}) as Record<string, unknown>
  const codigo = asString(root.codigo)?.toLowerCase() ?? ''
  const requestId = asString(root.request_id)

  console.error('[apiplacas] http_error', {
    status,
    codigo,
    requestId,
    message: asString(root.message),
  })

  if (status === 400 && codigo === 'placa_invalida') {
    return {
      ...notFound(),
      status: 'invalid_plate',
      message: 'Formato inválido. Use placa antiga (ABC1234) ou Mercosul (ABC1D23).',
    }
  }
  if (status === 404 || codigo === 'placa_nao_encontrada') return notFound()
  if (status === 402 || codigo === 'saldo_insuficiente') {
    // Cliente: mesma UX de falha → seleção manual. Ops: ver logs Edge.
    return unavailable(
      'Consulta de placa indisponível no momento. Selecione o veículo manualmente.',
    )
  }
  if (status === 401 || status === 503 || status >= 500) {
    return unavailable()
  }
  if (root.error === true) return mapApiPlacasBasicoToRaw(body)
  return unavailable()
}

export function createApiPlacasPlateProvider(opts: {
  token: string
  baseUrl?: string
}): PlateLookupProvider {
  const base = (opts.baseUrl ?? Deno.env.get('APIPLACAS_BASE_URL') ?? DEFAULT_BASE).replace(
    /\/$/,
    '',
  )

  return {
    source: 'apiplacas',
    async lookupByPlate(plate: string): Promise<PlateProviderRaw> {
      const url = `${base}/basico/${encodeURIComponent(plate)}`
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${opts.token}`,
          },
        })

        let json: unknown = null
        try {
          json = await res.json()
        } catch {
          json = null
        }

        if (!res.ok) return mapHttpError(res.status, json)
        console.info('[apiplacas] ok', { plate, status: res.status })
        return mapApiPlacasBasicoToRaw(json)
      } catch (err) {
        console.error('[apiplacas] fetch error', err)
        return unavailable()
      }
    },
  }
}
