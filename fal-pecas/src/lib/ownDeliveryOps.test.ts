import { describe, expect, it } from 'vitest'
import {
  evaluateOwnDeliverGates,
  evaluateOwnDepartureGates,
  nextOwnDeliveryAction,
  parseOwnDeliveryOps,
} from './ownDeliveryOps'

const paidPacked = {
  orderStatus: 'pronto_para_envio',
  paymentStatus: 'approved',
  packingComplete: true,
  provider: 'own',
}

describe('ownDeliveryOps (Marcha 6)', () => {
  it('mock nunca é own ops', () => {
    expect(
      evaluateOwnDepartureGates({ ...paidPacked, provider: 'mock' }).ok,
    ).toBe(false)
    expect(nextOwnDeliveryAction({ ...paidPacked, provider: 'mock', own: null })).toBe(
      'mock_bloqueado',
    )
  })

  it('saída exige pay + provider own (packing não bloqueia)', () => {
    expect(evaluateOwnDepartureGates(paidPacked).ok).toBe(true)
    expect(
      evaluateOwnDepartureGates({ ...paidPacked, paymentStatus: 'pending' }).blockers,
    ).toContain('payment_not_approved')
    expect(
      evaluateOwnDepartureGates({ ...paidPacked, packingComplete: false }).ok,
    ).toBe(true)
  })

  it('após saída: próxima = tentativa ou confirmar entrega', () => {
    const own = parseOwnDeliveryOps({
      own: {
        departure: { at: '2026-11-12T12:00:00Z', by: 'u1' },
        attempts: [],
      },
    })
    expect(
      nextOwnDeliveryAction({
        orderStatus: 'enviado',
        paymentStatus: 'approved',
        packingComplete: true,
        provider: 'own',
        own,
      }),
    ).toBe('registrar_tentativa_ou_entrega')
  })

  it('entrega exige status enviado + saída registrada (own)', () => {
    expect(
      evaluateOwnDeliverGates({
        orderStatus: 'enviado',
        paymentStatus: 'approved',
        provider: 'own',
        own: parseOwnDeliveryOps({ own: { departure: { at: 'x', by: 'u' } } }),
      }).ok,
    ).toBe(true)

    expect(
      evaluateOwnDeliverGates({
        orderStatus: 'enviado',
        paymentStatus: 'approved',
        provider: 'own',
        own: parseOwnDeliveryOps(null),
      }).ok,
    ).toBe(false)

    expect(
      evaluateOwnDeliverGates({
        orderStatus: 'enviado',
        paymentStatus: 'pending',
        provider: 'own',
        own: parseOwnDeliveryOps({ own: { departure: { at: 'x', by: 'u' } } }),
      }).blockers,
    ).toContain('payment_not_approved')
  })

  it('parse acumula tentativas', () => {
    const own = parseOwnDeliveryOps({
      own: {
        departure: { at: 'a', by: 'u' },
        attempts: [
          { at: 'b', by: 'u', note: 'Ausente', outcome: 'failed' },
          { at: 'c', by: 'u', note: 'Vizinho', outcome: 'failed' },
        ],
      },
    })
    expect(own.attempts).toHaveLength(2)
    expect(own.departure?.at).toBe('a')
  })
})
