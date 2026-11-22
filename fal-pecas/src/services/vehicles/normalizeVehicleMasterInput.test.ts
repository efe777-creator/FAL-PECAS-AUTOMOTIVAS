import { describe, expect, it } from 'vitest'
import { normalizeVehicleMasterInput } from './normalizeVehicleMasterInput'
import { normalizeVehicleMasterInput as normalizeEdge } from '../../../supabase/functions/_shared/normalizeVehicleMasterInput.ts'

describe('normalizeVehicleMasterInput — matriz', () => {
  it('Corolla Cross permanece Corolla Cross (linha distinta de Corolla)', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Toyota', model: 'Corolla Cross' })
    expect(r.model).toBe('Corolla Cross')
    expect(r.outcome).toBe('clean')
    expect(r.matchKey).not.toBe(
      normalizeVehicleMasterInput({ maker: 'Toyota', model: 'Corolla' }).matchKey,
    )
  })

  it('Corolla Cross com trim XRE continua Corolla Cross', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Toyota', model: 'Corolla Cross XRE' })
    expect(r.model).toBe('Corolla Cross')
    expect(r.version).toBe('XRE')
  })

  it('Corolla Apremiumh → Corolla + versão Altis Premium Hybrid', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Toyota', model: 'Corolla Apremiumh' })
    expect(r.model).toBe('Corolla')
    expect(r.version).toMatch(/Altis/)
    expect(r.version).toMatch(/Premium/)
    expect(r.outcome).not.toBe('reject')
  })

  it('Hilux CD4X2 SR → Hilux + config/versão', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Toyota', model: 'Hilux CD4X2 SR' })
    expect(r.model).toBe('Hilux')
    expect(r.body).toBe('CD')
    expect(r.drivetrain).toBe('4x2')
    expect(r.version).toBe('SR')
    expect(r.outcome).toBe('clean')
  })

  it('HR-V EX Cvt → HR-V', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Honda', model: 'HR-V EX Cvt' })
    expect(r.model).toBe('HR-V')
    expect(r.version).toBe('EX')
    expect(r.transmission).toBe('CVT')
  })

  it('Sentra 20SV Cvt → Sentra', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Nissan', model: 'Sentra 20SV Cvt' })
    expect(r.model).toBe('Sentra')
    expect(r.engine).toBe('2.0')
    expect(r.version).toBe('SV')
    expect(r.transmission).toBe('CVT')
  })

  it('Cross Fox ≠ Fox', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Volkswagen', model: 'Cross Fox' })
    expect(r.model).toBe('Cross Fox')
    expect(r.matchKey).not.toBe(
      normalizeVehicleMasterInput({ maker: 'Volkswagen', model: 'Fox' }).matchKey,
    )
  })

  it('T-Cross permanece T-Cross', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Volkswagen', model: 'T-Cross' })
    expect(r.model).toBe('T-Cross')
    expect(r.model).not.toBe('Cross')
  })

  it('New Fiesta permanece New Fiesta', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Ford', model: 'New Fiesta' })
    expect(r.model).toBe('New Fiesta')
  })

  it('Saveira → Saveiro', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Volkswagen', model: 'Saveira' })
    expect(r.model).toBe('Saveiro')
    expect(r.reasons.some((x) => x.startsWith('typo_corrected'))).toBe(true)
  })

  it('Onix Plus não perde Plus', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Chevrolet', model: 'Onix Plus' })
    expect(r.model).toBe('Onix Plus')
  })

  it('reject quando maker ou modelo vazios', () => {
    expect(normalizeVehicleMasterInput({ maker: '', model: 'Gol' }).outcome).toBe('reject')
    expect(normalizeVehicleMasterInput({ maker: 'Fiat', model: '  ' }).outcome).toBe('reject')
  })

  it('review quando sobra token residual não classificado', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Toyota', model: 'Corolla XEi Zzzspecial' })
    expect(r.model).toBe('Corolla')
    expect(r.outcome).toBe('review')
  })

  it('motor decimal e combustível saem do modelo', () => {
    const r = normalizeVehicleMasterInput({ maker: 'Ford', model: 'Fiesta 1.6 Flex' })
    expect(r.model).toBe('Fiesta')
    expect(r.engine).toBe('1.6')
  })
})

describe('normalizeVehicleMasterInput — paridade Edge', () => {
  const cases: Array<{ maker: string; model: string; engine?: string; version?: string }> = [
    { maker: 'Toyota', model: 'Corolla Cross' },
    { maker: 'Toyota', model: 'Corolla Apremiumh' },
    { maker: 'Toyota', model: 'Hilux CD4X2 SR' },
    { maker: 'Honda', model: 'HR-V EX Cvt' },
    { maker: 'Nissan', model: 'Sentra 20SV Cvt' },
    { maker: 'Volkswagen', model: 'Cross Fox' },
    { maker: 'Volkswagen', model: 'T-Cross' },
    { maker: 'Ford', model: 'New Fiesta' },
    { maker: 'Volkswagen', model: 'Saveira' },
    { maker: 'Renault', model: 'KWID INTENS 10MT' },
    { maker: '', model: 'Gol' },
  ]
  for (const c of cases) {
    it(`Edge == src para ${c.maker}/${c.model}`, () => {
      expect(normalizeEdge(c)).toEqual(normalizeVehicleMasterInput(c))
    })
  }
})