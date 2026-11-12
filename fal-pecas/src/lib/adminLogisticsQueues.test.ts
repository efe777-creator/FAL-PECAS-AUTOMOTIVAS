import { describe, expect, it } from 'vitest'
import {
  ADMIN_LOGISTICS_QUEUES,
  isPaymentBlockingLogistics,
  isPaymentCanonicallyApproved,
  logisticsNextAction,
  normalizeShipProvider,
  orderMatchesLogisticsQueue,
  packingFromShipmentMeta,
} from './adminLogisticsQueues'

describe('adminLogisticsQueues', () => {
  it('define 6 filas e não mistura mock com own', () => {
    expect(ADMIN_LOGISTICS_QUEUES.map((q) => q.id)).toEqual([
      'volumes',
      'etiquetas-me',
      'entregas-proprias',
      'revisao',
      'transito',
      'entregues',
    ])
    expect(normalizeShipProvider('own')).toBe('own')
    expect(normalizeShipProvider('mock')).toBe('mock')
    expect(normalizeShipProvider('melhorenvio')).toBe('melhorenvio')
  })

  it('pagamento canônico: só approved libera; pending/refunded bloqueiam', () => {
    expect(isPaymentCanonicallyApproved('approved')).toBe(true)
    expect(isPaymentCanonicallyApproved('pending')).toBe(false)
    expect(isPaymentBlockingLogistics('pending')).toBe(true)
    expect(isPaymentBlockingLogistics('refunded')).toBe(true)
    expect(isPaymentBlockingLogistics('approved')).toBe(false)
  })

  it('packing estrutural exige dims e peso > 0', () => {
    expect(
      packingFromShipmentMeta({
        packing: {
          volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 0 }],
        },
      }),
    ).toBe(false)
    expect(
      packingFromShipmentMeta({
        packing: {
          volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 0.5 }],
        },
      }),
    ).toBe(true)
  })

  it('fila volumes: ME/own sem packing; mock fora', () => {
    const base = {
      status: 'pronto_para_envio',
      paymentStatus: 'approved',
      shipment: { provider: 'melhorenvio', metadata: {} },
    }
    expect(orderMatchesLogisticsQueue(base, 'volumes')).toBe(true)
    expect(
      orderMatchesLogisticsQueue(
        { ...base, shipment: { provider: 'mock', metadata: {} } },
        'volumes',
      ),
    ).toBe(false)
    expect(
      orderMatchesLogisticsQueue(
        {
          ...base,
          shipment: {
            provider: 'own',
            metadata: {
              packing: {
                volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
              },
            },
          },
        },
        'volumes',
      ),
    ).toBe(false)
  })

  it('etiquetas-me exige packing + approved + não purchased; own não entra', () => {
    const packed = {
      packing: {
        volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
      },
    }
    const me = {
      status: 'pronto_para_envio',
      paymentStatus: 'approved',
      shipment: { provider: 'melhorenvio', metadata: { ...packed, me: { label_state: 'quoted' } } },
    }
    expect(orderMatchesLogisticsQueue(me, 'etiquetas-me')).toBe(true)
    expect(
      orderMatchesLogisticsQueue({ ...me, paymentStatus: 'pending' }, 'etiquetas-me'),
    ).toBe(false)
    expect(
      orderMatchesLogisticsQueue(
        {
          ...me,
          shipment: {
            provider: 'melhorenvio',
            metadata: { ...packed, me: { label_state: 'purchased' } },
          },
        },
        'etiquetas-me',
      ),
    ).toBe(false)
    expect(
      orderMatchesLogisticsQueue(
        { ...me, shipment: { provider: 'own', metadata: packed } },
        'etiquetas-me',
      ),
    ).toBe(false)
  })

  it('entregas-proprias só provider=own (nunca mock)', () => {
    const packed = {
      packing: {
        volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
      },
    }
    expect(
      orderMatchesLogisticsQueue(
        {
          status: 'pronto_para_envio',
          paymentStatus: 'approved',
          shipment: { provider: 'own', metadata: packed },
        },
        'entregas-proprias',
      ),
    ).toBe(true)
    expect(
      orderMatchesLogisticsQueue(
        {
          status: 'pronto_para_envio',
          paymentStatus: 'approved',
          shipment: { provider: 'mock', metadata: packed },
        },
        'entregas-proprias',
      ),
    ).toBe(false)
  })

  it('próxima ação distingue embalagem, etiqueta, own e postagem', () => {
    expect(
      logisticsNextAction({
        status: 'pronto_para_envio',
        paymentStatus: 'approved',
        shipment: { provider: 'melhorenvio', metadata: {} },
      }),
    ).toBe('aguardar_embalagem')

    expect(
      logisticsNextAction({
        status: 'pronto_para_envio',
        paymentStatus: 'approved',
        shipment: {
          provider: 'melhorenvio',
          metadata: {
            packing: {
              volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
            },
            me: { label_state: 'quoted' },
          },
        },
      }),
    ).toBe('emitir_etiqueta')

    expect(
      logisticsNextAction({
        status: 'pronto_para_envio',
        paymentStatus: 'approved',
        shipment: {
          provider: 'melhorenvio',
          metadata: {
            packing: {
              volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
            },
            me: { label_state: 'printed' },
          },
        },
      }),
    ).toBe('aguardar_postagem')

    expect(
      logisticsNextAction({
        status: 'pronto_para_envio',
        paymentStatus: 'approved',
        shipment: { provider: 'mock', metadata: {} },
      }),
    ).toBe('mock_sandbox')
  })
})
