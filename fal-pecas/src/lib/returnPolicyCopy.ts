/**
 * Fonte única da política de devolução (D14).
 * Conta (formulário) + página legal devem consumir isto — sem drift.
 */

export const RETURN_POLICY_LEAD =
  'Canal oficial de pós-venda da loja online — peça com nota e número do pedido em mãos.'

export const RETURN_POLICY_BULLETS: readonly string[] = [
  'Direito de arrependimento (CDC): em compras online, você pode desistir em até 7 dias corridos da entrega confirmada pela loja, com a peça sem uso e na embalagem original sempre que possível.',
  'A peça deve estar sem utilização, sem instalação, preferencialmente nova e na embalagem original.',
  'Não aceitamos peças sujas de graxa, óleo ou sujeira, danificadas por mau uso, ou com identificação/etiqueta removida — a loja analisa caso a caso.',
  'Ao solicitar devolução pelo pedido, você acompanha a análise da FAL. Quando autorizada e elegível, o frete de retorno via Melhor Envio/Correios é por conta da FAL.',
  'Se o envio não permitir logística reversa automática, combinamos devolução na loja ou orientações pelo WhatsApp.',
  'Garantia legal do produto (vícios) segue o Código de Defesa do Consumidor; a loja orienta o encaminhamento após abertura no pedido ou WhatsApp.',
  'Reembolsos, quando devidos, seguem o mesmo meio de pagamento quando possível, após conferência da mercadoria.',
]

export const RETURN_POLICY_ACK_LABEL =
  'Li e entendo as condições de devolução (peça sem uso, embalagem, sem graxa/sujeira).'
