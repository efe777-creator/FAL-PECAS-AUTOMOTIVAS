import { describe, expect, it } from 'vitest'
import { vehicleIdentityFalCode } from './vehicleIdentityDisplay'

describe('vehicleIdentityFalCode', () => {
  it('formata FAL- + 8 hex do uuid', () => {
    expect(vehicleIdentityFalCode('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('FAL-A1B2C3D4')
  })

  it('null sem id', () => {
    expect(vehicleIdentityFalCode(null)).toBeNull()
    expect(vehicleIdentityFalCode('')).toBeNull()
    expect(vehicleIdentityFalCode('short')).toBeNull()
  })
})
