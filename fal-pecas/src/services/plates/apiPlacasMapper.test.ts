import { describe, expect, it } from 'vitest'
import { normalizeVersionLabel, splitApiModelo } from './splitApiModelo'

/** Espelho do mapper Edge (apiPlacasPlateProvider) para Vitest. */
function extractYearPreferModel(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  const years = [...s.matchAll(/(?:19|20)\d{2}/g)].map((m) => m[0]!)
  if (!years.length) return null
  return years[years.length - 1]!
}

function softMaker(raw: string | null): string | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  if (key === 'hyundai') return 'Hyundai'
  if (key === 'volkswagen' || key === 'vw') return 'Volkswagen'
  return raw
}

function mapApiPlacasBasicoToRaw(body: unknown) {
  const root = (body ?? {}) as Record<string, unknown>
  if (root.error === true) {
    const codigo = String(root.codigo ?? '').toLowerCase()
    if (codigo === 'placa_invalida') return { status: 'invalid_plate' as const }
    if (codigo === 'placa_nao_encontrada') return { status: 'not_found' as const }
    return { status: 'not_found' as const }
  }
  const basico = (root.basico ?? {}) as Record<string, unknown>
  if (basico.error === true) return { status: 'not_found' as const }
  const dados = (basico.dados ?? {}) as Record<string, unknown>
  const maker = softMaker(dados.marca ? String(dados.marca) : null)
  const split = splitApiModelo(dados.modelo ? String(dados.modelo) : null)
  const year = extractYearPreferModel(dados.ano)
  if (!maker && !split.model) return { status: 'not_found' as const, maker: null, model: null, year: null }
  return {
    status: (year && maker && split.model ? 'found' : 'incomplete') as 'found' | 'incomplete',
    maker,
    model: split.model,
    year,
    engine: split.engine,
    version: normalizeVersionLabel(
      split.version ?? (dados.versao ? String(dados.versao) : null),
    ),
    fuel: dados.combustivel ? String(dados.combustivel) : null,
  }
}

describe('mapApiPlacasBasicoToRaw', () => {
  it('mapeia basico.dados e separa modelo composto', () => {
    const r = mapApiPlacasBasicoToRaw({
      error: false,
      basico: {
        error: false,
        dados: {
          marca: 'HYUNDAI',
          modelo: 'HB20 1.0M UNIQUE',
          ano: '2019',
          combustivel: 'FLEX',
        },
      },
    })
    expect(r.status).toBe('found')
    expect(r.maker).toBe('Hyundai')
    expect(r.model).toBe('HB20')
    expect(r.year).toBe('2019')
    expect(r.engine).toBe('1.0')
    expect(r.version).toBe('Unique')
    expect(r.fuel).toBe('FLEX')
  })

  it('T-CROSS sem inventar motor/versão', () => {
    const r = mapApiPlacasBasicoToRaw({
      error: false,
      basico: {
        error: false,
        dados: {
          marca: 'VOLKSWAGEN',
          modelo: 'T-CROSS',
          ano: '2022',
          combustivel: 'FLEX',
        },
      },
    })
    expect(r.status).toBe('found')
    expect(r.model).toBe('T-Cross')
    expect(r.engine).toBeNull()
    expect(r.version).toBeNull()
  })

  it('faixa 2019/2020 → ano-modelo 2020', () => {
    const r = mapApiPlacasBasicoToRaw({
      basico: { dados: { marca: 'FIAT', modelo: 'Argo', ano: '2019/2020' } },
    })
    expect(r.year).toBe('2020')
    expect(r.status).toBe('found')
  })

  it('versão EXPRESSION da API → Expression', () => {
    const r = mapApiPlacasBasicoToRaw({
      basico: {
        dados: { marca: 'RENAULT', modelo: 'Clio', ano: '2014', versao: 'EXPRESSION' },
      },
    })
    expect(r.version).toBe('Expression')
  })

  it('incomplete sem ano', () => {
    const r = mapApiPlacasBasicoToRaw({
      basico: { dados: { marca: 'FIAT', modelo: 'Argo' } },
    })
    expect(r.status).toBe('incomplete')
    expect(r.year).toBeNull()
  })

  it('placa_nao_encontrada', () => {
    expect(
      mapApiPlacasBasicoToRaw({
        error: true,
        codigo: 'placa_nao_encontrada',
        message: 'Nenhum registro',
      }).status,
    ).toBe('not_found')
  })
})
