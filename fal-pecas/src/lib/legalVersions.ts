/** Versões públicas dos documentos legais (prédão #14). */

export const LEGAL_VERSIONS = {
  terms: '2026-11-22',
  commercial: '2026-11-22',
  privacy: '2026-11-22',
  cookies: '2026-11-22b',
  shipping: '2026-11-22',
  returns: '2026-11-22',
  warranty: '2026-11-22',
  compatibility: '2026-11-22',
} as const

export type LegalDocKind =
  | 'termos'
  | 'termos-comerciais'
  | 'privacidade'
  | 'cookies'
  | 'frete-entrega'
  | 'trocas-devolucoes'
  | 'garantia'
  | 'compatibilidade'

export const LEGAL_DOC_PATH: Record<LegalDocKind, string> = {
  termos: '/termos',
  'termos-comerciais': '/termos-comerciais',
  privacidade: '/privacidade',
  cookies: '/cookies',
  'frete-entrega': '/frete-entrega',
  'trocas-devolucoes': '/trocas-devolucoes',
  garantia: '/garantia',
  compatibilidade: '/compatibilidade',
}

const KIND_TO_VERSION_KEY: Record<LegalDocKind, keyof typeof LEGAL_VERSIONS> = {
  termos: 'terms',
  'termos-comerciais': 'commercial',
  privacidade: 'privacy',
  cookies: 'cookies',
  'frete-entrega': 'shipping',
  'trocas-devolucoes': 'returns',
  garantia: 'warranty',
  compatibilidade: 'compatibility',
}

export function legalVersionFor(kind: LegalDocKind): string {
  return LEGAL_VERSIONS[KIND_TO_VERSION_KEY[kind]]
}

/** Quatro documentos do aceite contratual (checkout/cadastro). */
export const LEGAL_ACCEPTANCE_KINDS = [
  'termos',
  'termos-comerciais',
  'privacidade',
  'trocas-devolucoes',
] as const satisfies readonly LegalDocKind[]

export type LegalAcceptanceKind = (typeof LEGAL_ACCEPTANCE_KINDS)[number]

export type LegalAcceptancePayload = {
  terms_version: string
  commercial_version: string
  privacy_version: string
  returns_version: string
  accepted_at: string
}

export function buildLegalAcceptancePayload(
  acceptedAt: string = new Date().toISOString(),
): LegalAcceptancePayload {
  return {
    terms_version: LEGAL_VERSIONS.terms,
    commercial_version: LEGAL_VERSIONS.commercial,
    privacy_version: LEGAL_VERSIONS.privacy,
    returns_version: LEGAL_VERSIONS.returns,
    accepted_at: acceptedAt,
  }
}

export type LegalPolicyCard = {
  kind: LegalDocKind
  path: string
  title: string
  description: string
  version: string
}

export const LEGAL_POLICY_CARDS: readonly LegalPolicyCard[] = [
  {
    kind: 'termos',
    path: LEGAL_DOC_PATH.termos,
    title: 'Termos de Uso da Plataforma',
    description: 'Regras de uso do site, conta e navegação na loja online.',
    version: LEGAL_VERSIONS.terms,
  },
  {
    kind: 'termos-comerciais',
    path: LEGAL_DOC_PATH['termos-comerciais'],
    title: 'Termos Comerciais',
    description: 'Pedido, preço, pagamento, estoque e confirmação da compra.',
    version: LEGAL_VERSIONS.commercial,
  },
  {
    kind: 'privacidade',
    path: LEGAL_DOC_PATH.privacidade,
    title: 'Privacidade',
    description: 'Dados pessoais, finalidades e seus direitos (LGPD).',
    version: LEGAL_VERSIONS.privacy,
  },
  {
    kind: 'cookies',
    path: LEGAL_DOC_PATH.cookies,
    title: 'Cookies',
    description: 'Cookies essenciais e opcionais de analytics/marketing.',
    version: LEGAL_VERSIONS.cookies,
  },
  {
    kind: 'frete-entrega',
    path: LEGAL_DOC_PATH['frete-entrega'],
    title: 'Frete, Envio e Entrega',
    description: 'Melhor Envio, entrega própria e retirada quando disponíveis.',
    version: LEGAL_VERSIONS.shipping,
  },
  {
    kind: 'trocas-devolucoes',
    path: LEGAL_DOC_PATH['trocas-devolucoes'],
    title: 'Trocas, Devoluções e Reembolsos',
    description: 'Arrependimento (CDC), devoluções e reembolsos.',
    version: LEGAL_VERSIONS.returns,
  },
  {
    kind: 'garantia',
    path: LEGAL_DOC_PATH.garantia,
    title: 'Garantia e Atendimento',
    description: 'Garantia legal, vício do produto e canais de atendimento.',
    version: LEGAL_VERSIONS.warranty,
  },
  {
    kind: 'compatibilidade',
    path: LEGAL_DOC_PATH.compatibilidade,
    title: 'Compatibilidade e Aplicação',
    description: 'Como a FAL informa aplicação veicular e limites técnicos.',
    version: LEGAL_VERSIONS.compatibility,
  },
]
