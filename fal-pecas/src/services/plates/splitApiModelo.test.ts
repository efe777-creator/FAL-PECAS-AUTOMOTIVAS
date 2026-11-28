import { describe, expect, it } from 'vitest'
import { formatPlateModelName, sanitizeEngine, splitApiModelo } from './splitApiModelo'

describe('splitApiModelo', () => {
  it('separa HB20 1.0M UNIQUE → modelo / motor / versão', () => {
    expect(splitApiModelo('HB20 1.0M UNIQUE')).toMatchObject({
      model: 'HB20',
      engine: '1.0',
      version: 'Unique',
    })
  })

  it('aceita casing misto pós-title-case da API', () => {
    expect(splitApiModelo('Hb20 1.0m Unique')).toMatchObject({
      model: 'HB20',
      engine: '1.0',
      version: 'Unique',
    })
  })

  it('ONIX 1.0 LT', () => {
    expect(splitApiModelo('ONIX 1.0 LT')).toMatchObject({
      model: 'Onix',
      engine: '1.0',
      version: 'LT',
    })
  })

  it('GOL 1.0 sem versão', () => {
    expect(splitApiModelo('GOL 1.0')).toMatchObject({
      model: 'Gol',
      engine: '1.0',
      version: null,
    })
  })

  it('não parte Cross Fox (sem token de motor)', () => {
    expect(splitApiModelo('CROSS FOX')).toMatchObject({
      model: 'Cross Fox',
      engine: null,
      version: null,
    })
  })

  it('T-CROSS permanece modelo único (casing FAL)', () => {
    expect(splitApiModelo('T-CROSS')).toMatchObject({
      model: 'T-Cross',
      engine: null,
      version: null,
    })
  })

  it('remove prefixo MARCA/', () => {
    expect(splitApiModelo('HYUNDAI/HB20 1.0M COMFOR')).toMatchObject({
      model: 'HB20',
      engine: '1.0',
      version: 'Comfort',
    })
  })

  it('mantém sufixo técnico no motor (2.0T)', () => {
    expect(splitApiModelo('GOLF 2.0T GTI')).toMatchObject({
      model: 'Golf',
      engine: '2.0T',
      version: 'GTI',
    })
  })

  it('nome com versões em barra → model + versão alternativa (não engole prefixo)', () => {
    expect(splitApiModelo('Gol Comfortline / Highline 1.0')).toMatchObject({
      model: 'Gol',
      engine: '1.0',
      version: 'Comfortline / Highline',
    })
    expect(splitApiModelo('Onix LT / LTZ 1.0')).toMatchObject({
      model: 'Onix',
      engine: '1.0',
    })
    expect(splitApiModelo('Onix LT / LTZ 1.0').version).toMatch(/LT/i)
    expect(splitApiModelo('Onix LT / LTZ 1.0').version).toMatch(/LTZ/i)
    // Prefixo compacto real continua removido
    expect(splitApiModelo('VW/Gol 1.0')).toMatchObject({ model: 'Gol', engine: '1.0' })
  })

  it('motor 2.0 + 16V → válvulas no motor, trim na versão', () => {
    expect(splitApiModelo('Gol 2.0 16V Comfortline')).toMatchObject({
      model: 'Gol',
      engine: '2.0 16V',
      version: 'Comfortline',
    })
    const stuck = splitApiModelo('Civic 2.016V EXL')
    expect(stuck.engine).toBe('2.0 16V')
    expect(stuck.version).toMatch(/EXL/i)
    expect(stuck.version ?? '').not.toMatch(/16V/i)
  })

  it('contrato FAL: Tiggo 5X / Onix Plus / 16 válvulas Turbo / 4x4', () => {
    expect(splitApiModelo('Tiggo 5X')).toMatchObject({
      model: 'Tiggo 5X',
      engine: null,
      version: null,
    })
    expect(splitApiModelo('Tiggo 5X TXS 1.5')).toMatchObject({
      model: 'Tiggo 5X',
      engine: '1.5',
      version: 'TXS',
    })
    expect(splitApiModelo('Gol 1.0 16 válvulas Turbo Comfortline')).toMatchObject({
      model: 'Gol',
      engine: '1.0 16V Turbo',
      version: 'Comfortline',
    })
    expect(splitApiModelo('Uno 1.0 8 válvulas')).toMatchObject({
      model: 'Uno',
      engine: '1.0 8V',
      version: null,
    })
    expect(splitApiModelo('Onix Plus 1.0 LT')).toMatchObject({
      model: 'Onix Plus',
      engine: '1.0',
      version: 'LT',
    })
    expect(splitApiModelo('Tiggo 3X Plus')).toMatchObject({
      model: 'Tiggo 3X',
      version: 'Plus',
    })
    expect(splitApiModelo('Tiggo 5X Pro')).toMatchObject({
      model: 'Tiggo 5X',
      version: 'Pro',
    })
    expect(splitApiModelo('Tiggo 3X Pro')).toMatchObject({
      model: 'Tiggo 3X',
      version: 'Pro',
    })
    expect(splitApiModelo('HB20 5 Anos')).toMatchObject({
      model: 'HB20',
      version: '5 Anos',
    })
    expect(splitApiModelo('HB 20 5 anos')).toMatchObject({
      model: 'HB20',
      version: '5 Anos',
    })
    expect(splitApiModelo('HB 20S Comfort')).toMatchObject({
      model: 'HB20S',
      version: 'Comfort',
    })
    expect(splitApiModelo('HB20 Comf. Plus Tech')).toMatchObject({
      model: 'HB20',
      version: 'Comfort Plus Tech',
    })
    expect(splitApiModelo('HB20 Comf. Plus Tech TB')).toMatchObject({
      model: 'HB20',
      engine: 'Turbo',
      version: 'Comfort Plus Tech',
    })
    expect(splitApiModelo('HB20 Comfort Plus 1.0 TB')).toMatchObject({
      model: 'HB20',
      engine: '1.0 Turbo',
      version: 'Comfort Plus',
    })
    expect(splitApiModelo('Tiggo 5X 1.5 4x4')).toMatchObject({
      model: 'Tiggo 5X',
      engine: '1.5',
      traction: '4x4',
    })
    expect(splitApiModelo('Tiggo 3 X Plus')).toMatchObject({
      model: 'Tiggo 3X',
      version: 'Plus',
    })
    expect(splitApiModelo('Tiggo 7 Pro')).toMatchObject({
      model: 'Tiggo 7',
      version: 'Pro',
    })
    expect(splitApiModelo('Tiggo 8 Pro Max')).toMatchObject({
      model: 'Tiggo 8',
      version: 'Pro Max',
    })
    expect(splitApiModelo('Tiggo 2 Look')).toMatchObject({
      model: 'Tiggo 2',
      version: 'Look',
    })
    expect(splitApiModelo('HB20 Comf./C.Plus/C.Style 1.0')).toMatchObject({
      model: 'HB20',
      engine: '1.0',
      version: 'Comfort / Comfort Plus / Comfort Style',
    })
    expect(splitApiModelo('HB20 C./C.Plus/C.Style 1.6 Flex 16V Mec.')).toMatchObject({
      model: 'HB20',
      engine: '1.6 16V',
      version: 'Comfort / Comfort Plus / Comfort Style',
    })
    expect(splitApiModelo('HB20S C.Plus/C.Style1.0 Flex 12V Mec. 4P')).toMatchObject({
      model: 'HB20S',
      engine: '1.0 12V',
      version: 'Comfort Plus / Comfort Style',
    })
    expect(splitApiModelo('HB20S Com. Plus Tech 1.0 TB Flex 12V Aut')).toMatchObject({
      model: 'HB20S',
      engine: '1.0 12V Turbo',
      version: 'Comfort Plus Tech',
    })
    expect(splitApiModelo('HB20 Plat. Safety 1.0 TB Flex 12V Aut.')).toMatchObject({
      model: 'HB20',
      engine: '1.0 12V Turbo',
      version: 'Platinum Safety',
    })
    expect(splitApiModelo('HB20 R Spec 1.6 Flex 16V Aut.')).toMatchObject({
      model: 'HB20',
      engine: '1.6 16V',
      version: 'R Spec',
    })
    expect(splitApiModelo('HB20 Copa do Mundo 1.0 Flex 12V Mec.')).toMatchObject({
      model: 'HB20',
      engine: '1.0 12V',
      version: 'Copa do Mundo',
    })
    expect(splitApiModelo('C 180')).toMatchObject({
      model: 'C 180',
      version: null,
    })
    expect(splitApiModelo('Tera Comfort 1.0 170 TSI Flex 12V 5p Aut')).toMatchObject({
      model: 'Tera',
      engine: '1.0 12V 170 TSI',
      version: 'Comfort',
    })
    expect(splitApiModelo('Tera 1.0 170 TSI Flex 12V 5p Mec.')).toMatchObject({
      model: 'Tera',
      engine: '1.0 12V 170 TSI',
      version: null,
    })
    expect(splitApiModelo('Tera High 1.0 170 TSI Flex 12V 5p Aut')).toMatchObject({
      model: 'Tera',
      engine: '1.0 12V 170 TSI',
      version: 'Highline',
    })
    expect(splitApiModelo('Tera High')).toMatchObject({
      model: 'Tera',
      version: 'Highline',
    })
    expect(splitApiModelo('Grand Siena ESSEN. 1.6 Flex 16V')).toMatchObject({
      model: 'Grand Siena',
      engine: '1.6 16V',
      version: 'Essence',
    })
    expect(splitApiModelo('Strada Work. 1.4')).toMatchObject({
      model: 'Strada',
      engine: '1.4',
      version: 'Working',
    })
    expect(splitApiModelo('Strada Adv. Extreme 1.8')).toMatchObject({
      model: 'Strada',
      engine: '1.8',
      version: 'Adventure Extreme',
    })
    expect(splitApiModelo('Hilux SRV 2.8 CD 4x4 Diesel Aut.')).toMatchObject({
      model: 'Hilux',
      engine: '2.8',
      version: 'SRV Cabine Dupla',
      traction: '4x4',
    })
    expect(splitApiModelo('Hilux SR 2.8 CS 4x2 Die. Mec.')).toMatchObject({
      model: 'Hilux',
      engine: '2.8',
      version: 'SR Cabine Simples',
      traction: '4x2',
    })
    const dies = splitApiModelo('Hilux CD 4x4 3.0 TDI Dies. Mec.')
    expect(dies.engine).toBe('3.0 TDI')
    expect(dies.traction).toBe('4x4')
    expect(`${dies.model ?? ''} ${dies.version ?? ''}`).not.toMatch(/dies|diesel/i)
    expect(splitApiModelo('Hilux CD Conquest 4x4 2.8 Die.Aut').version ?? '').not.toMatch(/die|diesel/i)
    expect(splitApiModelo('Siena 1.4 F. Flex')).toMatchObject({
      model: 'Siena',
      engine: '1.4',
    })
    expect(splitApiModelo('Siena 1.4 F. Flex').version ?? '').not.toMatch(/flex/i)
    expect(splitApiModelo('Saveiro Robust 1.6 CE')).toMatchObject({
      model: 'Saveiro',
      engine: '1.6',
      version: 'Robust Cabine Estendida',
    })
    expect(splitApiModelo('S10 High Country 2.8 CD')).toMatchObject({
      model: 'S10',
      engine: '2.8',
      version: 'High Country Cabine Dupla',
    })
    expect(splitApiModelo('Compass Limited 1.3 T270 Híb.')).toMatchObject({
      model: 'Compass',
      engine: '1.3 T270',
      version: 'Limited',
    })
    expect(splitApiModelo('Ranger XLT 3.2 CD')).toMatchObject({
      model: 'Ranger',
      engine: '3.2',
      version: 'XLT Cabine Dupla',
    })
    expect(splitApiModelo('Corolla Altis 1.8')).toMatchObject({
      model: 'Corolla',
      engine: '1.8',
      version: 'Altis',
    })
    expect(splitApiModelo('Bronco Sport Wildtrak 2.0')).toMatchObject({
      model: 'Bronco Sport',
      engine: '2.0',
      version: 'Wildtrak',
    })
    expect(splitApiModelo('TERA HIGH')).toMatchObject({
      model: 'Tera',
      version: 'Highline',
    })
    expect(splitApiModelo('Tera 1.0 MPI Flex 12V 5p Mec.')).toMatchObject({
      model: 'Tera',
      engine: '1.0 12V MPI',
      version: null,
    })
    expect(splitApiModelo('Polo Track 1.0')).toMatchObject({
      model: 'Polo',
      engine: '1.0',
      version: 'Track',
    })
    expect(splitApiModelo('Saveiro Robust')).toMatchObject({
      model: 'Saveiro',
      version: 'Robust',
    })
    expect(splitApiModelo('Jetta GLI')).toMatchObject({
      model: 'Jetta',
      version: 'GLI',
    })
    expect(splitApiModelo('Gol Last Edition')).toMatchObject({
      model: 'Gol',
      version: 'Last Edition',
    })
    expect(splitApiModelo('VIRTUS Comfort. 200 TSI 1.0 Flex 12V Aut')).toMatchObject({
      model: 'Virtus',
      engine: '1.0 12V 200 TSI',
      version: 'Comfort',
    })
    expect(splitApiModelo('VIRTUS Exclusive 250TSI 1.4 Flex 16V Aut')).toMatchObject({
      model: 'Virtus',
      engine: '1.4 16V 250 TSI',
      version: 'Exclusive',
    })
    expect(splitApiModelo('Polo GTS 250 TSI')).toMatchObject({
      model: 'Polo',
      engine: '250 TSI',
      version: 'GTS',
    })
    expect(splitApiModelo('Golf GTI 350 TSI 2.0')).toMatchObject({
      model: 'Golf',
      engine: '2.0 350 TSI',
      version: 'GTI',
    })
    expect(splitApiModelo('Pulse T200')).toMatchObject({
      model: 'Pulse',
      engine: 'T200',
      version: null,
    })
    expect(splitApiModelo('C 200')).toMatchObject({
      model: 'C 200',
      version: null,
    })
    expect(sanitizeEngine('1.0 12V 170 TSI')).toBe('1.0 12V 170 TSI')
    expect(sanitizeEngine('170 TSI')).toBe('170 TSI')
    expect(splitApiModelo('HR V EXL')).toMatchObject({ model: 'HR-V', version: 'EXL' })
    expect(splitApiModelo('WR V EX')).toMatchObject({ model: 'WR-V', version: 'EX' })
    expect(splitApiModelo('CR V EXL')).toMatchObject({ model: 'CR-V', version: 'EXL' })
    expect(splitApiModelo('T CROSS Highline')).toMatchObject({
      model: 'T-Cross',
      version: 'Highline',
    })
    expect(splitApiModelo('XC 60 Momentum')).toMatchObject({
      model: 'XC60',
      engine: null,
      version: 'Momentum',
    })
    expect(splitApiModelo('Corolla Cross XRE')).toMatchObject({
      model: 'Corolla Cross',
      version: 'XRE',
    })
    expect(splitApiModelo('Onix Plus Premier')).toMatchObject({
      model: 'Onix Plus',
      version: 'Premier',
    })
    expect(splitApiModelo('Saveiro Cross')).toMatchObject({
      model: 'Saveiro Cross',
      version: null,
    })
    expect(splitApiModelo('Compass Longitude')).toMatchObject({
      model: 'Compass',
      version: 'Longitude',
    })
    expect(splitApiModelo('Creta Action')).toMatchObject({
      model: 'Creta',
      version: 'Action',
    })
    expect(splitApiModelo('Hilux SRV')).toMatchObject({
      model: 'Hilux',
      version: 'SRV',
    })
  })

  it('corpus FIPE aberto: EcoSport FREESTYLE 1.6 16V Flex 5p', () => {
    expect(splitApiModelo('EcoSport FREESTYLE 1.6 16V Flex 5p')).toMatchObject({
      model: 'Ecosport',
      engine: '1.6 16V',
      version: 'Freestyle',
    })
  })

  it('DENATRAN compacto CLIO EXP1016VH → Clio / 1.0 16V / Expression', () => {
    expect(splitApiModelo('CLIO EXP1016VH')).toMatchObject({
      model: 'Clio',
      engine: '1.0 16V',
      version: 'Expression',
    })
    expect(splitApiModelo('Clio EXP1016VH')).toMatchObject({
      model: 'Clio',
      engine: '1.0 16V',
      version: 'Expression',
    })
  })

  it('DENATRAN SANDERO AUTH1216V', () => {
    expect(splitApiModelo('SANDERO AUTH1216V')).toMatchObject({
      model: 'Sandero',
      engine: '1.2 16V',
      version: 'Authentique',
    })
  })

  it('DENATRAN PALIO WEEKEND ELX1418V', () => {
    expect(splitApiModelo('PALIO WEEKEND ELX1418V')).toMatchObject({
      model: 'Palio Weekend',
      engine: '1.4 18V',
      version: 'ELX',
    })
  })

  it('KWID INTENS 10MT → Kwid / 1.0 / Intense (nome comercial)', () => {
    expect(splitApiModelo('KWID INTENS 10MT')).toMatchObject({
      model: 'Kwid',
      engine: '1.0',
      version: 'Intense',
    })
  })

  it('INTENSE explícito permanece Intense', () => {
    expect(splitApiModelo('KWID INTENSE 1.0')).toMatchObject({
      model: 'Kwid',
      engine: '1.0',
      version: 'Intense',
    })
  })

  it('XTZ150 CROSSER S → modelo XTZ150 / versão Crosser S (sem inventar motor)', () => {
    expect(splitApiModelo('XTZ150 Crosser S')).toMatchObject({
      model: 'XTZ150',
      engine: null,
      version: 'Crosser S',
    })
  })

  it('FIESTA FLEX → Fiesta sem fuel no modelo/versão', () => {
    expect(splitApiModelo('Fiesta Flex')).toMatchObject({
      model: 'Fiesta',
      engine: null,
      version: null,
    })
  })

  it('ARGO TREKKING → Argo / Trekking', () => {
    expect(splitApiModelo('Argo Trekking')).toMatchObject({
      model: 'Argo',
      engine: null,
      version: 'Trekking',
    })
  })

  it('PALIO FIRE ECONOMY → Palio / Fire Economy', () => {
    expect(splitApiModelo('Palio Fire Economy')).toMatchObject({
      model: 'Palio',
      engine: null,
      version: 'Fire Economy',
    })
  })

  it('POLO HL AB → Polo / HL AB', () => {
    expect(splitApiModelo('Polo HL AB')).toMatchObject({
      model: 'Polo',
      engine: null,
      version: 'HL AB',
    })
  })

  it('TUCSON GLSB → Tucson / GLSB', () => {
    expect(splitApiModelo('Tucson Glsb')).toMatchObject({
      model: 'Tucson',
      engine: null,
      version: 'GLSB',
    })
  })

  it('PRISMA 10MT JOYE → Prisma / 1.0 / Joy (motor no meio)', () => {
    expect(splitApiModelo('Prisma 10MT Joye')).toMatchObject({
      model: 'Prisma',
      engine: '1.0',
      version: 'Joy',
    })
    expect(splitApiModelo('PRISMA 10MT JOYE')).toMatchObject({
      model: 'Prisma',
      engine: '1.0',
      version: 'Joy',
    })
  })

  it('PPP8A30: HB20 1.6A 1.6 A → motor 1.6, versão null (A = câmbio, não trim)', () => {
    expect(splitApiModelo('HB20 1.6A 1.6 A')).toMatchObject({
      model: 'HB20',
      engine: '1.6',
      version: null,
    })
    expect(splitApiModelo('HB20 1.6 A')).toMatchObject({
      model: 'HB20',
      engine: '1.6',
      version: null,
    })
    expect(splitApiModelo('HB20 1.6A')).toMatchObject({
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

describe('splitApiModelo · bancada V6/V8', () => {
  it('V6 e V8 ficam no motor, não na versão', () => {
    expect(splitApiModelo('AMAROK Comfor. 3.0 V6 TDI 4x4 Dies. Aut.')).toMatchObject({
      model: 'Amarok',
      engine: '3.0 V6 TDI',
      version: 'Comfort',
      traction: '4x4',
    })
    expect(splitApiModelo('Mustang GT 5.0 V8')).toMatchObject({
      model: 'Mustang',
      engine: '5.0 V8',
      version: 'GT',
    })
    expect(splitApiModelo('Ranger Limited 3.0V6')).toMatchObject({
      model: 'Ranger',
      engine: '3.0 V6',
      version: 'Limited',
    })
  })
})

describe('splitApiModelo · FIPE colada', () => {
  it('tira combustível do modelo e não inventa versão com Flex, híbrido ou tetrafuel', () => {
    expect(splitApiModelo('Grand Siena TETRAFUEL 1.4 Evo F. Flex 8V')).toMatchObject({
      model: 'Grand Siena',
      engine: '1.4 8V',
    })
    expect(splitApiModelo('Grand Siena TETRAFUEL 1.4 Evo F. Flex 8V').model).not.toMatch(/tetra|flex/i)
    expect(splitApiModelo('Saveiro Diesel (todas)')).toMatchObject({
      model: 'Saveiro',
      version: null,
    })
    expect(splitApiModelo('Corolla Altis Prem. 1.8 Aut. (Híbrido)')).toMatchObject({
      model: 'Corolla',
      engine: '1.8',
      version: 'Altis Premium',
    })
    expect(splitApiModelo('Corolla Altis 1.8 16V Aut. (Híbrido)').version).not.toMatch(/híbrido|hibrido/i)
  })

  it('1000 Mi vira 1.0, 16V sem ponto vai para o motor, TB do Passat continua versão', () => {
    expect(splitApiModelo('Gol 1000 Mi 16V 2p Turbo')).toMatchObject({
      model: 'Gol',
      engine: '1.0 16V Turbo MPI',
    })
    expect(splitApiModelo('Coupe 16V')).toMatchObject({ model: 'Coupe', engine: '16V', version: null })
    expect(splitApiModelo('Corsa GSi 16V')).toMatchObject({
      model: 'Corsa',
      engine: '16V',
      version: 'GSi',
    })
    expect(splitApiModelo('Passat TB 2.0 FSI/TSI 211cv Tiptronic 4p')).toMatchObject({
      model: 'Passat',
      engine: '2.0 TSI',
      version: null,
    })
    expect(splitApiModelo('Passat R-Line TB 2.0 TSI Tiptronic 4p')).toMatchObject({
      model: 'Passat',
      engine: '2.0 TSI',
      version: 'R-Line',
    })
    expect(splitApiModelo('HB20 Comfort 1.0 TB Flex 12V Mec.')).toMatchObject({
      model: 'HB20',
      engine: '1.0 12V Turbo',
      version: 'Comfort',
    })
  })

  it('descola sigla do motor e não deixa Tot.Flex na versão', () => {
    expect(splitApiModelo('Strada Working Celeb.1.4 Fire Flex 8V CD')).toMatchObject({
      model: 'Strada',
      engine: '1.4 8V',
      version: 'Working Celebration Fire Cabine Dupla',
    })
    expect(splitApiModelo('Fox Sportline/Sports 1.0/1.0 Tot.Flex 3p')).toMatchObject({
      model: 'Fox',
      engine: '1.0',
      version: 'Sportline / Sports',
    })
    expect(splitApiModelo('VOYAGE I MOTION COMF/Hghli.1.6 T.Flex 8V')).toMatchObject({
      model: 'Voyage',
      engine: '1.6 8V',
      version: 'Comfort / Highline',
    })
    expect(splitApiModelo('Gol Trendline 1.0 Total Flex 8V 5p')).toMatchObject({
      model: 'Gol',
      engine: '1.0 8V',
      version: 'Trendline',
    })
    expect(splitApiModelo('Gol (novo) 1.6 Power/Highi T.Flex 8v 4P').version).toBe('Power / Highline')
  })
})

describe('splitApiModelo · linhas principais', () => {
  it('tira Hi-Flex, híbrido com acento trocado e nota de nacional', () => {
    expect(splitApiModelo('DUSTER Dynamique 2.0 Hi-Flex 16V Mec.')).toMatchObject({
      model: 'Duster',
      engine: '2.0 16V',
      version: 'Dynamique',
    })
    expect(splitApiModelo('SANDERO Authentique Hi-Flex 1.0 16V 5p')).toMatchObject({
      model: 'Sandero',
      engine: '1.0 16V',
      version: 'Authentique',
    })
    expect(splitApiModelo('Civic Sedan EX 1.6 16V Aut. 4p (nacion.)')).toMatchObject({
      model: 'Civic',
      engine: '1.6 16V',
      version: 'Sedan EX',
    })
    expect(splitApiModelo('Fastback Audace 200 TB Aut (Hibrído)')).toMatchObject({
      model: 'Fastback',
      engine: 'T200',
      version: 'Audace',
    })
    expect(splitApiModelo('PULSE IMPETUS T. 200 Aut. (Hibrído)')).toMatchObject({
      model: 'Pulse',
      engine: 'T200',
      version: 'Impetus',
    })
    expect(splitApiModelo('PULSE AUDACE Turbo 200 Aut. (Hibrído)')).toMatchObject({
      model: 'Pulse',
      engine: 'T200',
      version: 'Audace',
    })
  })

  it('Bi-TB fica no motor e sigla truncada de premium abre', () => {
    expect(splitApiModelo('Frontier LE CD 4x4 2.3 Bi-TB Diesel Aut.')).toMatchObject({
      model: 'Frontier',
      engine: '2.3 Bi-Turbo',
      version: 'LE Cabine Dupla',
      traction: '4x4',
    })
    expect(splitApiModelo('Corolla ALTIS/A.Premiu. 2.0 Flex 16V Aut')).toMatchObject({
      model: 'Corolla',
      engine: '2.0 16V',
      version: 'Altis / Altis Premium',
    })
    expect(splitApiModelo('SANDERO GT Line Flex/RLI 1.6.16V 5p Aut.')).toMatchObject({
      model: 'Sandero',
      engine: '1.6 16V',
    })
    expect(splitApiModelo('Uno Mille EP 2p e 4p')).toMatchObject({
      model: 'Uno',
      engine: '1.0',
      version: 'EP',
    })
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
    expect(assertModelClean('Kwid Intens 10MT')).toMatchObject({
      model: 'Kwid',
      engine: '1.0',
      version: 'Intense',
    })
  })

  it('extras versão 1.6 A não vira trim — motor permanece 1.6', async () => {
    const { assertModelClean } = await import('./splitApiModelo')
    expect(assertModelClean('HB20', { engine: '1.6', version: '1.6 A' })).toMatchObject({
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
