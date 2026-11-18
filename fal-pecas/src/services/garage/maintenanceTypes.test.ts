import { describe, expect, it } from 'vitest'
import { maintenanceCreatesInstallation } from './maintenanceTypes'

describe('maintenanceCreatesInstallation', () => {
  it('só instalação explícita cria instalação', () => {
    expect(maintenanceCreatesInstallation('instalacao')).toBe(true)
    expect(maintenanceCreatesInstallation('preventiva')).toBe(false)
    expect(maintenanceCreatesInstallation('corretiva')).toBe(false)
  })
})
