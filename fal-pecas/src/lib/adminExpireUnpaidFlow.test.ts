import { describe, expect, it } from 'vitest'
import {
  EXPIRE_UNPAID_CONFIRM,
  formatExpireUnpaidMessage,
} from '@/lib/adminExpireUnpaidFlow'

describe('adminExpireUnpaidFlow', () => {
  it('mensagens canônicas compartilhadas', () => {
    expect(EXPIRE_UNPAID_CONFIRM.confirmLabel).toBe('Retirar da fila')
    expect(EXPIRE_UNPAID_CONFIRM.detailedMessage).toContain('48 h')
    expect(EXPIRE_UNPAID_CONFIRM.detailedMessage).toContain('Pix')
  })

  it('formatExpireUnpaidMessage', () => {
    expect(
      formatExpireUnpaidMessage({ expired: 0, orderIds: [], maxAgeHours: 48, limit: 50 }),
    ).toContain('Nenhum pedido elegível')
    expect(
      formatExpireUnpaidMessage({
        expired: 2,
        orderIds: ['a', 'b'],
        maxAgeHours: 48,
        limit: 50,
      }),
    ).toBe('2 pedido(s) retirado(s) da fila (não pagos > 48 h).')
  })
})
