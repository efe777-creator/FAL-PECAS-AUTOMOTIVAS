import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
}))

const ensure = vi.fn()
vi.mock('@/services/customers/customerVehicleService', () => ({
  ensureSavedVehicleFromFilter: (...args: unknown[]) => ensure(...args),
}))

const read = vi.fn()
const clear = vi.fn()
vi.mock('@/services/plates/pendingGarage', () => ({
  readPendingGarageVehicle: () => read(),
  clearPendingGarageVehicle: () => clear(),
}))

describe('flushPendingGarageVehicle', () => {
  beforeEach(() => {
    ensure.mockReset()
    read.mockReset()
    clear.mockReset()
    vi.resetModules()
  })

  it('não faz nada sem pending', async () => {
    read.mockReturnValue(null)
    const { flushPendingGarageVehicle } = await import('./flushPendingGarage')
    const r = await flushPendingGarageVehicle()
    expect(r.skipped).toBe(true)
    expect(ensure).not.toHaveBeenCalled()
  })

  it('salva e limpa pending em sucesso', async () => {
    read.mockReturnValue({ maker: 'Fiat', model: 'Argo', year: '2020' })
    ensure.mockResolvedValue({ id: '1', makerName: 'Fiat', modelName: 'Argo' })
    const { flushPendingGarageVehicle } = await import('./flushPendingGarage')
    const r = await flushPendingGarageVehicle()
    expect(r.ok).toBe(true)
    expect(r.vehicle?.id).toBe('1')
    expect(ensure).toHaveBeenCalledWith({ maker: 'Fiat', model: 'Argo', year: '2020' })
    expect(clear).toHaveBeenCalled()
  })

  it('mantém pending se ensure falhar', async () => {
    read.mockReturnValue({ maker: 'Fiat', model: 'Argo' })
    ensure.mockRejectedValue(new Error('falha'))
    const { flushPendingGarageVehicle } = await import('./flushPendingGarage')
    const r = await flushPendingGarageVehicle()
    expect(r.ok).toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })
})
