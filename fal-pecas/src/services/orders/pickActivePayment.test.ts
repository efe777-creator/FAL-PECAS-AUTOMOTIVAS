import { describe, expect, it } from 'vitest'
import { pickActivePayment } from '@/services/orders/pickActivePayment'

describe('pickActivePayment', () => {
  it('prefere pending mais recente sobre expired antigo', () => {
    const picked = pickActivePayment([
      {
        id: 'old',
        status: 'expired',
        created_at: '2026-11-10T21:43:00Z',
      },
      {
        id: 'new',
        status: 'pending',
        created_at: '2026-11-11T18:26:00Z',
      },
    ])
    expect(picked?.id).toBe('new')
  })

  it('sem pending → mais recente', () => {
    const picked = pickActivePayment([
      { id: 'a', status: 'expired', created_at: '2026-11-10T10:00:00Z' },
      { id: 'b', status: 'rejected', created_at: '2026-11-11T10:00:00Z' },
    ])
    expect(picked?.id).toBe('b')
  })
})
