import { describe, expect, it } from 'vitest'
import {
  isMomentClickable,
  resolveMomentIndex,
  targetStepForMoment,
} from './checkoutMoments'

describe('checkoutMoments (3 etapas)', () => {
  it('resolveMomentIndex: endereço / entrega / pagamento', () => {
    expect(resolveMomentIndex(0)).toBe(0)
    expect(resolveMomentIndex(1)).toBe(0)
    expect(resolveMomentIndex(2)).toBe(1)
    expect(resolveMomentIndex(3)).toBe(2)
    expect(resolveMomentIndex(4, true)).toBe(2)
  })

  it('bloqueia clique na etapa atual', () => {
    expect(
      isMomentClickable({
        moment: 1,
        current: 1,
        paymentAwaiting: false,
        maxReachedStep: 4,
        step: 2,
      }),
    ).toBe(false)
  })

  it('com cobrança aberta permite ir a endereço/entrega e voltar ao pagamento', () => {
    expect(
      isMomentClickable({
        moment: 0,
        current: 2,
        paymentAwaiting: true,
        maxReachedStep: 4,
        step: 4,
      }),
    ).toBe(true)
    expect(
      isMomentClickable({
        moment: 1,
        current: 2,
        paymentAwaiting: true,
        maxReachedStep: 4,
        step: 4,
      }),
    ).toBe(true)
    expect(
      isMomentClickable({
        moment: 2,
        current: 1,
        paymentAwaiting: true,
        maxReachedStep: 4,
        step: 2,
      }),
    ).toBe(true)
  })

  it('sem cobrança: permite voltar ao endereço a partir do pagamento', () => {
    expect(
      isMomentClickable({
        moment: 0,
        current: 2,
        paymentAwaiting: false,
        maxReachedStep: 4,
        step: 3,
      }),
    ).toBe(true)
  })

  it('targetStepForMoment: endereço / entrega / pagamento', () => {
    expect(targetStepForMoment(0, { shippingOptionId: 'sedex', addressId: 'a1' })).toBe(1)
    expect(targetStepForMoment(0, { shippingOptionId: '', addressId: '' })).toBe(0)
    expect(targetStepForMoment(1, { shippingOptionId: 'sedex', addressId: 'a1' })).toBe(2)
    expect(targetStepForMoment(2, { shippingOptionId: 'sedex', addressId: 'a1' })).toBe(3)
    expect(
      targetStepForMoment(2, {
        shippingOptionId: 'sedex',
        addressId: 'a1',
        paymentAwaiting: true,
      }),
    ).toBe(4)
  })
})
