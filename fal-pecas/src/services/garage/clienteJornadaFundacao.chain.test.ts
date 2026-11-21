/**
 * Cadeia jornada cliente — fundação coerente Minha Garagem (2026-11-21).
 * Placa → filtro → snapshot/garagem → visual 2D → checkout cv_id → histórico compras.
 */
import { describe, expect, it } from 'vitest'
import {
  GARAGE_MORE_ADVANCED_KEYS,
  GARAGE_SIDEBAR_ITEMS,
} from '@/lib/garageNav'
import { resolveViewerMode } from '@/lib/visualViewerPrefs'
import { isValidPlate, normalizePlate } from '@/services/plates/plateNormalize'
import { plateResultToFilter, type PlateLookupResult } from '@/services/plates/plateTypes'
import {
  buildVehicleSnapshotFromActive,
  resolveOrderItemCustomerVehicleId,
} from '@/services/garage/vehicleSnapshot'
import {
  collapsePurchaseEventsForHistory,
  type VehiclePartEvent,
} from '@/services/garage/vehiclePartEventService'
import {
  effectiveRenderSource,
  isSmokeOrPlaceholderGlb,
  resolveVisualizationSource,
} from '@/services/garage/visualizationEngine'
import type { CustomerSavedVehicle } from '@/types'

function plateResult(partial: Partial<PlateLookupResult> = {}): PlateLookupResult {
  return {
    plate: 'ABC1D23',
    status: 'found',
    maker: 'Volkswagen',
    model: 'Gol',
    year: '2018',
    version: '1.0',
    engine: '1.0',
    fuel: 'FLEX',
    transmission: null,
    manufacturerId: 'm1',
    modelId: 'md1',
    versionId: 'v1',
    vehicleGroup: null,
    source: 'apiplacas',
    queriedAt: '2026-11-21T12:00:00.000Z',
    confidence: 1,
    message: null,
    candidates: [],
    isMock: false,
    ...partial,
  }
}

function partEv(
  partial: Partial<VehiclePartEvent> & Pick<VehiclePartEvent, 'id' | 'eventType'>,
): VehiclePartEvent {
  return {
    customerId: 'c1',
    customerVehicleId: 'cv-ativo',
    orderId: 'ord-1',
    orderItemId: 'oi-1',
    productId: 'prod-filtro',
    payload: { name: 'Filtro de óleo', sku: 'FO-01' },
    actorId: null,
    provenance: 'system',
    createdAt: '2026-11-21T15:00:00.000Z',
    ...partial,
  }
}

describe('Jornada cliente completa · fundação garagem', () => {
  it('placa → filtro → nav → visual 2D → checkout cv_id → histórico 1 linha/item', () => {
    // 1) Placa
    const plate = normalizePlate('abc-1d23')
    expect(plate).toBe('ABC1D23')
    expect(isValidPlate(plate)).toBe(true)

    // 2) Lookup → filtro PVC
    const filter = plateResultToFilter(plateResult({ plate }))
    expect(filter.maker).toBe('Volkswagen')
    expect(filter.model).toBe('Gol')
    expect(filter.year).toBe('2018')

    // 3) Veículo ativo + snapshot
    const vehicle: CustomerSavedVehicle = {
      id: 'cv-ativo',
      customerId: 'c1',
      isPrimary: true,
      plate,
      makerName: filter.maker,
      modelName: filter.model,
      year: 2018,
      versionName: filter.version || null,
      engine: filter.engine || null,
      versionId: filter.versionId ?? 'v1',
    }
    const snap = buildVehicleSnapshotFromActive({ vehicle })
    expect(snap.customerVehicleId).toBe('cv-ativo')
    expect(snap.maker).toBe('Volkswagen')

    // 4) Nav feliz: sem Cuidados na primária
    expect(GARAGE_SIDEBAR_ITEMS.map((i) => i.key)).toEqual([
      'home',
      'historico',
      'pecas',
      'mais',
    ])
    expect(GARAGE_MORE_ADVANCED_KEYS).toContain('inteligencia')

    // 5) Visual 2D-first (auto + WebGL, sem GLB real)
    expect(resolveViewerMode('auto', true)).toBe('2d')
    expect(isSmokeOrPlaceholderGlb('smoke-demo')).toBe(true)
    const source = resolveVisualizationSource({
      preferredMode: 'auto',
      webglOk: true,
      hasApprovedGlb: false,
    })
    expect(source).toBe('2d')
    expect(effectiveRenderSource(source, true)).toBe('2d')

    // 6) Checkout vincula item ao veículo ativo
    const linkedId = resolveOrderItemCustomerVehicleId({
      itemCustomerVehicleId: null,
      snapshotCustomerVehicleId: snap.customerVehicleId,
      activeVehicleId: vehicle.id,
    })
    expect(linkedId).toBe('cv-ativo')

    // 7) Pós-compra: bought+associated → 1 linha no Histórico
    const history = collapsePurchaseEventsForHistory([
      partEv({ id: 'bought-1', eventType: 'bought', createdAt: '2026-11-21T15:00:00.000Z' }),
      partEv({
        id: 'assoc-1',
        eventType: 'associated',
        createdAt: '2026-11-21T15:00:01.000Z',
      }),
      partEv({
        id: 'install-1',
        eventType: 'installed_declared',
        provenance: 'customer',
        createdAt: '2026-11-21T16:00:00.000Z',
      }),
    ])
    expect(history).toHaveLength(1)
    expect(history[0]!.hasBought).toBe(true)
    expect(history[0]!.hasAssociated).toBe(true)
    expect(history[0]!.productLabel).toMatch(/Filtro/i)
    expect(history[0]!.customerVehicleId).toBe('cv-ativo')
  })

  it('sem veículo ativo no checkout → cv_id null (não inventa vínculo)', () => {
    expect(
      resolveOrderItemCustomerVehicleId({
        itemCustomerVehicleId: null,
        snapshotCustomerVehicleId: null,
        activeVehicleId: null,
      }),
    ).toBeNull()
  })

  it('GLB smoke não promove canvas 3D; pref 3d sem asset → procedural', () => {
    expect(isSmokeOrPlaceholderGlb('placeholder-box')).toBe(true)
    const withSmoke = resolveVisualizationSource({
      preferredMode: 'auto',
      webglOk: true,
      hasApprovedGlb: false,
    })
    expect(withSmoke).toBe('2d')
    expect(
      resolveVisualizationSource({
        preferredMode: '3d',
        webglOk: true,
        hasApprovedGlb: false,
      }),
    ).toBe('procedural')
  })
})
