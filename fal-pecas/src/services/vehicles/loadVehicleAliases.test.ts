import { describe, expect, it } from 'vitest'
import {
  mapVehicleAliasRows,
  pickAliasesSource,
} from '@/services/vehicles/loadVehicleAliases'
import {
  INV_BUILTIN_ALIASES,
  isChildToParentModelAlias,
  resolveVehicleIdentity,
} from '@/services/vehicles/resolveVehicleIdentity'

describe('loadVehicleAliases · mapeamento e guard filho→pai', () => {
  it('mapeia só validated com destino e shape InvAlias', () => {
    const out = mapVehicleAliasRows([
      { kind: 'model', maker_scope: 'Volkswagen', from_norm: 'saveira', to_canonical: 'Saveiro', status: 'validated' },
      { kind: 'version', maker_scope: 'Fiat', from_norm: 'hlap', to_canonical: null, status: 'pending_validation' },
      { kind: 'bogus', from_norm: 'x', to_canonical: 'X', status: 'validated' },
      { kind: 'maker', from_norm: 'vw', to_canonical: '', status: 'validated' },
    ])
    expect(out).toEqual([
      {
        kind: 'model',
        makerScope: 'Volkswagen',
        fromNorm: 'saveira',
        toCanonical: 'Saveiro',
        status: 'validated',
      },
    ])
  })

  it('bloqueia alias filho→pai (corollacross → Corolla, Toyota)', () => {
    const bad = {
      kind: 'model' as const,
      fromNorm: 'corollacross',
      toCanonical: 'Corolla',
    }
    expect(isChildToParentModelAlias(bad)).toBe(true)
    expect(
      mapVehicleAliasRows([
        { kind: 'model', maker_scope: 'Toyota', from_norm: 'corollacross', to_canonical: 'Corolla', status: 'validated' },
        { kind: 'model', maker_scope: 'Toyota', from_norm: 'corollacross', to_canonical: 'Corolla Cross', status: 'validated' },
      ]),
    ).toEqual([
      {
        kind: 'model',
        makerScope: 'Toyota',
        fromNorm: 'corollacross',
        toCanonical: 'Corolla Cross',
        status: 'validated',
      },
    ])
  })

  it('não bloqueia typo irmão (saveira → Saveiro) nem versão', () => {
    expect(
      isChildToParentModelAlias({ kind: 'model', fromNorm: 'saveira', toCanonical: 'Saveiro' }),
    ).toBe(false)
    expect(
      isChildToParentModelAlias({ kind: 'version', fromNorm: 'dr', toCanonical: 'd' }),
    ).toBe(false)
  })

  it('DB vazio → builtins; DB com linhas → DB', () => {
    expect(pickAliasesSource([])).toBe(INV_BUILTIN_ALIASES)
    expect(pickAliasesSource(null)).toBe(INV_BUILTIN_ALIASES)
    const db = mapVehicleAliasRows([
      { kind: 'maker', from_norm: 'vw', to_canonical: 'Volkswagen', status: 'validated' },
    ])
    expect(pickAliasesSource(db)).toBe(db)
  })

  it('resolver ignora alias filho→pai injetado: Corolla Cross continua Corolla Cross', () => {
    const r = resolveVehicleIdentity({
      source: 'text',
      maker: 'Toyota',
      model: 'Corolla Cross',
      year: '2023',
      aliases: [
        { kind: 'model', makerScope: 'Toyota', fromNorm: 'corollacross', toCanonical: 'Corolla', status: 'validated' },
      ],
    })
    expect(r.filter.model).toBe('Corolla Cross')
  })

  it('builtins: Saveira→Saveiro (VW) e HRV→HR-V (Honda) com escopo de montadora', () => {
    const sav = resolveVehicleIdentity({
      source: 'text',
      maker: 'Volkswagen',
      model: 'Saveira',
      year: '2015',
    })
    expect(sav.filter.model).toBe('Saveiro')
    const hrv = resolveVehicleIdentity({
      source: 'text',
      maker: 'Honda',
      model: 'HRV',
      year: '2020',
    })
    expect(hrv.filter.model).toBe('HR-V')
    const other = resolveVehicleIdentity({
      source: 'text',
      maker: 'Fiat',
      model: 'Saveira',
      year: '2015',
    })
    expect(other.filter.model).toBe('Saveira')
  })
})
