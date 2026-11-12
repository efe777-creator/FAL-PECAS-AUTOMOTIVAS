import { describe, expect, it } from 'vitest'
import { formatPlateModelName, sanitizeEngine, splitApiModelo } from './splitApiModelo'

describe('splitApiModelo', () => {
  it('separa HB20 1.0M UNIQUE → modelo / motor / versão', () => {
    expect(splitApiModelo('HB20 1.0M UNIQUE')).toEqual({
      model: 'HB20',
      engine: '1.0',
      version: 'Unique',
    })
  })

  it('aceita casing misto pós-title-case da API', () => {
    expect(splitApiModelo('Hb20 1.0m Unique')).toEqual({
      model: 'HB20',
      engine: '1.0',
      version: 'Unique',
    })
  })

  it('ONIX 1.0 LT', () => {
    expect(splitApiModelo('ONIX 1.0 LT')).toEqual({
      model: 'Onix',
      engine: '1.0',
      version: 'LT',
    })
  })

  it('GOL 1.0 sem versão', () => {
    expect(splitApiModelo('GOL 1.0')).toEqual({
      model: 'Gol',
      engine: '1.0',
      version: null,
    })
  })

  it('não parte Cross Fox (sem token de motor)', () => {
    expect(splitApiModelo('CROSS FOX')).toEqual({
      model: 'Cross Fox',
      engine: null,
      version: null,
    })
  })

  it('T-CROSS permanece modelo único (casing FAL)', () => {
    expect(splitApiModelo('T-CROSS')).toEqual({
      model: 'T-Cross',
      engine: null,
      version: null,
    })
  })

  it('remove prefixo MARCA/', () => {
    expect(splitApiModelo('HYUNDAI/HB20 1.0M COMFOR')).toEqual({
      model: 'HB20',
      engine: '1.0',
      version: 'Comfort',
    })
  })

  it('mantém sufixo técnico no motor (2.0T)', () => {
    expect(splitApiModelo('GOLF 2.0T GTI')).toEqual({
      model: 'Golf',
      engine: '2.0T',
      version: 'GTI',
    })
  })

  it('DENATRAN compacto CLIO EXP1016VH → Clio / 1.0 / Expression', () => {
    expect(splitApiModelo('CLIO EXP1016VH')).toEqual({
      model: 'Clio',
      engine: '1.0',
      version: 'Expression',
    })
    expect(splitApiModelo('Clio EXP1016VH')).toEqual({
      model: 'Clio',
      engine: '1.0',
      version: 'Expression',
    })
  })

  it('DENATRAN SANDERO AUTH1216V', () => {
    expect(splitApiModelo('SANDERO AUTH1216V')).toEqual({
      model: 'Sandero',
      engine: '1.2',
      version: 'Authentique',
    })
  })

  it('DENATRAN PALIO WEEKEND ELX1418V', () => {
    expect(splitApiModelo('PALIO WEEKEND ELX1418V')).toEqual({
      model: 'Palio Weekend',
      engine: '1.4',
      version: 'ELX',
    })
  })

  it('KWID INTENS 10MT → Kwid / 1.0 / Intense (nome comercial)', () => {
    expect(splitApiModelo('KWID INTENS 10MT')).toEqual({
      model: 'Kwid',
      engine: '1.0',
      version: 'Intense',
    })
  })

  it('INTENSE explícito permanece Intense', () => {
    expect(splitApiModelo('KWID INTENSE 1.0')).toEqual({
      model: 'Kwid',
      engine: '1.0',
      version: 'Intense',
    })
  })

  it('XTZ150 CROSSER S → modelo XTZ150 / versão Crosser S (sem inventar motor)', () => {
    expect(splitApiModelo('XTZ150 Crosser S')).toEqual({
      model: 'XTZ150',
      engine: null,
      version: 'Crosser S',
    })
  })

  it('normalizeVersionLabel: EXPRESSION/INTENS → canônicos', async () => {
    const { normalizeVersionLabel } = await import('./splitApiModelo')
    expect(normalizeVersionLabel('EXPRESSION')).toBe('Expression')
    expect(normalizeVersionLabel('INTENS')).toBe('Intense')
    expect(normalizeVersionLabel('Unique')).toBe('Unique')
  })
})

describe('sanitizeEngine', () => {
  it('rejeita 0.1 e aceita 1.0 / 10MT', () => {
    expect(sanitizeEngine('0.1')).toBeNull()
    expect(sanitizeEngine('1.0')).toBe('1.0')
    expect(sanitizeEngine('10MT')).toBe('1.0')
  })
})

describe('formatPlateModelName', () => {
  it('mantém HB20 em UPPER', () => {
    expect(formatPlateModelName('Hb20')).toBe('HB20')
  })
})
