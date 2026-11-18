import { describe, expect, it } from 'vitest'
import {
  validateVehicleAssetFile,
  VEHICLE_ASSET_MAX_BYTES,
} from './vehicleAssetLimits'

function fakeFile(type: string, size: number): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 16))], { type })
  return new File([blob], 'foto.jpg', { type })
}

describe('validateVehicleAssetFile', () => {
  it('aceita jpeg/png/webp no limite', () => {
    expect(validateVehicleAssetFile(fakeFile('image/jpeg', 1024))).toBeNull()
    expect(validateVehicleAssetFile(fakeFile('image/png', 1024))).toBeNull()
    expect(validateVehicleAssetFile(fakeFile('image/webp', 1024))).toBeNull()
  })

  it('rejeita mime e tamanho inválidos', () => {
    expect(validateVehicleAssetFile(fakeFile('image/gif', 1024))).toMatch(/Formato/i)
    const big = fakeFile('image/jpeg', VEHICLE_ASSET_MAX_BYTES + 1)
    Object.defineProperty(big, 'size', { value: VEHICLE_ASSET_MAX_BYTES + 1 })
    expect(validateVehicleAssetFile(big)).toMatch(/5 MB/i)
  })
})
