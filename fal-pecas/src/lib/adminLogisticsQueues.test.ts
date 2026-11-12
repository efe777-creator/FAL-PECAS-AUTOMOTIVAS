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

  it('packing completo exige dims/peso + alocação (Marcha 3)', () => {
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
    ).toBe(false)
    expect(
      packingFromShipmentMeta({
        packing: {
          volumes: [
            {
              id: 'v1',
              lengthCm: 10,
              widthCm: 10,
              heightCm: 10,
              weightKg: 0.5,
              lines: [{ orderItemId: 'i1', quantity: 1 }],
            },
          ],
          itemsFingerprint: 'i1:1',
          allocationStatus: 'complete',
        },
      }),
    ).toBe(true)
  })

  const packedComplete = {
    packing: {
      volumes: [
        {
          id: 'v1',
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          weightKg: 1,
          lines: [{ orderItemId: 'i1', quantity: 1 }],
        },
      ],
      itemsFingerprint: 'i1:1',
      allocationStatus: 'complete',
    },
  }

  it('fila volumes: ME/own sem packing completo; mock fora; só dims ainda é volumes', () => {
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
    ).toBe(true)
    expect(
      orderMatchesLogisticsQueue(
        { ...base, shipment: { provider: 'own', metadata: packedComplete } },
        'volumes',
      ),
    ).toBe(false)
  })

  it('etiquetas-me exige packing completo + approved + não purchased; own não entra', () => {
    const packed = packedComplete
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
    expect(
      orderMatchesLogisticsQueue(
        {
          status: 'pronto_para_envio',
          paymentStatus: 'approved',
          shipment: { provider: 'own', metadata: packedComplete },
        },
        'entregas-proprias',
      ),
    ).toBe(true)
    expect(
      orderMatchesLogisticsQueue(
        {
          status: 'pronto_para_envio',
          paymentStatus: 'approved',
          shipment: { provider: 'mock', metadata: packedComplete },
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
    ).toBe('embalagem_incompleta')

    expect(
      logisticsNextAction({
        status: 'pronto_para_envio',
        paymentStatus: 'approved',
        shipment: {
          provider: 'melhorenvio',
          metadata: { ...packedComplete, me: { label_state: 'quoted' } },
        },
      }),
    ).toBe('emitir_etiqueta')

    expect(
      logisticsNextAction({
        status: 'pronto_para_envio',
        paymentStatus: 'approved',
        shipment: {
          provider: 'melhorenvio',
          metadata: { ...packedComplete, me: { label_state: 'printed' } },
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
