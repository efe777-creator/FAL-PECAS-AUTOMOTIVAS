import { describe, expect, it } from 'vitest'
import { buildPostSaleReturnOpsSummary } from './postSaleReturnOpsSummary'

describe('buildPostSaleReturnOpsSummary', () => {
  it('monta ida + devolução com código ME', () => {
    const oid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const s = buildPostSaleReturnOpsSummary({
      orderStatus: 'entregue',
      provider: 'melhorenvio',
      outboundTracking: 'AA123BR',
      shipmentMetadata: {
        me: { cart_item_id: '987654321' },
        packing: { volumes: [{ widthCm: 11 }] },
      },
      events: [
        {
          id: '1',
          eventType: 'occurrence_opened',
          visibility: 'customer',
          createdAt: '2026-11-21T10:00:00.000Z',
          payload: {
            occurrence_id: oid,
            tipo: 'pos_venda_devolucao',
            stage: 'aberto',
          },
        },
        {
          id: '2',
          eventType: 'occurrence_updated',
          visibility: 'customer',
          createdAt: '2026-11-21T11:00:00.000Z',
          payload: {
            occurrence_id: oid,
            stage: 'autorizada',
            return_mode: 'me_codigo',
            me_reverse: {
              tracking_code: 'REV-999',
              tracking_url: 'https://example.com/r',
              expires_at: '2099-01-01T00:00:00.000Z',
            },
          },
        },
      ],
    })
    expect(s).not.toBeNull()
    expect(s!.outboundTracking).toBe('AA123BR')
    expect(s!.trackingCode).toBe('REV-999')
    expect(s!.codeValid).toBe(true)
    expect(s!.liveReady).toBe(true)
    expect(s!.statusLine).toMatch(/código gerado|Autorizada/i)
  })

  it('retorna null sem pós-venda', () => {
    expect(
      buildPostSaleReturnOpsSummary({
        orderStatus: 'entregue',
        events: [],
      }),
    ).toBeNull()
  })
})
