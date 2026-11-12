import { describe, expect, it } from 'vitest'
import { orderStatusOperatorLabel } from '@/lib/adminOrderOps'
import {
  orderConfirmationResultLabel,
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

  it('Marcha 5: cliente só vê Enviado com status enviado (não com etiqueta)', () => {
    expect(orderStatusLabel.pronto_para_envio).toBe('Aguardando postagem')
    expect(orderStatusLabel.preparando_envio).toBe('Aguardando postagem')
    expect(orderStatusLabel.enviado).toBe('Enviado')
  })

  it('visibilidade do evento em PT-BR', () => {
    expect(orderEventVisibilityLabel('customer')).toBe('visível ao cliente')
    expect(orderEventVisibilityLabel('internal')).toBe('interno')
    expect(orderEventVisibilityLabel(null)).toBe('—')
  })

  it('resultado da finalização da confirmação em PT-BR', () => {
    expect(orderConfirmationResultLabel('confirmado')).toBe('Confirmado')
    expect(orderConfirmationResultLabel('nao_atendivel')).toContain('Não atendível')
    expect(orderConfirmationResultLabel('com_ressalva')).toContain('ressalva')
    expect(orderConfirmationResultLabel('autorizado_com_prazo')).toContain('prazo')
    expect(orderConfirmationResultLabel(null)).toBe('—')
  })
})
