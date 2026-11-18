import { describe, expect, it } from 'vitest'
import type { CustomerSavedVehicle } from '@/types'
import {
  buildVehicleSnapshotFromActive,
  formatVehicleSnapshotLabel,
  maskPlate,
  parseVehicleSnapshot,
} from './vehicleSnapshot'

describe('vehicleSnapshot (#17/#18)', () => {
  it('congela veículo ativo e mascara placa na UI', () => {
    const vehicle: CustomerSavedVehicle = {
      id: 'v1',
      customerId: 'c1',
      isPrimary: true,
      makerName: 'Chevrolet',
      modelName: 'Onix',
      year: 2020,
      engine: '1.0',
      plate: 'GAF-7032',
    }
    const snap = buildVehicleSnapshotFromActive({ vehicle })
    expect(snap.customerVehicleId).toBe('v1')
    expect(snap.contextSource).toBe('active')
    expect(snap.plate).toBe('GAF-7032')
    expect(maskPlate(snap.plate)).toBe('GAF7***')
    expect(formatVehicleSnapshotLabel(snap)).toContain('Chevrolet')
    expect(formatVehicleSnapshotLabel(snap)).toContain('GAF7***')
  })

  it('parse preserva snapshot independente de edição futura da garagem', () => {
    const frozen = parseVehicleSnapshot({
      customerVehicleId: 'v1',
      maker: 'Fiat',
      model: 'Argo',
      year: 2019,
      version: null,
      engine: null,
      versionId: null,
      plate: 'ABC1D23',
      associatedAt: '2026-01-01T00:00:00.000Z',
      contextSource: 'active',
    })
    expect(frozen?.maker).toBe('Fiat')
    expect(frozen?.model).toBe('Argo')
    expect(parseVehicleSnapshot(null)).toBeNull()
    expect(parseVehicleSnapshot({ maker: 'X' })).toBeNull()
  })
})
