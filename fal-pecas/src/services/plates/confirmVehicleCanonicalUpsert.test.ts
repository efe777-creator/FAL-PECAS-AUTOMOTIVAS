import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    functions: { invoke },
  }),
}))

describe('confirmVehicleCanonicalUpsert', () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  it('mescla IDs retornados pela Edge', async () => {
    invoke.mockResolvedValue({
      data: {
        ok: true,
        manufacturerId: 'man-1',
        modelId: 'mod-1',
        versionId: 'ver-1',
        maker: 'Fiat',
        model: 'Palio',
        year: '2015',
        engine: '1.0',
        version: 'Fire',
      },
      error: null,
    })

    const { confirmVehicleCanonicalUpsert } = await import('./confirmVehicleCanonicalUpsert')
    const next = await confirmVehicleCanonicalUpsert({
      maker: 'Fiat',
      model: 'Palio',
      year: '2015',
      plate: 'GAF7032',
    })

    expect(invoke).toHaveBeenCalledWith(
      'vehicle-confirm-upsert',
      expect.objectContaining({
        body: expect.objectContaining({ maker: 'Fiat', model: 'Palio', year: '2015' }),
      }),
    )
    expect(next.versionId).toBe('ver-1')
    expect(next.manufacturerId).toBe('man-1')
    expect(next.plate).toBe('GAF7032')
  })
})
