/**
 * Adapter comercial API Placas — `/basico` (default) ou `/basico-fipe` (flag).
 * Step-up `/motor` opcional. Sem `/completa` (LGPD/custo).
 * Docs: https://apiplacas.com.br/documentacao
 *
 * Secrets: APIPLACAS_TOKEN · PLATE_PROVIDER=apiplacas
 * Flags: PLATE_FIPE_ASSIST=1 · PLATE_ENGINE_STEPUP=1
 * Nunca VITE_ / nunca no frontend. Nunca predicado PVC.
 */
import type { PlateLookupProvider, PlateProviderRaw } from './plateProvider.ts'
import {
  sanitizeEngine,
  sanitizeVersionLabel,
  splitApiModelo,
} from './splitApiModelo.ts'

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
  chev: 'Chevrolet',
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

/** Extrai ano AAAA sem inventar; "2019/2020" → primeiro (fab). */
export function extractYear(raw: unknown): string | null {
  const s = asString(raw)
  if (!s) return null
  const m = s.match(/(?:19|20)\d{2}/)
  return m ? m[0] : null
}

/** Ano-modelo: em faixa "2019/2020" usa o último AAAA; senão o único. */
export function extractYearPreferModel(raw: unknown): string | null {
  const s = asString(raw)
  if (!s) return null
  const years = [...s.matchAll(/(?:19|20)\d{2}/g)].map((m) => m[0]!)
  if (!years.length) return null
  return years[years.length - 1]!
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
  // Prefere motor extraído do modelo composto; API às vezes manda lixo (ex.: 0.1).
  const engineRaw =
    split.engine ??
    asString(dados.motor) ??
    asString(dados.motorizacao) ??
    asString(dados.cilindrada)
  const engine = sanitizeEngine(engineRaw)
  // Versão da API às vezes é motor+câmbio ("1.6 A") — nunca vira trim.
  const versionRaw =
    split.version ??
    asString(dados.versao) ??
    asString(dados.versão) ??
    asString(dados.version)
  const version = sanitizeVersionLabel(versionRaw)
  // Dual year: ano-modelo (filtro/peças) + fabricação (informativo).
  const yearModel =
    extractYearPreferModel(dados.anoModelo) ??
    extractYearPreferModel(dados.ano_modelo) ??
    extractYearPreferModel(dados.anoModeloReferencia) ??
    null
  const yearFabrication =
    extractYear(dados.anoFabricacao) ??
    extractYear(dados.ano_fabricacao) ??
    extractYear(dados.ano) ??
    null
  const year = yearModel ?? yearFabrication
  const fuel = asString(dados.combustivel) ?? asString(dados.combustível)
  const transmission =
    asString(dados.cambio) ??
    asString(dados.câmbio) ??
    asString(dados.transmissao) ??
    asString(dados.transmissão) ??
    asString(dados.transmission)

  if (!maker && !model) return notFound()

  const incomplete = !year || !maker || !model
  const dualMismatch =
    Boolean(yearModel && yearFabrication && yearModel !== yearFabrication)
  return {
    status: incomplete ? 'incomplete' : 'found',
    maker,
    model,
    year,
    yearModel: yearModel ?? year,
    yearFabrication,
    version,
    engine,
    engineRaw: engine ? null : engineRaw,
    versionRaw: version ? null : versionRaw,
    fuel,
    transmission,
    confidence: incomplete ? 0.6 : dualMismatch ? 0.75 : 0.85,
    vehicleGroup: null,
    message: incomplete
      ? 'Identificação parcial — confira e complete os dados se necessário.'
      : dualMismatch
        ? `Ano fabricação (${yearFabrication}) ≠ ano-modelo (${yearModel}). Peças usam o ano-modelo — confira.`
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

function parseFipeEntries(body: unknown): Array<{
  codigo: string
  modelo: string
  score: number
}> {
  const root = (body ?? {}) as Record<string, unknown>
  const fipe = (root.fipe ?? {}) as Record<string, unknown>
  if (fipe.error === true) return []
  const dados = fipe.dados
  if (!Array.isArray(dados)) return []
  const out: Array<{ codigo: string; modelo: string; score: number }> = []
  for (const row of dados) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const codigo = asString(o.codigo_fipe) ?? asString(o.codigo) ?? ''
    const modelo = asString(o.modelo) ?? ''
    const score = typeof o.score === 'number' ? o.score : 0
    if (!modelo && !codigo) continue
    out.push({ codigo, modelo, score })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** Empate FIPE: top e 2º com Δ score ≤ 15 e ambos ≥ 40 → ambiguous. */
function fipeAmbiguous(
  entries: Array<{ codigo: string; modelo: string; score: number }>,
): boolean {
  if (entries.length < 2) return false
  const a = entries[0]!
  const b = entries[1]!
  return a.score >= 40 && b.score >= 40 && a.score - b.score <= 15
}

async function fetchJson(
  url: string,
  token: string,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { ok: res.ok, status: res.status, json }
}

function extractMotorFromBlock(body: unknown): string | null {
  const root = (body ?? {}) as Record<string, unknown>
  const motor = (root.motor ?? {}) as Record<string, unknown>
  if (motor.error === true) return null
  const dados = (motor.dados ?? {}) as Record<string, unknown>
  return (
    sanitizeEngine(asString(dados.numero) ?? asString(dados.motor) ?? asString(dados.cilindrada)) ??
    null
  )
}

export function createApiPlacasPlateProvider(opts: {
  token: string
  baseUrl?: string
}): PlateLookupProvider {
  const base = (opts.baseUrl ?? Deno.env.get('APIPLACAS_BASE_URL') ?? DEFAULT_BASE).replace(
    /\/$/,
    '',
  )
  const fipeAssist = Deno.env.get('PLATE_FIPE_ASSIST') === '1'
  const engineStepup = Deno.env.get('PLATE_ENGINE_STEPUP') === '1'

  return {
    source: 'apiplacas',
    async lookupByPlate(plate: string): Promise<PlateProviderRaw> {
      const path = fipeAssist ? 'basico-fipe' : 'basico'
      const url = `${base}/${path}/${encodeURIComponent(plate)}`
      try {
        const primary = await fetchJson(url, opts.token)
        if (!primary.ok) return mapHttpError(primary.status, primary.json)
        console.info('[apiplacas] ok', { plate, path, status: primary.status })

        let raw = mapApiPlacasBasicoToRaw(primary.json)
        const fipeEntries = fipeAssist ? parseFipeEntries(primary.json) : []
        if (fipeEntries.length) {
          raw = { ...raw, fipeCodes: fipeEntries }
          if (fipeAmbiguous(fipeEntries) && raw.status !== 'not_found') {
            raw = {
              ...raw,
              status: 'ambiguous',
              candidates: fipeEntries.slice(0, 4).map((e) => {
                const split = splitApiModelo(e.modelo)
                return {
                  maker: raw.maker,
                  model: split.model || e.modelo,
                  year: raw.year,
                  version: split.version,
                  engine: split.engine ?? raw.engine,
                }
              }),
              message:
                raw.message ??
                'Mais de uma versão FIPE possível para esta placa. Escolha a correta.',
              confidence: Math.min(raw.confidence ?? 0.7, 0.7),
            }
          } else if (
            !raw.engine &&
            fipeEntries[0]?.modelo &&
            raw.status !== 'ambiguous'
          ) {
            const split = splitApiModelo(fipeEntries[0].modelo)
            if (split.engine && !raw.engine) {
              raw = { ...raw, engine: split.engine }
            }
            if (split.version && !raw.version) {
              raw = { ...raw, version: split.version }
            }
          }
        }

        if (engineStepup && !raw.engine && raw.status !== 'not_found' && raw.status !== 'unavailable') {
          try {
            const motorUrl = `${base}/motor/${encodeURIComponent(plate)}`
            const motorRes = await fetchJson(motorUrl, opts.token)
            if (motorRes.ok) {
              const eng = extractMotorFromBlock(motorRes.json)
              if (eng) raw = { ...raw, engine: eng }
            } else {
              console.warn('[apiplacas] motor step-up fail', {
                plate,
                status: motorRes.status,
              })
            }
          } catch (motorErr) {
            console.warn('[apiplacas] motor step-up error', motorErr)
          }
        }

        return raw
      } catch (err) {
        console.error('[apiplacas] fetch error', err)
        return unavailable()
      }
    },
  }
}
