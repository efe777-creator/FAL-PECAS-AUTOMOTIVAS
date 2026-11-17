import { describe, expect, it } from 'vitest'
import type { AdminOrderListRow } from '@/services/admin/adminOrderService'
import { filterOrdersBySearch } from './AdminOrdersListPanel'

function row(partial: Partial<AdminOrderListRow> & Pick<AdminOrderListRow, 'id'>): AdminOrderListRow {
  return {
    status: 'em_analise',
    total: 100,
    createdAt: '2026-11-17T12:00:00Z',
    customerName: null,
    customerDoc: null,
    itemCount: 0,
    itemSearchText: '',
    paymentStatus: null,
    paymentExpiresAt: null,
    customerDecision: null,
    cancellationRequest: null,
    cancellationReason: null,
    ...partial,
  }
}

const sample: AdminOrderListRow[] = [
  row({
    id: 'aaaa1111-bbbb-cccc-dddd-eeeeeeeeeeee',
    customerName: 'Maria Silva',
    customerDoc: '123.456.789-09',
    total: 150.9,
    itemSearchText: 'filtro oleo hf1234 pastilha freio',
    shippingChoiceLabel: 'PAC · 4–8 dias',
    paymentStatus: 'approved',
  }),
  row({
    id: 'bbbb2222-bbbb-cccc-dddd-eeeeeeeeeeee',
    customerName: 'João Souza',
    customerDoc: '11222333000181',
    total: 49.99,
    itemSearchText: 'amortecedor dianteiro',
    shippingChoiceLabel: 'Retirada na loja',
    paymentStatus: 'pending',
  }),
]

describe('filterOrdersBySearch', () => {
  it('retorna tudo com busca vazia', () => {
    expect(filterOrdersBySearch(sample, '  ')).toHaveLength(2)
  })

  it('filtra por CPF (dígitos parciais)', () => {
    const hit = filterOrdersBySearch(sample, '456.789')
    expect(hit).toHaveLength(1)
    expect(hit[0].customerName).toBe('Maria Silva')
  })

  it('filtra por CNPJ só dígitos', () => {
    const hit = filterOrdersBySearch(sample, '11222333000181')
    expect(hit).toHaveLength(1)
    expect(hit[0].id.startsWith('bbbb')).toBe(true)
  })

  it('filtra por item (SKU/nome)', () => {
    const hit = filterOrdersBySearch(sample, 'hf1234')
    expect(hit).toHaveLength(1)
    expect(hit[0].itemSearchText).toContain('hf1234')
  })

  it('filtra por valor (vírgula BR e R$)', () => {
    expect(filterOrdersBySearch(sample, '150,90')).toHaveLength(1)
    expect(filterOrdersBySearch(sample, 'R$ 49,99')).toHaveLength(1)
  })

  it('mantém busca por nome e id', () => {
    expect(filterOrdersBySearch(sample, 'maria')).toHaveLength(1)
    expect(filterOrdersBySearch(sample, 'aaaa1111')).toHaveLength(1)
  })

  it('não casa CPF com menos de 3 dígitos só por dígitos', () => {
    // "12" pode casar via includes no doc formatado "123.456..."
    // mas query "99" sem 3+ dígitos no doc do João (tem 9s) — usa parcial >= 3
    const none = filterOrdersBySearch(sample, 'zzz999')
    expect(none).toHaveLength(0)
  })
})
