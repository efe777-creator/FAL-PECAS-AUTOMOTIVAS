import { describe, expect, it } from 'vitest'
import { peelEngineFromVersionName } from './peelEngineFromVersionName'

describe('peelEngineFromVersionName', () => {
  it('peela motor no início da versão (Sentra)', () => {
    expect(peelEngineFromVersionName('2.0', '2.0 SV CVT')).toBe('SV CVT')
    expect(peelEngineFromVersionName('2.0', '2.0-SV CVT')).toBe('SV CVT')
  })

  it('não altera quando motor não é prefixo', () => {
    expect(peelEngineFromVersionName('1.6', 'SV CVT')).toBe('SV CVT')
  })

  it('versão só motor → null', () => {
    expect(peelEngineFromVersionName('2.0', '2.0')).toBeNull()
  })

  it('sem motor ou versão', () => {
    expect(peelEngineFromVersionName(null, 'SV')).toBe('SV')
    expect(peelEngineFromVersionName('2.0', null)).toBeNull()
  })
})
