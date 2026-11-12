import { describe, expect, it } from 'vitest'
import { projectAdminOrderTimeline } from './adminOrderOps'

describe('projectAdminOrderTimeline pickup', () => {
  it('após retirar: Retirada feita marcada (entregue)', () => {
    const steps = projectAdminOrderTimeline('entregue', { pickup: true, pickupAuthorized: true })
    const last = steps.find((s) => s.id === 'entregue')
    expect(last?.label).toBe('Retirada feita')
    expect(last?.state).toBe('current')
    expect(steps.find((s) => s.id === 'enviado')?.label).toBe('Pronto para retirar')
    expect(steps.find((s) => s.id === 'enviado')?.state).toBe('done')
  })

  it('autorizado aguardando cliente: Pronto para retirar atual', () => {
    const steps = projectAdminOrderTimeline('pronto_para_envio', {
      pickup: true,
      pickupAuthorized: true,
    })
    expect(steps.find((s) => s.id === 'enviado')?.state).toBe('current')
    expect(steps.find((s) => s.id === 'entregue')?.state).toBe('todo')
    expect(steps.find((s) => s.id === 'entregue')?.label).toBe('Retirada feita')
  })

  it('frete: mantém Enviado / Entrega concluída', () => {
    const steps = projectAdminOrderTimeline('enviado', { pickup: false })
    expect(steps.find((s) => s.id === 'enviado')?.label).toBe('Enviado')
    expect(steps.find((s) => s.id === 'entregue')?.label).toBe('Entrega concluída')
  })
})
