/**
 * Fonte única da política de devolução (D14).
 * Conta (formulário) + página legal devem consumir isto — sem drift.
 */

export const RETURN_POLICY_LEAD =
  'Canal oficial de pós-venda da loja online: abra o pedido na sua conta (Ajuda com este pedido), com nota e número em mãos.'

export const RETURN_POLICY_BULLETS: readonly string[] = [
  'Direito de arrependimento (CDC): em compras online, você pode desistir em até 7 dias corridos da entrega confirmada pela loja, com a peça sem uso e na embalagem original sempre que possível.',
  'A peça deve estar sem utilização, sem instalação, preferencialmente nova e na embalagem original.',
  'Não aceitamos peças sujas de graxa, óleo ou sujeira, danificadas por mau uso, ou com identificação/etiqueta removida — a loja analisa caso a caso na conferência.',
  'Ao solicitar devolução pelo pedido, você acompanha a análise da FAL. Quando autorizada e elegível (Melhor Envio, volume único), o frete de retorno via Correios é por conta da FAL — o código é gerado sob demanda e vale cerca de 7 dias.',
  'Se o envio não permitir logística reversa automática, combinamos devolução na loja ou orientações pelo WhatsApp do pedido.',
  'Garantia legal do produto (vícios) segue o Código de Defesa do Consumidor; a loja orienta o encaminhamento após abertura no pedido ou WhatsApp.',
  'Reembolsos, quando devidos, seguem o mesmo meio de pagamento quando possível, após conferência da mercadoria (processo manual na loja).',
]

export const RETURN_POLICY_ACK_LABEL =
  'Li e entendo as condições de devolução (peça sem uso, embalagem, sem graxa/sujeira).'
