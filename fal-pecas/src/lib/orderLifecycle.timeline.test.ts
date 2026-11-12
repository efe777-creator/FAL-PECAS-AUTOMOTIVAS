import { describe, expect, it } from 'vitest'
import { projectCustomerTimeline } from './orderLifecycle'

describe('projectCustomerTimeline', () => {
  it('não duplica "Aguardando confirmação da loja"', () => {
    const steps = projectCustomerTimeline('em_analise')
    const labels = steps.map((s) => s.label)
    const aguardando = labels.filter((l) => l === 'Aguardando confirmação da loja')
    expect(aguardando).toHaveLength(1)
    expect(steps.find((s) => s.label === 'Aguardando confirmação da loja')?.state).toBe('current')
  })

  it('confirmado: confirmação done, separação current', () => {
    const steps = projectCustomerTimeline('confirmado')
    const conf = steps.find((s) => s.id === 'em_confirmacao')
    const sep = steps.find((s) => s.id === 'separacao')
    expect(conf?.state).toBe('done')
    expect(sep?.state).toBe('current')
  })
})
