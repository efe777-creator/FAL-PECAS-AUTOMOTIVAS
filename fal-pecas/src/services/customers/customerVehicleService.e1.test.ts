import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
const rpcMock = vi.fn()
const getCurrentCustomerId = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  }),
}))

vi.mock('@/services/customers/customerService', () => ({
  getCurrentCustomerId: () => getCurrentCustomerId(),
}))

describe('addSavedVehicle PLANO 2A E1', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
    getCurrentCustomerId.mockReset()
    getCurrentCustomerId.mockResolvedValue('cust-1')
    vi.resetModules()
  })

  it('cria via RPC atômica e reidrata membership com falCode', async () => {
    const identityId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    rpcMock.mockResolvedValue({
      data: { id: 'v-new', customer_id: 'cust-1', vehicle_identity_id: identityId },
      error: null,
    })

    const maybeSingle = vi.fn(async () => ({
      data: {
        id: 'v-new',
        customer_id: 'cust-1',
        vehicle_identity_id: identityId,
        manufacturer_id: null,
        model_id: null,
        version_id: null,
        year: 2020,
        engine: null,
        nickname: null,
        is_primary: true,
        maker_text: 'Chevrolet',
        model_text: 'Onix',
        plate: null,
      },
      error: null,
    }))

    fromMock.mockImplementation((table: string) => {
      if (table === 'customer_vehicles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ maybeSingle }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {}
    })

    const { addSavedVehicle } = await import('./customerVehicleService')
    const row = await addSavedVehicle({
      makerText: 'Chevrolet',
      modelText: 'Onix',
      year: 2020,
      isPrimary: true,
    })

    expect(rpcMock).toHaveBeenCalledWith(
      'create_customer_vehicle_with_identity',
      expect.objectContaining({
        p_maker_text: 'Chevrolet',
        p_model_text: 'Onix',
        p_is_primary: true,
      }),
    )
    expect(row.id).toBe('v-new')
    expect(row.vehicleIdentityId).toBe(identityId)
    expect(row.falCode).toBe('FAL-A1B2C3D4')
  })
})
