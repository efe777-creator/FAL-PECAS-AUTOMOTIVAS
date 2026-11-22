import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { LEGAL_POLICY_CARDS } from '@/lib/legalVersions'
import { activeSupportChannel } from '@/services/support/supportChannel'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const PILLARS = [
  {
    title: 'Segurança',
    text: 'Compra com canais oficiais, dados tratados com cuidado e fluxos auditáveis na conta.',
  },
  {
    title: 'Confiança',
    text: 'Políticas claras, pós-venda no próprio pedido e sem empurrar o cliente para atalhos opacos.',
  },
  {
    title: 'Tecnologia',
    text: 'Compatibilidade, catálogo e logística integrados para reduzir erro de peça e de envio.',
  },
  {
    title: 'Transparência',
    text: 'Versões documentadas, preços e frete no checkout, e status do pedido acompanháveis.',
  },
  {
    title: 'Responsabilidade',
    text: 'Respeito ao CDC/LGPD no que a loja controla; sem promessas que a operação não cumpre.',
  },
] as const

export function SupportPage() {
  useDocumentTitle('Central de Suporte | FAL Peças Automotivas')
  const [subject, setSubject] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = activeSupportChannel.send({ subject, orderNumber, message })
    if (!result.ok) {
      setError(result.error)
      return
    }
    window.open(result.href, '_blank', 'noopener,noreferrer')
  }

  return (
    <Container className="py-8 sm:py-10">
      <p className="mb-4 text-sm text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        {' / '}
        <span className="text-fal-ink">Suporte</span>
      </p>

      <h1 className="m-0 text-[28px] font-black text-fal-navy dark:text-fal-fg sm:text-[32px]">
        Central de Suporte
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-fal-muted sm:text-base">
        Políticas da loja, nosso compromisso e atendimento. Para problema em pedido já feito, use
        também “Problema com meu pedido” na sua conta.
      </p>

      {/* Seção 1 */}
      <section className="mt-10" aria-labelledby="suporte-politicas">
        <h2 id="suporte-politicas" className="m-0 text-xl font-extrabold text-fal-fg">
          Termos e Políticas
        </h2>
        <p className="mt-1 mb-4 text-sm text-fal-muted">
          Documentos completos em páginas próprias — versão e data em cada card.
        </p>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {LEGAL_POLICY_CARDS.map((card) => (
            <li
              key={card.kind}
              className="rounded-fal border border-fal-line bg-fal-surface p-5"
            >
              <h3 className="m-0 text-base font-extrabold text-fal-fg">{card.title}</h3>
              <p className="mt-1 mb-0 text-sm text-fal-muted">{card.description}</p>
              <p className="mt-2 mb-3 text-xs font-semibold tracking-wide text-fal-muted uppercase">
                Versão {card.version}
              </p>
              <Link
                to={card.path}
                className="text-sm font-bold text-fal-navy dark:text-fal-fg hover:underline"
              >
                Ver documento →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Seção 2 */}
      <section className="mt-12" aria-labelledby="suporte-compromisso">
        <h2 id="suporte-compromisso" className="m-0 text-xl font-extrabold text-fal-fg">
          Nosso Compromisso
        </h2>
        <div className="mt-4 rounded-fal border border-fal-line bg-fal-surface p-5">
          <p className="m-0 max-w-2xl text-sm text-fal-ink sm:text-base">
            A FAL Peças Automotivas busca oferecer peça certa, compra clara e pós-venda no mesmo
            ambiente do pedido — com seriedade de loja especializada, sem fingir porte de gigante
            nem prometer o que a operação não sustenta.
          </p>
          <ul className="mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <li key={p.title}>
                <p className="m-0 text-sm font-extrabold text-fal-fg">{p.title}</p>
                <p className="mt-1 mb-0 text-sm text-fal-muted">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Seção 3 */}
      <section className="mt-12" aria-labelledby="suporte-atendimento">
        <h2 id="suporte-atendimento" className="m-0 text-xl font-extrabold text-fal-fg">
          Atendimento e Suporte
        </h2>
        <p className="mt-1 mb-4 text-sm text-fal-muted">
          Preencha o formulário. O envio abre o WhatsApp oficial da loja com sua mensagem (canal
          atual). Buscamos responder demandas de atendimento eletrônico em até 5 dias úteis.
        </p>
        <form
          onSubmit={onSubmit}
          className="max-w-xl space-y-4 rounded-fal border border-fal-line bg-fal-surface p-5"
          noValidate
        >
          <div>
            <label htmlFor="support-subject" className="block text-sm font-semibold text-fal-fg">
              Assunto
            </label>
            <input
              id="support-subject"
              name="subject"
              className="mt-1 w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-sm text-fal-ink"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="support-order" className="block text-sm font-semibold text-fal-fg">
              Nº do pedido <span className="font-normal text-fal-muted">(opcional)</span>
            </label>
            <input
              id="support-order"
              name="orderNumber"
              className="mt-1 w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-sm text-fal-ink"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="support-message" className="block text-sm font-semibold text-fal-fg">
              Mensagem
            </label>
            <textarea
              id="support-message"
              name="message"
              rows={5}
              className="mt-1 w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-sm text-fal-ink"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="m-0 text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Abrir WhatsApp com a mensagem
            </Button>
            <Link
              to="/conta/pedidos"
              className="inline-flex items-center text-sm font-semibold text-fal-navy dark:text-fal-fg hover:underline"
            >
              Ir para Meus Pedidos
            </Link>
          </div>
        </form>
      </section>
    </Container>
  )
}
