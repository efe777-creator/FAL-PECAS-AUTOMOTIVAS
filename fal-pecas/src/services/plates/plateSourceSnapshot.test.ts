import { describe, expect, it } from 'vitest'
import {
  buildPlateSourceSnapshot,
  formatSourceSnapshotExtras,
  parsePlateSourceSnapshot,
} from './plateSourceSnapshot'

describe('plateSourceSnapshot (R3)', () => {
  it('congela fuel/câmbio e brutos sem virar filtro', () => {
    const snap = buildPlateSourceSnapshot({
      plate: 'GAF7032',
      source: 'apiplacas',
      status: 'found',
      maker: 'Chevrolet',
      model: 'Onix',
      year: 2016,
      engine: '1.4',
      engineRaw: '0.1',
      fuel: 'FLEX',
      transmission: 'Manual',
      confidence: 0.9,
    })
    expect(snap.fuel).toBe('FLEX')
    expect(snap.transmission).toBe('Manual')
    expect(snap.engineRaw).toBe('0.1')
    expect(formatSourceSnapshotExtras(snap)).toContain('Combustível')
    expect(formatSourceSnapshotExtras(snap)).toContain('Câmbio')
  })

  it('parse rejeita blob vazio e aceita snapshot válido', () => {
    expect(parsePlateSourceSnapshot(null)).toBeNull()
    expect(parsePlateSourceSnapshot({ fuel: 'FLEX' })).toBeNull()
    const parsed = parsePlateSourceSnapshot({
      maker: 'VW',
      model: 'Gol',
      fuel: 'Gasolina',
    })
    expect(parsed?.maker).toBe('VW')
    expect(parsed?.fuel).toBe('Gasolina')
  })
})
