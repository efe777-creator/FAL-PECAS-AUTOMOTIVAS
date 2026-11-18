import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
const getCurrentCustomerId = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
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

describe('updateSavedVehicle (#23)', () => {
  beforeEach(() => {
    fromMock.mockReset()
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

    const listThenable = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then(onFulfilled: (v: { data: unknown[]; error: null }) => unknown) {
        return Promise.resolve({ data: [existingRow], error: null }).then(onFulfilled)
      },
    }
    listThenable.select.mockReturnValue(listThenable)
    listThenable.eq.mockReturnValue(listThenable)
    listThenable.order.mockReturnValue(listThenable)

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

    fromMock.mockReturnValue({
      select: listThenable.select,
      eq: listThenable.eq,
      order: listThenable.order,
      then: listThenable.then.bind(listThenable),
      update: updateFn,
      insert: insertFn,
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
  })
})
