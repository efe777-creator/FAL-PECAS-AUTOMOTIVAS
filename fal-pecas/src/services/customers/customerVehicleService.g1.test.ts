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

describe('plateNormalizedOrNull', () => {
  it('normaliza e nullifica vazio', async () => {
    const { plateNormalizedOrNull } = await import('./customerVehicleService')
    expect(plateNormalizedOrNull(' abc-1d23 ')).toBe('ABC1D23')
    expect(plateNormalizedOrNull('')).toBeNull()
    expect(plateNormalizedOrNull('   ')).toBeNull()
    expect(plateNormalizedOrNull(null)).toBeNull()
  })
})

describe('isUntypedShellVv', () => {
  it('detecta casca sem ano/motor/versão', async () => {
    const { isUntypedShellVv } = await import('./customerVehicleService')
    expect(isUntypedShellVv({ year: null, engine: null, version_name: null })).toBe(true)
    expect(isUntypedShellVv({ year: 2010, engine: null, version_name: null })).toBe(false)
    expect(isUntypedShellVv({ year: null, engine: '1.0', version_name: null })).toBe(false)
  })
})

describe('updateSavedVehicle (#23)', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
    getCurrentCustomerId.mockReset()
    getCurrentCustomerId.mockResolvedValue('cust-1')
    vi.resetModules()
  })

  it('atualiza nickname e plate_normalized no mesmo id', async () => {
    const updateFn = vi.fn()
    const updateSingle = vi.fn(async () => ({
      data: {
        id: 'v1',
        customer_id: 'cust-1',
        manufacturer_id: null,
        model_id: null,
        version_id: null,
        year: 2020,
        engine: null,
        nickname: 'Onix da firma',
        is_primary: false,
        maker_text: 'Chevrolet',
        model_text: 'Onix',
        plate: 'gaf-7032',
        plate_normalized: 'GAF7032',
      },
      error: null,
    }))
    updateFn.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: updateSingle }),
        }),
      }),
    })
    fromMock.mockReturnValue({ update: updateFn })

    const { updateSavedVehicle } = await import('./customerVehicleService')
    const row = await updateSavedVehicle('v1', { nickname: 'Onix da firma', plate: 'gaf-7032' })
    expect(row.id).toBe('v1')
    expect(row.nickname).toBe('Onix da firma')
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        nickname: 'Onix da firma',
        plate: 'gaf-7032',
        plate_normalized: 'GAF7032',
      }),
    )
  })
})

describe('ensureSavedVehicleFromFilter dedup (#22)', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
    getCurrentCustomerId.mockReset()
    getCurrentCustomerId.mockResolvedValue('cust-1')
    vi.resetModules()
  })

  it('mesma plate_normalized atualiza em vez de inserir', async () => {
    const existingRow = {
      id: 'existing',
      customer_id: 'cust-1',
      manufacturer_id: 'm1',
      model_id: 'mo1',
      version_id: null,
      year: 2019,
      engine: null,
      nickname: null,
      is_primary: true,
      maker_text: 'Chevrolet',
      model_text: 'Onix',
      plate: 'GAF-7032',
      plate_normalized: 'GAF7032',
      manufacturers: { name: 'Chevrolet' },
      models: { name: 'Onix' },
      vehicle_versions: null,
    }

    rpcMock.mockImplementation(async (name: string) => {
      if (name === 'sanitize_garage_vehicle_fks') {
        return {
          data: {
            o_manufacturer_id: 'm1',
            o_model_id: 'mo1',
            o_version_id: 'skip-resolve',
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })

    const updateSingle = vi.fn(async () => ({
      data: { ...existingRow, nickname: 'Atualizado', year: 2020 },
      error: null,
    }))
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: updateSingle }),
        }),
      }),
    })
    const insertFn = vi.fn()

    fromMock.mockImplementation((table: string) => {
      if (table === 'vehicle_identities') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }
      const cvChain = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        single: vi.fn(async () => ({
          data: {
            manufacturer_id: 'm1',
            model_id: 'mo1',
            version_id: 'skip-resolve',
          },
          error: null,
        })),
        update: updateFn,
        insert: insertFn,
        then(onFulfilled: (v: { data: unknown[]; error: null }) => unknown) {
          return Promise.resolve({ data: [existingRow], error: null }).then(onFulfilled)
        },
      }
      cvChain.select.mockReturnValue(cvChain)
      cvChain.eq.mockReturnValue(cvChain)
      cvChain.order.mockReturnValue(cvChain)
      return cvChain
    })

    const { ensureSavedVehicleFromFilter } = await import('./customerVehicleService')
    const saved = await ensureSavedVehicleFromFilter({
      maker: 'Chevrolet',
      model: 'Onix',
      year: '2020',
      plate: 'gaf7032',
      nickname: 'Atualizado',
      manufacturerId: 'm1',
      modelId: 'mo1',
      versionId: 'skip-resolve',
    })

    expect(insertFn).not.toHaveBeenCalled()
    expect(saved.id).toBe('existing')
    expect(updateFn).toHaveBeenCalled()
    expect(rpcMock).toHaveBeenCalledWith(
      'sanitize_garage_vehicle_fks',
      expect.objectContaining({ p_model_id: 'mo1' }),
    )
  })
})
