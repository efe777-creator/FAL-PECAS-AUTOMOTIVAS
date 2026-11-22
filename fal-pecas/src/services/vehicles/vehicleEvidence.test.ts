import { describe, expect, it } from 'vitest'
import {
  GATE12_FORMAL_SOURCES,
  isGate12FormalSnapshot,
  toVehicleEvidence,
} from './vehicleEvidence'

describe('vehicleEvidence Gate 12', () => {
  it('GATE12_FORMAL_SOURCES cobre senatran e pbev', () => {
    expect(GATE12_FORMAL_SOURCES.has('senatran')).toBe(true)
    expect(GATE12_FORMAL_SOURCES.has('pbev')).toBe(true)
    expect(GATE12_FORMAL_SOURCES.has('oem')).toBe(false)
    expect(GATE12_FORMAL_SOURCES.has('fipex')).toBe(false)
  })

  it('toVehicleEvidence rejeita senatran/pbev sem checksum', () => {
    expect(
      toVehicleEvidence({
        sourceId: 'senatran',
        authorityTier: 'A2',
        maker: 'Toyota',
        rawDescription: 'Corolla Cross',
        sourceUrl: 'https://example.gov.br/dump',
      }),
    ).toBeNull()
    expect(
      toVehicleEvidence({
        sourceId: 'pbev',
        authorityTier: 'A2',
        maker: 'Toyota',
        rawDescription: 'Corolla Cross',
        sourceUrl: 'https://example.gov.br/pbev',
        checksum: '  ',
      }),
    ).toBeNull()
  })

  it('toVehicleEvidence aceita senatran com checksum e isGate12FormalSnapshot', () => {
    const ev = toVehicleEvidence({
      sourceId: 'senatran',
      authorityTier: 'A2',
      maker: 'Toyota',
      rawDescription: 'Corolla Cross',
      sourceUrl: 'https://example.gov.br/dump',
      checksum: 'sha256:abc',
      fetchedAt: '2026-11-22T12:00:00.000Z',
    })
    expect(ev).not.toBeNull()
    expect(ev!.checksum).toBe('sha256:abc')
    expect(isGate12FormalSnapshot(ev!)).toBe(true)
  })

  it('fipex B não exige checksum; nunca é Gate 12 formal', () => {
    const ev = toVehicleEvidence({
      sourceId: 'fipex',
      authorityTier: 'B',
      maker: 'Toyota',
      rawDescription: 'Corolla',
      sourceUrl: 'https://example.com/fipex.csv',
    })
    expect(ev).not.toBeNull()
    expect(ev!.checksum).toBeNull()
    expect(isGate12FormalSnapshot(ev!)).toBe(false)
  })
})
