import { Container } from '@/components/layout/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type LegalDocKind, legalVersionFor } from '@/lib/legalVersions'
import { getStoreIdentity } from '@/lib/storeIdentity'
import { Link } from 'react-router-dom'

const COPY: Record<
  LegalDocKind,
  { title: string; lead: string; bullets: string[] }
> = {
  termos: {
    title: 'Termos de uso',
    lead: 'Estas condições regem o uso da loja online da FAL Peças Automotivas.',
    bullets: [
      'O catálogo e os preços podem mudar sem aviso prévio até a confirmação do pedido.',
      'Pedidos dependem de disponibilidade de estoque e de aprovação do pagamento.',
      'Dados cadastrais devem ser verdadeiros; uso indevido pode resultar em bloqueio da conta.',
      'Frete, prazos e formas de envio seguem as opções apresentadas no checkout.',
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    lead: 'Tratamos dados pessoais para operar a loja, entregar pedidos e cumprir obrigações legais.',
    bullets: [
      'Coletamos dados de cadastro, pedidos, endereço e comunicação necessários à compra.',
      'Usamos cookies e armazenamento local essenciais (sessão, carrinho, segurança). Não vendemos dados para marketing.',
      'Parceiros de pagamento e frete recebem apenas o necessário para processar a compra.',
      'Você pode solicitar correção ou exclusão de conta pelos canais de atendimento da loja (WhatsApp ou e-mail do rodapé).',
    ],
  },
  'trocas-devolucoes': {
    title: 'Trocas e devoluções',
    lead: 'Canal oficial de pós-venda da loja online — peça com nota e número do pedido em mãos.',
    bullets: [
      'Direito de arrependimento (CDC): em compras online, você pode desistir em até 7 dias corridos do recebimento, com a peça sem uso e na embalagem original sempre que possível.',
      'Para iniciar troca, devolução ou reclamação, use o WhatsApp da loja (rodapé ou “Falar sobre este pedido” na sua conta) informando o número do pedido.',
      'Peças instaladas, danificadas por mau uso ou com identificação removida podem não ser aceitas — a loja analisa caso a caso.',
      'Garantia legal do produto (vícios) segue o Código de Defesa do Consumidor; a loja orienta o encaminhamento após abertura pelo WhatsApp.',
      'Reembolsos, quando devidos, seguem o mesmo meio de pagamento quando possível, após conferência da mercadoria.',
    ],
  },
}

export function LegalDocumentPage({ kind }: { kind: LegalDocKind }) {
  const doc = COPY[kind]
  const store = getStoreIdentity()
  const version = legalVersionFor(kind)
  useDocumentTitle(`${doc.title} | FAL Peças Automotivas`)

  return (
    <Container className="py-8 sm:py-10">
      <p className="mb-4 text-sm text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        {' / '}
        <span className="text-fal-ink">{doc.title}</span>
      </p>
      <h1 className="m-0 text-[28px] font-black text-fal-navy sm:text-[32px]">{doc.title}</h1>
      <p className="mt-2 text-xs font-semibold tracking-wide text-fal-muted uppercase">
        Versão {version}
      </p>
      <p className="mt-3 max-w-2xl text-sm text-fal-muted sm:text-base">{doc.lead}</p>
      <ul className="mt-6 max-w-2xl list-disc space-y-2 pl-5 text-sm text-fal-ink sm:text-base">
        {doc.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl text-sm text-fal-muted">
        Dúvidas: use o WhatsApp ou o e-mail indicados no rodapé
        {store.email ? (
          <>
            {' '}
            (
            <a className="font-semibold text-fal-navy hover:underline" href={`mailto:${store.email}`}>
              {store.email}
            </a>
            )
          </>
        ) : null}
        . Documento resumido operacional — versão jurídica completa pode ser publicada pela loja a
        qualquer momento.
      </p>
      {kind !== 'trocas-devolucoes' ? (
        <p className="mt-4 max-w-2xl text-sm">
          <Link
            to="/trocas-devolucoes"
            className="font-semibold text-fal-navy hover:underline"
          >
            Ver política de trocas e devoluções
          </Link>
        </p>
      ) : null}
    </Container>
  )
}

export function TermsPage() {
  return <LegalDocumentPage kind="termos" />
}

export function PrivacyPage() {
  return <LegalDocumentPage kind="privacidade" />
}

export function ReturnsPage() {
  return <LegalDocumentPage kind="trocas-devolucoes" />
}
