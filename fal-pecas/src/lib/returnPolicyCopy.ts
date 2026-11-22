/**
 * Fonte única da política de devolução (D14).
 * Conta (formulário) + página legal devem consumir isto — sem drift.
 */

export const RETURN_POLICY_LEAD =
  'Canal oficial de pós-venda da loja online: abra o pedido na sua conta em “Problema com meu pedido”, com nota e número em mãos quando disponíveis. O direito de arrependimento (7 dias) não se confunde com garantia por vício.'

export const RETURN_POLICY_BULLETS: readonly string[] = [
  'Direito de arrependimento (CDC art. 49 / Dec. 7.962): em compras online, você pode desistir em até 7 dias corridos a contar do recebimento do produto. A solicitação é feita no mesmo ambiente da compra (pedido na conta); a FAL confirma o recebimento do pedido de desistência de imediato no fluxo do pedido.',
  'Não exigimos lacre intacto como barreira absoluta ao arrependimento. Peça sem uso e na embalagem original facilitam a conferência; a loja analisa caso a caso.',
  'Não aceitamos, após conferência, peças sujas de graxa/óleo, danificadas por mau uso/instalação, ou com identificação removida de forma a inviabilizar a análise — isso é distinto do arrependimento tempestivo de produto intacto.',
  'Ao solicitar devolução pelo pedido, você acompanha a análise da FAL. Quando autorizada e elegível (Melhor Envio, volume único), o frete de retorno via Correios pode ser por conta da FAL — o código é gerado sob demanda e vale cerca de 7 dias.',
  'Se o envio não permitir logística reversa automática, combinamos devolução na loja ou orientações pelo WhatsApp do pedido.',
  'Kits: você pode indicar itens; a FAL analisa devolução parcial ou do conjunto — sem auto-aprovação automática.',
  'Garantia legal do produto (vícios — CDC arts. 18/26) segue prazos próprios e não usa a janela de 7 dias como prazo genérico. Ver política de Garantia.',
  'Reembolsos, quando devidos, seguem o mesmo meio de pagamento quando possível, após conferência (processo operacional da loja).',
  'Atendimento eletrônico e respostas: ver Garantia e Central de Suporte (meta de até 5 dias úteis para demandas de atendimento, Dec. 7.962).',
]

export const RETURN_POLICY_ACK_LABEL =
  'Li e entendo as condições de devolução (arrependimento, peça, embalagem e análise da loja).'
