/**
 * Conteúdo operacional das 8 políticas (#14).
 * Não substitui parecer de advogado; placeholders honestos até CNPJ/go-live.
 */

import { type LegalDocKind } from '@/lib/legalVersions'
import { RETURN_POLICY_BULLETS, RETURN_POLICY_LEAD } from '@/lib/returnPolicyCopy'

export type LegalDocCopy = {
  title: string
  lead: string
  bullets: string[]
  related?: { to: string; label: string }[]
}

export const LEGAL_COPY: Record<LegalDocKind, LegalDocCopy> = {
  termos: {
    title: 'Termos de Uso da Plataforma',
    lead:
      'Estas condições regem o uso da loja online da FAL Peças Automotivas (navegação, conta e funcionalidades do site). A compra em si também se sujeita aos Termos Comerciais e demais políticas listadas na Central de Suporte.',
    bullets: [
      'A plataforma é operada pela FAL Peças Automotivas. Dados de identificação completa do fornecedor (razão social, CNPJ, endereço e contato) serão publicados de forma ostensiva quando a loja estiver em operação comercial plena; até lá, use os canais do rodapé e da Central de Suporte.',
      'O catálogo, preços, estoque e conteúdo editorial podem mudar sem aviso prévio até a confirmação do pedido no checkout.',
      'Você deve fornecer dados verdadeiros no cadastro. Uso indevido, fraude ou violação destas regras pode resultar em bloqueio da conta.',
      'Conta e senha são pessoais; não compartilhe credenciais. Avise a loja se suspeitar de acesso não autorizado.',
      'É proibido usar o site para fins ilícitos, scrapers abusivos, engenharia reversa indevida ou interferência na operação.',
      'Conteúdos, marcas e materiais da loja são protegidos; uso comercial não autorizado é vedado.',
      'Links para terceiros (pagamento, frete, mapas) seguem regras desses prestadores; a FAL não controla sites externos.',
      'A FAL pode atualizar estes Termos. Pedidos já realizados preservam as versões aceitas no momento da compra (quando registradas).',
      'Dúvidas sobre o uso da plataforma: use a Central de Suporte ou o WhatsApp/e-mail do rodapé.',
    ],
    related: [
      { to: '/termos-comerciais', label: 'Termos Comerciais' },
      { to: '/privacidade', label: 'Privacidade' },
    ],
  },
  'termos-comerciais': {
    title: 'Termos Comerciais',
    lead:
      'Condições da compra na loja online: pedido, preço, pagamento, estoque, confirmação e responsabilidades comerciais.',
    bullets: [
      'O pedido só se concretiza após pagamento aprovado (quando aplicável) e confirmação operacional da loja, observadas disponibilidade e análise comercial.',
      'Preços exibidos no catálogo são informativos até o checkout; o valor válido é o apresentado na finalização, com frete e eventuais encargos claros.',
      'Formas de pagamento seguem as opções habilitadas no checkout (ex.: Pix, cartão via processador). A FAL não solicita senha de cartão por WhatsApp.',
      'Estoque é dinâmico. Indisponibilidade parcial ou total pode gerar ajuste, troca de item, cancelamento ou estorno conforme o caso — a loja comunica pelo pedido e/ou canais oficiais.',
      'Kits e conjuntos: a composição e regras de estoque seguem o que foi apresentado na compra; alterações pós-pedido passam por análise da loja.',
      'Nota fiscal: a emissão/anexo segue o processo fiscal da loja. Enquanto o documento não estiver disponível no pedido, a pendência é indicada de forma discreta; o despacho nesta fase provisória não fica bloqueado só por ausência de NF na tela, sem eternizar dispensa fiscal.',
      'Cancelamentos antes do envio: use o fluxo do pedido quando disponível ou a Central de Suporte. Após envio, aplicam-se Trocas/Devoluções e Garantia conforme o caso.',
      'Promocões e cupons seguem regras específicas informadas na oferta; não são cumulativos salvo indicação contrária.',
      'Estes Termos Comerciais complementam os Termos de Uso e não afastam direitos do CDC.',
    ],
    related: [
      { to: '/termos', label: 'Termos de Uso' },
      { to: '/frete-entrega', label: 'Frete e entrega' },
      { to: '/trocas-devolucoes', label: 'Trocas e devoluções' },
    ],
  },
  privacidade: {
    title: 'Política de Privacidade',
    lead:
      'Tratamos dados pessoais para operar a loja, entregar pedidos, cumprir obrigações legais e melhorar a experiência — em conformidade com a LGPD.',
    bullets: [
      'Coletamos dados de cadastro (nome, documento, contato), endereços, pedidos, veículo informado para compatibilidade, e registros de comunicação necessários ao atendimento.',
      'Finalidades principais: executar o contrato de compra, prevenção a fraude, suporte, obrigações fiscais/contábeis e, com consentimento, analytics/marketing.',
      'Base legal típica: execução de contrato, legítimo interesse (segurança/melhoria não invasiva) e consentimento (cookies de marketing).',
      'Parceiros de pagamento, frete (ex.: Melhor Envio) e, quando ativos, plataformas de ads recebem apenas o necessário à finalidade. Não vendemos seus dados.',
      'Cookies e armazenamento local: essenciais para sessão, carrinho e segurança; analytics/marketing só com consentimento — veja a Política de Cookies.',
      'Você pode solicitar acesso, correção ou exclusão de conta pela área Minha Conta (/conta) ou pelos canais oficiais (WhatsApp/e-mail do rodapé).',
      'Retenção: mantemos dados pelo tempo necessário às finalidades e obrigações legais; após isso, eliminamos ou anonimizamos quando cabível.',
      'Segurança: adotamos medidas técnicas e organizacionais proporcionais; nenhum sistema é 100% isento de risco.',
      'Atualizações desta política serão versionadas; mudanças relevantes poderão ser comunicadas na loja.',
    ],
    related: [
      { to: '/cookies', label: 'Política de Cookies' },
      { to: '/conta', label: 'Minha Conta' },
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    lead:
      'Explicamos quais cookies e armazenamentos locais usamos e como você controla o consentimento de analytics/marketing (guia ANPD).',
    bullets: [
      'Cookies essenciais: necessários à loja (sessão autenticada, carrinho, segurança, preferências técnicas). Sem eles a compra pode não funcionar.',
      'Cookies/tags de analytics e marketing (ex.: Google Analytics/Ads, Meta Pixel): só são carregados se você aceitar analytics no aviso de cookies.',
      'Recusar analytics/marketing não impede navegar nem comprar; apenas limita medição de campanhas e estatísticas avançadas.',
      'Você pode reabrir as preferências a qualquer momento pelo rodapé (“Preferências de cookies”) ou pelo aviso.',
      'Armazenamento local do navegador pode guardar consentimento, itens do carrinho e preferências da loja.',
      'Inventário detalhado de tags em produção será mantido atualizado conforme campanhas (#15 Ads); esta política descreve as categorias.',
      'Para mais sobre dados pessoais, consulte a Política de Privacidade.',
    ],
    related: [{ to: '/privacidade', label: 'Privacidade' }],
  },
  'frete-entrega': {
    title: 'Frete, Envio e Entrega',
    lead:
      'Como calculamos e contratamos envios na loja online. O preço e o prazo válidos são sempre os do checkout.',
    bullets: [
      'A FAL integra a plataforma Melhor Envio para cotar e contratar modalidades de transportadoras/Correios disponíveis para o seu CEP — o nome comercial é Melhor Envio (não confundir com MEI).',
      'Quando habilitada, a loja também pode oferecer entrega própria (terceirizada/local) e/ou retirada na loja, conforme configuração e disponibilidade no checkout.',
      'Não anunciamos serviços (ex.: apps de corrida) que não estejam efetivamente disponíveis na finalização da compra.',
      'Prazos são estimativas do transportador/operador; atrasos externos podem ocorrer. Acompanhe o pedido na conta; use “Problema com meu pedido” se houver atraso relevante ou não recebimento.',
      'Endereço incompleto ou incorreto pode gerar reenvio com custo adicional ou devolução ao remetente — confira os dados antes de pagar.',
      'Rastreio: quando houver código, ele aparece no detalhe do pedido. Códigos Melhor Envio seguem o fluxo operacional da loja.',
      'Logística reversa (devolução): quando autorizada e elegível, pode usar Melhor Envio/Correios conforme a política de Trocas; caso contrário, a loja orienta retirada ou outro meio.',
      'Frete cotado ≠ garantia de disponibilidade eterna da modalidade; a opção escolhida no checkout é a contratada para aquele pedido.',
    ],
    related: [
      { to: '/trocas-devolucoes', label: 'Trocas e devoluções' },
      { to: '/termos-comerciais', label: 'Termos Comerciais' },
    ],
  },
  'trocas-devolucoes': {
    title: 'Trocas, Devoluções e Reembolsos',
    lead: RETURN_POLICY_LEAD,
    bullets: [...RETURN_POLICY_BULLETS],
    related: [
      { to: '/garantia', label: 'Garantia e atendimento' },
      { to: '/frete-entrega', label: 'Frete e entrega' },
    ],
  },
  garantia: {
    title: 'Garantia e Atendimento',
    lead:
      'Garantia legal por vício do produto (CDC) é distinta do direito de arrependimento de 7 dias. Aqui explicamos atendimento e encaminhamento.',
    bullets: [
      'Garantia legal: produtos com vício (defeito) têm proteção do Código de Defesa do Consumidor (prazos típicos de 30 ou 90 dias conforme a natureza do bem, e saneamento em até 30 dias quando aplicável). Isso não se confunde com os 7 dias de arrependimento.',
      'Garantia de fabricante, quando existir, complementa e não substitui a garantia legal. A FAL não “empurra” o consumidor só ao fabricante: abra o caso no pedido para análise e orientação.',
      'Para vício, incompatibilidade alegada após uso, ou dano no transporte: use “Problema com meu pedido” na conta, com fotos/notas quando possível.',
      'Atendimento eletrônico: a Central de Suporte e o WhatsApp oficiais são canais da loja. A FAL busca responder demandas de atendimento eletrônico em até 5 dias úteis (Decreto 7.962/2013), sem prejuízo de prazos legais mais favoráveis.',
      'Horários e e-mail institucionais adicionais serão publicados quando disponíveis — não inventamos canais. Use o rodapé e a Central.',
      'Reembolsos por garantia/vício seguem análise e, quando devidos, o mesmo meio de pagamento quando possível.',
      'Peças de desgaste natural, mau uso, instalação inadequada ou adulteração podem ser indeferidas após análise fundamentada.',
    ],
    related: [
      { to: '/trocas-devolucoes', label: 'Trocas e devoluções' },
      { to: '/compatibilidade', label: 'Compatibilidade' },
    ],
  },
  compatibilidade: {
    title: 'Compatibilidade e Aplicação',
    lead:
      'A FAL informa aplicações veiculares com base em dados técnicos e no que você seleciona (busca por veículo / Minha Garagem). Entenda os limites.',
    bullets: [
      'Compatibilidade “confirmada” ou equivalente só é apresentada quando o motor técnico da loja encontra evidência suficiente para o veículo informado. Sem evidência, a FAL não afirma compatibilidade plena.',
      'Placa, modelo aproximado ou dados incompletos podem gerar resultado limitado — complete ano/motor/versão quando solicitado.',
      'Aplicações de catálogo e equivalentes são referência; variações de chassi, reprogramação, kits ou modificações podem alterar o encaixe real.',
      'A responsabilidade de conferir a peça no veículo antes da instalação é do comprador/mecânico. Em dúvida, abra atendimento antes de instalar.',
      'Se a peça não servir por incompatibilidade sem uso indevido, use o fluxo de Problema no pedido (Trocas) dentro dos prazos e condições aplicáveis — a loja analisa caso a caso.',
      'Kits: a compatibilidade pode depender de todos os componentes; devoluções parciais de kit passam por análise do operador (sem auto-aprovação).',
      'Imagens e descrições ilustram o produto; divergências estéticas menores não configuram por si só defeito.',
    ],
    related: [
      { to: '/trocas-devolucoes', label: 'Trocas e devoluções' },
      { to: '/garantia', label: 'Garantia' },
      { to: '/veiculo', label: 'Busca por veículo' },
    ],
  },
}
