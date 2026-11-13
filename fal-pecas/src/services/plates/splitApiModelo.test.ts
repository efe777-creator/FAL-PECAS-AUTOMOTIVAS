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

  it('FIESTA FLEX → Fiesta sem fuel no modelo/versão', () => {
    expect(splitApiModelo('Fiesta Flex')).toEqual({
      model: 'Fiesta',
      engine: null,
      version: null,
    })
  })

  it('ARGO TREKKING → Argo / Trekking', () => {
    expect(splitApiModelo('Argo Trekking')).toEqual({
      model: 'Argo',
      engine: null,
      version: 'Trekking',
    })
  })

  it('PALIO FIRE ECONOMY → Palio / Fire Economy', () => {
    expect(splitApiModelo('Palio Fire Economy')).toEqual({
      model: 'Palio',
      engine: null,
      version: 'Fire Economy',
    })
  })

  it('POLO HL AB → Polo / HL AB', () => {
    expect(splitApiModelo('Polo HL AB')).toEqual({
      model: 'Polo',
      engine: null,
      version: 'HL AB',
    })
  })

  it('TUCSON GLSB → Tucson / GLSB', () => {
    expect(splitApiModelo('Tucson Glsb')).toEqual({
      model: 'Tucson',
      engine: null,
      version: 'GLSB',
    })
  })

  it('PRISMA 10MT JOYE → Prisma / 1.0 / Joy (motor no meio)', () => {
    expect(splitApiModelo('Prisma 10MT Joye')).toEqual({
      model: 'Prisma',
      engine: '1.0',
      version: 'Joy',
    })
    expect(splitApiModelo('PRISMA 10MT JOYE')).toEqual({
      model: 'Prisma',
      engine: '1.0',
      version: 'Joy',
    })
  })

  it('PPP8A30: HB20 1.6A 1.6 A → motor 1.6, versão null (A = câmbio, não trim)', () => {
    expect(splitApiModelo('HB20 1.6A 1.6 A')).toEqual({
      model: 'HB20',
      engine: '1.6',
      version: null,
    })
    expect(splitApiModelo('HB20 1.6 A')).toEqual({
      model: 'HB20',
      engine: '1.6',
      version: null,
    })
    expect(splitApiModelo('HB20 1.6A')).toEqual({
      model: 'HB20',
      engine: '1.6',
      version: null,
    })
  })

  it('normalizeVersionLabel: EXPRESSION/INTENS → canônicos', async () => {
    const { normalizeVersionLabel } = await import('./splitApiModelo')
    expect(normalizeVersionLabel('EXPRESSION')).toBe('Expression')
    expect(normalizeVersionLabel('INTENS')).toBe('Intense')
    expect(normalizeVersionLabel('Unique')).toBe('Unique')
  })

  it('sanitizeVersionLabel: rejeita motor/câmbio colados (1.6 A, 1.6A, A, AT)', async () => {
    const { sanitizeVersionLabel } = await import('./splitApiModelo')
    expect(sanitizeVersionLabel('1.6 A')).toBeNull()
    expect(sanitizeVersionLabel('1.6A')).toBeNull()
    expect(sanitizeVersionLabel('1.6')).toBeNull()
    expect(sanitizeVersionLabel('A')).toBeNull()
    expect(sanitizeVersionLabel('AT')).toBeNull()
    expect(sanitizeVersionLabel('MT')).toBeNull()
    expect(sanitizeVersionLabel('Unique')).toBe('Unique')
    expect(sanitizeVersionLabel('Comfort Plus')).toBe('Comfort Plus')
  })
})

describe('sanitizeEngine', () => {
  it('rejeita 0.1 e aceita 1.0 / 10MT', () => {
    expect(sanitizeEngine('0.1')).toBeNull()
    expect(sanitizeEngine('1.0')).toBe('1.0')
    expect(sanitizeEngine('10MT')).toBe('1.0')
  })

  it('normaliza 1.8AT e 1.6L', () => {
    expect(sanitizeEngine('1.8AT')).toBe('1.8')
    expect(sanitizeEngine('1.6L')).toBe('1.6')
  })
})

describe('assertModelClean', () => {
  it('separa Kwid Intens 10MT em modelo limpo + versão + motor', async () => {
    const { assertModelClean } = await import('./splitApiModelo')
    expect(assertModelClean('Kwid Intens 10MT')).toEqual({
      model: 'Kwid',
      engine: '1.0',
      version: 'Intense',
    })
  })

  it('extras versão 1.6 A não vira trim — motor permanece 1.6', async () => {
    const { assertModelClean } = await import('./splitApiModelo')
    expect(assertModelClean('HB20', { engine: '1.6', version: '1.6 A' })).toEqual({
      model: 'HB20',
      engine: '1.6',
      version: null,
    })
  })
})

describe('isModelNameClean', () => {
  it('detecta compostos vs limpos', async () => {
    const { isModelNameClean } = await import('./splitApiModelo')
    expect(isModelNameClean('HB20')).toBe(true)
    expect(isModelNameClean('Cross Fox')).toBe(true)
    expect(isModelNameClean('Kwid Intens 10MT')).toBe(false)
    expect(isModelNameClean('Fiesta Flex')).toBe(false)
  })
})

describe('formatPlateModelName', () => {
  it('mantém HB20 em UPPER', () => {
    expect(formatPlateModelName('Hb20')).toBe('HB20')
  })
})
