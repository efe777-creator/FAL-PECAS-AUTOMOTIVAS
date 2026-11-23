import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Container } from '@/components/layout/Container'
import { SupportCenterShell } from '@/components/support/SupportCenterShell'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { LEGAL_POLICY_CARDS } from '@/lib/legalVersions'
import { formatMoney } from '@/lib/money'
import { motiveRequiresPolicyAck } from '@/lib/postSaleMotives'
import { RETURN_POLICY_ACK_LABEL } from '@/lib/returnPolicyCopy'
import {
  SUPPORT_SUBJECTS,
  findSupportSubject,
  resolveSupportSubjectLabel,
} from '@/lib/supportSubjects'
import { getCustomerProfile } from '@/services/customers/customerService'
import { listMyOrders } from '@/services/customers/orderQueryService'
import { customerReportDeliveryIssue } from '@/services/orders/customerOrderActions'
import { activeSupportChannel } from '@/services/support/supportChannel'
import type { CustomerOrderSummary } from '@/types'
import { useEffect, useMemo, useState } from 'react'
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

function shortOrderId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function orderOptionLabel(o: CustomerOrderSummary): string {
  const date = o.createdAt
    ? new Date(o.createdAt).toLocaleDateString('pt-BR')
    : '—'
  return `${shortOrderId(o.id)} · ${date} · ${o.status} · ${formatMoney(o.total)}`
}

export function SupportPage() {
  useDocumentTitle('Central de Suporte | FAL Peças Automotivas')
  const { user, loading: authLoading } = useAuth()

  const [subjectCode, setSubjectCode] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [orderId, setOrderId] = useState('')
  const [message, setMessage] = useState('')
  const [policyAck, setPolicyAck] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profilePhone, setProfilePhone] = useState<string | null>(null)

  const subject = useMemo(
    () => (subjectCode ? findSupportSubject(subjectCode) : undefined),
    [subjectCode],
  )
  const requiresOrder = Boolean(subject?.requiresOrder)
  const needsCustom = Boolean(subject?.needsCustomLabel)
  const needsAck = Boolean(
    subject?.motivoCode && motiveRequiresPolicyAck(subject.motivoCode),
  )

  useEffect(() => {
    if (!user) {
      setOrders([])
      setProfileName(null)
      setProfilePhone(null)
      return
    }
    let cancelled = false
    setOrdersLoading(true)
    void (async () => {
      try {
        const [list, profileRes] = await Promise.all([
          listMyOrders(),
          getCustomerProfile(user.id),
        ])
        if (cancelled) return
        setOrders(list)
        setProfileName(profileRes.profile.fullName ?? null)
        setProfilePhone(profileRes.profile.phone ?? null)
      } catch {
        if (!cancelled) {
          setOrders([])
        }
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!requiresOrder) {
      // Mantém seleção opcional em assuntos gerais; não limpa automaticamente
      // se o usuário já escolheu um pedido — só limpa ack.
      setPolicyAck(false)
    }
  }, [requiresOrder])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!user) {
      setError('Entre na conta para abrir atendimento.')
      return
    }
    if (!subject) {
      setError('Selecione o assunto.')
      return
    }
    if (needsCustom && !customSubject.trim()) {
      setError('Descreva o assunto em “Outro”.')
      return
    }
    if (requiresOrder && !orderId) {
      setError('Selecione o pedido relacionado.')
      return
    }
    if (needsAck && !policyAck) {
      setError('Confirme que leu as condições de devolução.')
      return
    }
    if (!message.trim()) {
      setError('Descreva sua mensagem.')
      return
    }

    const subjectLabel = resolveSupportSubjectLabel(subject, customSubject)
    const reasonParts = [`[Central] ${subjectLabel}`, message.trim()]
    const reason = reasonParts.join('\n\n')

    setBusy(true)
    try {
      let registeredPostSale = false
      if (subject.kind === 'post_sale' && orderId && subject.motivoCode) {
        await customerReportDeliveryIssue(orderId, {
          reason,
          motivoCode: subject.motivoCode,
          scope: 'order',
          policyAck: needsAck ? policyAck : false,
        })
        registeredPostSale = true
      }

      const channelResult = activeSupportChannel.send({
        subject: subjectLabel,
        subjectCode: subject.code,
        orderNumber: orderId || undefined,
        message: message.trim(),
        customerName: profileName ?? undefined,
        customerEmail: user.email ?? undefined,
        customerPhone: profilePhone ?? undefined,
      })
      if (!channelResult.ok) {
        setError(channelResult.error)
        return
      }
      window.open(channelResult.href, '_blank', 'noopener,noreferrer')
      setSuccess(
        registeredPostSale
          ? 'Registramos o atendimento neste pedido. A loja analisa e trata — acompanhe em Meus Pedidos.'
          : 'Mensagem pronta no WhatsApp oficial da loja.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o atendimento.')
    } finally {
      setBusy(false)
    }
  }

  const panelPoliticas = (
    <section
      className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-6"
      aria-labelledby="suporte-politicas-heading"
    >
      <p className="m-0 text-[11px] font-extrabold tracking-[0.12em] text-fal-muted uppercase">
        Tela · Políticas
      </p>
      <h2
        id="suporte-politicas-heading"
        className="mt-1 mb-0 text-xl font-extrabold text-fal-navy dark:text-fal-fg sm:text-[22px]"
      >
        Termos e Políticas
      </h2>
      <p className="mt-1.5 mb-5 max-w-2xl text-sm text-fal-muted">
        Documentos completos em páginas próprias — versão em cada item.
      </p>
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
        {LEGAL_POLICY_CARDS.map((card) => (
          <li key={card.kind}>
            <Link
              to={card.path}
              className="group flex h-full flex-col rounded-fal border border-fal-line bg-fal-bg px-4 py-3.5 transition hover:border-fal-yellow hover:bg-fal-surface-2"
            >
              <span className="text-sm font-extrabold text-fal-fg group-hover:text-fal-navy dark:group-hover:text-fal-fg">
                {card.title}
              </span>
              <span className="mt-1 flex-1 text-sm text-fal-muted">{card.description}</span>
              <span className="mt-2 text-xs font-semibold tracking-wide text-fal-muted uppercase">
                Versão {card.version}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )

  const panelCompromisso = (
    <section
      className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-6"
      aria-labelledby="suporte-compromisso-heading"
    >
      <p className="m-0 text-[11px] font-extrabold tracking-[0.12em] text-fal-muted uppercase">
        Tela · Compromisso
      </p>
      <h2
        id="suporte-compromisso-heading"
        className="mt-1 mb-0 text-xl font-extrabold text-fal-navy dark:text-fal-fg sm:text-[22px]"
      >
        Nosso Compromisso
      </h2>
      <p className="mt-1.5 mb-5 max-w-2xl text-sm text-fal-muted">
        Peça certa, compra clara e pós-venda no mesmo ambiente do pedido.
      </p>
      <div className="rounded-fal border border-fal-line bg-fal-bg p-5 sm:p-6">
        <p className="m-0 max-w-2xl text-sm leading-relaxed text-fal-ink sm:text-base">
          A FAL Peças Automotivas busca oferecer peça certa, compra clara e pós-venda no mesmo
          ambiente do pedido — com seriedade de loja especializada, sem fingir porte de gigante nem
          prometer o que a operação não sustenta.
        </p>
        <ul className="mt-6 grid list-none grid-cols-1 gap-5 border-t border-fal-line p-0 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <li key={p.title}>
              <p className="m-0 text-sm font-extrabold text-fal-navy dark:text-fal-fg">{p.title}</p>
              <p className="mt-1 mb-0 text-sm leading-snug text-fal-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )

  const panelAtendimento = (
    <section
      className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-6"
      aria-labelledby="suporte-atendimento-heading"
    >
      <p className="m-0 text-[11px] font-extrabold tracking-[0.12em] text-fal-muted uppercase">
        Tela · Atendimento
      </p>
      <h2
        id="suporte-atendimento-heading"
        className="mt-1 mb-0 text-xl font-extrabold text-fal-navy dark:text-fal-fg sm:text-[22px]"
      >
        Atendimento e Suporte
      </h2>
      <p className="mt-1.5 mb-5 max-w-2xl text-sm text-fal-muted">
        Assunto tipado, pedido da conta quando for pós-venda, e mensagem. O envio registra o caso no
        pedido (quando aplicável) e abre o WhatsApp oficial. Buscamos responder demandas de
        atendimento eletrônico em até 5 dias úteis.
      </p>

          {authLoading ? (
            <p className="m-0 text-sm text-fal-muted">Carregando sessão…</p>
          ) : !user ? (
            <div className="max-w-xl rounded-fal border border-fal-line bg-fal-surface p-5">
              <p className="m-0 text-sm text-fal-ink">
                Entre na conta para abrir atendimento com seus dados e pedidos.
              </p>
              <ButtonLink
                to="/login"
                state={{ from: '/suporte' }}
                variant="primary"
                className="mt-4"
              >
                Entrar para abrir atendimento
              </ButtonLink>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="max-w-xl space-y-4 rounded-fal border border-fal-line bg-fal-surface p-5"
              noValidate
            >
              <div className="rounded-fal border border-fal-line bg-fal-bg p-3 text-sm">
                <p className="m-0 font-semibold text-fal-fg">Seus dados</p>
                <p className="mt-1 mb-0 text-fal-muted">
                  {profileName || '—'}
                  {user.email ? ` · ${user.email}` : ''}
                  {profilePhone ? ` · ${profilePhone}` : ''}
                </p>
              </div>

              <div>
                <label htmlFor="support-subject" className="block text-sm font-semibold text-fal-fg">
                  Assunto
                </label>
                <select
                  id="support-subject"
                  name="subject"
                  className="mt-1 w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-sm text-fal-ink"
                  value={subjectCode}
                  onChange={(e) => {
                    setSubjectCode(e.target.value)
                    setCustomSubject('')
                    setPolicyAck(false)
                    setError(null)
                    setSuccess(null)
                  }}
                  required
                >
                  <option value="">Selecione…</option>
                  <optgroup label="Pedido / pós-venda">
                    {SUPPORT_SUBJECTS.filter((s) => s.kind === 'post_sale').map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Geral">
                    {SUPPORT_SUBJECTS.filter((s) => s.kind === 'general').map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {needsCustom ? (
                <div>
                  <label
                    htmlFor="support-subject-custom"
                    className="block text-sm font-semibold text-fal-fg"
                  >
                    Descreva o assunto
                  </label>
                  <input
                    id="support-subject-custom"
                    name="subjectCustom"
                    className="mt-1 w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-sm text-fal-ink"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              ) : null}

              {subject ? (
                <div>
                  <label htmlFor="support-order" className="block text-sm font-semibold text-fal-fg">
                    Pedido
                    {requiresOrder ? null : (
                      <span className="font-normal text-fal-muted"> (opcional)</span>
                    )}
                  </label>
                  <select
                    id="support-order"
                    name="orderId"
                    className="mt-1 w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-sm text-fal-ink"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required={requiresOrder}
                    disabled={ordersLoading}
                  >
                    <option value="">
                      {ordersLoading
                        ? 'Carregando pedidos…'
                        : requiresOrder
                          ? 'Selecione o pedido…'
                          : 'Sem pedido / assunto geral'}
                    </option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {orderOptionLabel(o)}
                      </option>
                    ))}
                  </select>
                  {!ordersLoading && orders.length === 0 ? (
                    <p className="mt-1 mb-0 text-xs text-fal-muted">
                      Nenhum pedido nesta conta.
                      {requiresOrder
                        ? ' Compre ou use outro canal se ainda não houver pedido.'
                        : null}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {needsAck ? (
                <div className="space-y-2 rounded-fal border border-fal-line bg-fal-bg p-3">
                  <p className="m-0 text-xs text-fal-muted">
                    Leia as{' '}
                    <Link to="/trocas-devolucoes" className="font-semibold underline">
                      condições de trocas e devoluções
                    </Link>
                    .
                  </p>
                  <label className="flex items-start gap-2 text-sm text-fal-ink">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={policyAck}
                      onChange={(e) => setPolicyAck(e.target.checked)}
                    />
                    <span>{RETURN_POLICY_ACK_LABEL}</span>
                  </label>
                </div>
              ) : null}

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
              {success ? (
                <p role="status" className="m-0 text-sm font-semibold text-fal-fg">
                  {success}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={busy}>
                  {busy ? 'Enviando…' : 'Registrar e abrir WhatsApp'}
                </Button>
                <Link
                  to="/conta/pedidos"
                  className="inline-flex items-center text-sm font-semibold text-fal-navy dark:text-fal-fg hover:underline"
                >
                  Ir para Meus Pedidos
                </Link>
              </div>
            </form>
          )}
    </section>
  )

  return (
    <Container className="py-8 sm:py-10">
      <SupportCenterShell
        panels={{
          'suporte-politicas': panelPoliticas,
          'suporte-compromisso': panelCompromisso,
          'suporte-atendimento': panelAtendimento,
        }}
      />
    </Container>
  )
}
