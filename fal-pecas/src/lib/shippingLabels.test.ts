import { describe, expect, it } from 'vitest'
import { shipmentStatusLabel } from './shippingLabels'

describe('shipmentStatusLabel', () => {
  it('traduz status canônicos', () => {
    expect(shipmentStatusLabel('pending')).toBe('pendente')
    expect(shipmentStatusLabel('ready')).toBe('pronto para envio')
    expect(shipmentStatusLabel('shipped')).toBe('enviado')
    expect(shipmentStatusLabel('delivered')).toBe('entregue')
    expect(shipmentStatusLabel('cancelled')).toBe('cancelado')
  })

  it('normaliza caixa e vazios', () => {
    expect(shipmentStatusLabel('SHIPPED')).toBe('enviado')
    expect(shipmentStatusLabel(null)).toBe('—')
    expect(shipmentStatusLabel('')).toBe('—')
  })
})
