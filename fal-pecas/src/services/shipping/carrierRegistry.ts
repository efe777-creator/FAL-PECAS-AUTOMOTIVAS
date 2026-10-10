import { mockShippingProvider } from '@/services/shipping/mockShippingProvider'
import { carrierStubProvider } from '@/services/shipping/providers/carrierStubProvider'
import { correiosSandboxProvider } from '@/services/shipping/providers/correiosStubProvider'
import { frenetSandboxProvider } from '@/services/shipping/providers/frenetStubProvider'
import type { ShippingProvider } from '@/types'

/** Ambiente operacional do adaptador (não confundir com D-FRETE comercial). */
export type CarrierRuntimeMode = 'mock' | 'sandbox' | 'live' | 'stub'

/** Onde a cotação deve rodar quando live. */
export type CarrierQuoteRuntime = 'client' | 'edge'

export type CarrierCapability =
  | 'quote'
  | 'eta'
  | 'tracking'
  | 'cep_lookup'
  | 'multi_carrier'

export interface CarrierDescriptor {
  id: string
  label: string
  /** Chave aceita em VITE_SHIPPING_PROVIDER */
  envKey: string
  mode: CarrierRuntimeMode
  quoteRuntime: CarrierQuoteRuntime
  capabilities: CarrierCapability[]
  /** false = não listar como opção operacional na loja */
  enabled: boolean
  /** true = pode cobrar pedido hoje via place_order (só mock no wtbp atual) */
  placeOrderReady: boolean
  notes: string
  createProvider: () => ShippingProvider
}

/**
 * Catálogo plugável de transportadoras / provedores de frete.
 * Novos carriers: registrar aqui + provider + (se live) edge quote-shipping.
 */
export const CARRIER_REGISTRY: readonly CarrierDescriptor[] = [
  {
    id: 'mock',
    label: 'Mock FAL',
    envKey: 'mock',
    mode: 'mock',
    quoteRuntime: 'client',
    capabilities: ['quote', 'eta'],
    enabled: true,
    placeOrderReady: true,
    notes: 'Único provedor aceito por resolve_mock_shipping_option no place_order atual.',
    createProvider: () => mockShippingProvider,
  },
  {
    id: 'correios',
    label: 'Correios',
    envKey: 'correios',
    mode: 'sandbox',
    quoteRuntime: 'client',
    capabilities: ['quote', 'eta', 'tracking', 'cep_lookup'],
    enabled: true,
    placeOrderReady: false,
    notes:
      'Sandbox local (sem HTTP). Live exige edge quote-shipping + CORREIOS_* + D-FRETE C + place_order.',
    createProvider: () => correiosSandboxProvider,
  },
  {
    id: 'frenet',
    label: 'Frenet (agregador)',
    envKey: 'frenet',
    mode: 'sandbox',
    quoteRuntime: 'client',
    capabilities: ['quote', 'eta', 'multi_carrier'],
    enabled: true,
    placeOrderReady: false,
    notes: 'Sandbox local agregador. Live = MARCHA própria + secrets + place_order.',
    createProvider: () => frenetSandboxProvider,
  },
  {
    id: 'carrier',
    label: 'Transportadora parceira (futuro)',
    envKey: 'carrier',
    mode: 'stub',
    quoteRuntime: 'edge',
    capabilities: ['quote', 'eta', 'tracking'],
    enabled: false,
    placeOrderReady: false,
    notes: 'Slot reservado. Não habilitar na loja até contrato + provider + VAL.',
    createProvider: () => carrierStubProvider,
  },
] as const

export function listCarriers(opts?: { includeDisabled?: boolean }): CarrierDescriptor[] {
  if (opts?.includeDisabled) return [...CARRIER_REGISTRY]
  return CARRIER_REGISTRY.filter((c) => c.enabled)
}

export function getCarrierByEnvKey(envKey: string | undefined | null): CarrierDescriptor {
  const key = (envKey ?? 'mock').toLowerCase().trim() || 'mock'
  const found = CARRIER_REGISTRY.find((c) => c.envKey === key)
  if (found) return found
  return CARRIER_REGISTRY[0]!
}

export function resolveCarrierProvider(envKey?: string | null): ShippingProvider {
  const desc = getCarrierByEnvKey(envKey)
  return desc.createProvider()
}

/** Texto honesto para UI quando a cotação não é frete de produção. */
export function commercialShippingDisclaimer(desc: CarrierDescriptor): string | null {
  if (desc.mode === 'live' && desc.placeOrderReady) return null
  if (desc.mode === 'mock') {
    return 'Cotação de homologação (mock). Não é frete de produção até D-FRETE.'
  }
  if (desc.mode === 'sandbox') {
    return `Cotação sandbox (${desc.label}). Não é frete de produção até D-FRETE e integração live.`
  }
  if (desc.mode === 'stub' || !desc.enabled) {
    return `${desc.label} ainda não está disponível para cotação.`
  }
  return 'Cotação indisponível como frete comercial até autorização D-FRETE.'
}
