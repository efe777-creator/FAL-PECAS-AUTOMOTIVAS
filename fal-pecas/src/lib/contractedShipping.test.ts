import { describe, expect, it } from 'vitest'
import {
  contractedShippingShortLine,
  formatContractedEtaDays,
  readContractedShipping,
} from '@/lib/contractedShipping'

describe('formatContractedEtaDays', () => {
  it('formata faixa e singular', () => {
    expect(formatContractedEtaDays(3, 5)).toBe('3–5 dias úteis')
    expect(formatContractedEtaDays(1, 1)).toBe('1 dia útil')
    expect(formatContractedEtaDays(0, 0, { pickup: true })).toBe('Retirada na loja')
  })
})

describe('readContractedShipping', () => {
  it('lê label e prazo do metadata da compra (ME)', () => {
    const info = readContractedShipping(
      {
        provider: 'melhorenvio',
        metadata: {
          label: 'Correios PAC',
          eta_days_min: 4,
          eta_days_max: 8,
          service_code: '1',
          charged_shipping: 22.5,
        },
      },
      22.5,
    )
    expect(info?.label).toBe('Correios PAC')
    expect(info?.etaLabel).toBe('4–8 dias úteis')
    expect(info?.modality).toBe('Melhor Envio')
    expect(contractedShippingShortLine(info)).toBe('Correios PAC · 4–8 dias úteis')
  })

  it('retirada usa label amigável', () => {
    const info = readContractedShipping({
      provider: 'mock',
      metadata: { option_id: 'mock:pickup', label: 'Retirada', eta_days_min: 0, eta_days_max: 0 },
    })
    expect(info?.pickup).toBe(true)
    expect(info?.label).toBe('Retirada na loja')
    expect(info?.etaLabel).toBe('Retirada na loja')
  })

  it('own usa label do snapshot mesmo sem carrier/service nas colunas', () => {
    const info = readContractedShipping({
      provider: 'own',
      carrier: null,
      service: null,
      metadata: {
        label: 'Moto FAL',
        eta_days_min: 1,
        eta_days_max: 2,
        service_code: 'moto',
      },
    })
    expect(info?.label).toBe('Moto FAL')
    expect(info?.etaLabel).toBe('1–2 dias úteis')
  })
})
