import { describe, expect, it } from 'vitest'
import { orderStatusOperatorLabel } from '@/lib/adminOrderOps'
import {
  orderEventVisibilityLabel,
  orderStatusAdminLabel,
  orderStatusLabel,
  orderStatusOperatorLabel as operatorFromLifecycle,
} from '@/lib/orderLifecycle'

describe('order status labels (O1-A)', () => {
  it('admin e operador são o mesmo mapa canônico', () => {
    expect(orderStatusOperatorLabel).toBe(orderStatusAdminLabel)
    expect(operatorFromLifecycle).toBe(orderStatusAdminLabel)
  })

  it('cliente permanece distinto do admin', () => {
    expect(orderStatusLabel.aguardando_pagamento).toBe('Pendente de pagamento')
    expect(orderStatusAdminLabel.aguardando_pagamento).toBe('Aguardando pagamento')
    expect(orderStatusLabel.recebido).not.toBe(orderStatusAdminLabel.recebido)
  })

  it('visibilidade do evento em PT-BR', () => {
    expect(orderEventVisibilityLabel('customer')).toBe('visível ao cliente')
    expect(orderEventVisibilityLabel('internal')).toBe('interno')
    expect(orderEventVisibilityLabel(null)).toBe('—')
  })
})
