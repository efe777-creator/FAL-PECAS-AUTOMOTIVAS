import { describe, expect, it } from 'vitest'
import { deriveOccurrences } from './orderOccurrences'

describe('deriveOccurrences (CP-EVT-01)', () => {
  it('estado = último evento do occurrence_id', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const list = deriveOccurrences([
      {
        id: '1',
        eventType: 'occurrence_opened',
        payload: { occurrence_id: id, tipo: 'falta', gravidade: 'alta', note: 'SKU X' },
        visibility: 'internal',
        createdAt: '2026-11-11T10:00:00Z',
      },
      {
        id: '2',
        eventType: 'order_received',
        payload: {},
        visibility: 'customer',
        createdAt: '2026-11-11T10:01:00Z',
      },
      {
        id: '3',
        eventType: 'occurrence_updated',
        payload: { occurrence_id: id, note: 'conferido', gravidade: 'media' },
        visibility: 'internal',
        createdAt: '2026-11-11T11:00:00Z',
      },
      {
        id: '4',
        eventType: 'occurrence_resolved',
        payload: { occurrence_id: id, solucao: 'reenviado' },
        visibility: 'customer',
        createdAt: '2026-11-11T12:00:00Z',
      },
    ])
    expect(list).toHaveLength(1)
    expect(list[0]?.status).toBe('resolved')
    expect(list[0]?.tipo).toBe('falta')
    expect(list[0]?.gravidade).toBe('media')
    expect(list[0]?.solucao).toBe('reenviado')
    expect(list[0]?.eventCount).toBe(3)
  })
})
