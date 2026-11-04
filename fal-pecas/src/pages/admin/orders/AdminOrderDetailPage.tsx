import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import {
  adminOrderNextStep,
  orderEventLabel,
  orderStatusAdminLabel,
} from '@/lib/orderLifecycle'
import {
  adminAdvanceOrder,
  adminCancelOrder,
  adminCompleteSeparation,
  adminDeliverOrder,
  adminFinalizeConfirmation,
  adminGetOrderDetail,
  adminSetItemAvailability,
  adminSetItemSeparated,
  adminShipOrder,
  staffCanCancel,
  type AdminOrderDetail,
  type OrderItemAvailability,
} from '@/services/admin/adminOrderService'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type Draft = {
  availability: OrderItemAvailability | ''
  leadDays: string
  staffNote: string
}

type PendingAction =
  | { kind: 'finalize' }
  | { kind: 'separate' }
  | { kind: 'ship' }
  | { kind: 'deliver' }
  | { kind: 'cancel' }

const PENDING_COPY: Record<PendingAction['kind'], { title: string; body: string }> = {
  finalize: {
    title: 'Finalizar confirmação?',
    body: 'O pedido avançará com base nas disponibilidades salvas nos itens.',
  },
  separate: {
    title: 'Concluir separação?',
    body: 'Todos os itens devem estar marcados como separados.',
  },
  ship: {
    title: 'Registrar expedição?',
    body: 'O pedido será marcado como enviado e o estoque será baixado (modo com_estoque).',
  },
  deliver: {
    title: 'Confirmar entrega?',
    body: 'O pedido será encerrado como entregue.',
  },
  cancel: {
    title: 'Cancelar pedido?',
    body: 'Informe o motivo. Somente gerente/administrador. A reserva será liberada se houver.',
  },
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [carrier, setCarrier] = useState('')
  const [service, setService] = useState('')
  const [tracking, setTracking] = useState('')
  const [proofRef, setProofRef] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [cancelNote, setCancelNote] = useState('')

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [d, cancel] = await Promise.all([adminGetOrderDetail(id), staffCanCancel()])
      setOrder(d)
      setCanCancel(cancel)
      if (d) {
        const next: Record<string, Draft> = {}
        for (const it of d.items) {
          next[it.id] = {
            availability: it.availability ?? '',
            leadDays: it.leadDays != null ? String(it.leadDays) : '',
            staffNote: it.staffNote ?? '',
          }
        }
        setDrafts(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function saveItem(itemId: string) {
    const d = drafts[itemId]
    if (!d?.availability) {
      setError('Selecione a disponibilidade')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminSetItemAvailability({
        orderItemId: itemId,
        availability: d.availability,
        leadDays: d.availability === 'disponivel_com_prazo' ? Number(d.leadDays) : null,
        staffNote: d.staffNote || null,
      })
      setMsg('Disponibilidade salva')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar item')
    } finally {
      setBusy(false)
    }
  }

  async function runFinalize() {
    setBusy(true)
    setError(null)
    try {
      const r = await adminFinalizeConfirmation(id)
      setMsg(`Resultado: ${r.result} → ${orderStatusAdminLabel[r.status] ?? r.status}`)
      setPending(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao finalizar')
    } finally {
      setBusy(false)
    }
  }

  async function runCancel() {
    const note = cancelNote.trim() || 'Cancelamento administrativo'
    setBusy(true)
    setError(null)
    try {
      await adminCancelOrder(id, note)
      setMsg('Pedido cancelado')
      setPending(null)
      setCancelNote('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao cancelar')
    } finally {
      setBusy(false)
    }
  }

  async function toggleSeparated(itemId: string, separated: boolean) {
    setBusy(true)
    setError(null)
    try {
      await adminSetItemSeparated(itemId, separated)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao marcar separação')
    } finally {
      setBusy(false)
    }
  }

  async function runCompleteSeparation() {
    setBusy(true)
    setError(null)
    try {
      await adminCompleteSeparation(id)
      setMsg('Separação concluída')
      setPending(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na separação')
    } finally {
      setBusy(false)
    }
  }

  async function runShip() {
    setBusy(true)
    setError(null)
    try {
      await adminShipOrder({
        orderId: id,
        carrier: carrier || undefined,
        service: service || undefined,
        trackingCode: tracking || undefined,
      })
      setMsg('Pedido expedido')
      setPending(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na expedição')
    } finally {
      setBusy(false)
    }
  }

  async function runDeliver() {
    setBusy(true)
    setError(null)
    try {
      await adminDeliverOrder(id, proofRef || undefined)
      setMsg('Pedido entregue')
      setPending(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na entrega')
    } finally {
      setBusy(false)
    }
  }

  function confirmPending() {
    if (!pending) return
    if (pending.kind === 'finalize') void runFinalize()
    else if (pending.kind === 'separate') void runCompleteSeparation()
    else if (pending.kind === 'ship') void runShip()
    else if (pending.kind === 'deliver') void runDeliver()
    else if (pending.kind === 'cancel') void runCancel()
  }

  if (loading) return <Loading label="Carregando pedido…" />
  if (!order) {
    return (
      <p className="text-red-600">
        Pedido não encontrado. <Link to="/admin/pedidos">Voltar</Link>
      </p>
    )
  }

  const current = order
  const addr = current.addressSnapshot
  const needsReception =
    current.status === 'pagamento_aprovado' || current.status === 'recebido'
  const inAnalysis = ['em_analise', 'aguardando_disponibilidade', 'aguardando_decisao'].includes(
    current.status,
  )
  const inSeparation = current.status === 'confirmado' || current.status === 'em_separacao'
  const separatedCount = current.items.filter((it) => it.separated).length
  const allSeparated = current.items.length > 0 && separatedCount === current.items.length
  const nextStep = adminOrderNextStep(current.status)

  async function markAllSeparated() {
    const pendingItems = current.items.filter((it) => !it.separated)
    if (pendingItems.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const it of pendingItems) {
        await adminSetItemSeparated(it.id, true)
      }
      setMsg(`${pendingItems.length} item(ns) marcado(s) como separado(s).`)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao marcar separação')
    } finally {
      setBusy(false)
    }
  }

  async function startConfirmation() {
    setBusy(true)
    setError(null)
    try {
      let st = current.status
      if (st === 'pagamento_aprovado') {
        await adminAdvanceOrder(current.id, 'recebido', 'Recepção operacional', 'order_received')
        st = 'recebido'
      }
      if (st === 'recebido') {
        await adminAdvanceOrder(
          current.id,
          'em_analise',
          'Início da análise de disponibilidade',
          'confirmation_started',
        )
      }
      setMsg('Análise iniciada')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao iniciar análise')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to="/admin/pedidos" className="text-sm font-semibold text-fal-navy underline">
          ← Pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-fal-navy">
          Pedido {order.id.slice(0, 8)}…
        </h1>
        <p className="text-sm text-fal-muted">
          {formatDateTime(order.createdAt)} · {orderStatusAdminLabel[order.status] ?? order.status}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}

      {nextStep ? (
        <section className="rounded-[14px] border border-fal-yellow-dark/40 bg-fal-yellow/15 px-4 py-3">
          <h2 className="m-0 text-base font-extrabold text-fal-navy">Próximo passo: {nextStep.title}</h2>
          <p className="mt-1 mb-0 text-sm text-fal-muted">{nextStep.body}</p>
          {inSeparation ? (
            <p className="mt-2 mb-0 text-sm font-semibold text-fal-navy">
              Separação: {separatedCount}/{order.items.length} item(ns)
            </p>
          ) : null}
        </section>
      ) : null}

      {pending ? (
        <section className="rounded-[14px] border border-fal-navy/30 bg-[#f7f9fc] p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">
            {PENDING_COPY[pending.kind].title}
          </h2>
          <p className="mt-1 mb-3 text-sm text-fal-muted">{PENDING_COPY[pending.kind].body}</p>
          {pending.kind === 'cancel' ? (
            <Input
              label="Motivo do cancelamento"
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Ex.: item indisponível / pedido duplicado"
            />
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => confirmPending()}>
              Confirmar
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => {
                setPending(null)
                setCancelNote('')
              }}
            >
              Voltar
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Cliente</h2>
          <p className="mb-0 mt-2 text-sm">
            <strong>{order.customerName ?? '—'}</strong>
            <br />
            Usuário: {order.customerEmail ?? '—'}
            <br />
            Documento: {order.customerDoc ?? '—'}
          </p>
        </section>
        <section className="rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Endereço / frete / pagamento</h2>
          <p className="mb-0 mt-2 text-sm whitespace-pre-wrap">
            {addr
              ? [
                  addr.street,
                  addr.number,
                  addr.complement,
                  addr.district,
                  addr.city,
                  addr.state,
                  addr.cep ?? addr.zip,
                ]
                  .filter(Boolean)
                  .join(', ')
              : '—'}
          </p>
          <p className="mt-2 mb-0 text-sm">
            Frete: {formatMoney(order.shippingAmount)} · Pagamento:{' '}
            {order.payment?.status ?? order.paymentRef ?? '—'} ({order.payment?.provider ?? '—'})
            {order.payment?.method ? ` · ${order.payment.method}` : ''}
          </p>
          {order.payment?.expiresAt ? (
            <p className="mt-1 mb-0 text-xs text-fal-muted">
              Expira: {new Date(order.payment.expiresAt).toLocaleString('pt-BR')}
              {order.payment.externalRef ? ` · Ref MP: ${order.payment.externalRef}` : ''}
            </p>
          ) : order.payment?.externalRef ? (
            <p className="mt-1 mb-0 text-xs text-fal-muted">Ref MP: {order.payment.externalRef}</p>
          ) : null}
          <p className="mt-1 mb-0 text-sm font-semibold">
            Subtotal {formatMoney(order.subtotal)} · Total {formatMoney(order.total)}
          </p>
        </section>
      </div>

      <section className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Itens (snapshot do pedido)</h2>
        <div className="mt-3 space-y-4">
          {order.items.map((it) => {
            const d = drafts[it.id] ?? { availability: '', leadDays: '', staffNote: '' }
            return (
              <div key={it.id} className="rounded-[12px] border border-fal-line p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-fal-navy">{it.nameSnapshot}</div>
                    <div className="text-xs text-fal-muted">
                      SKU {it.sku} · qtd {it.quantity} · {formatMoney(it.unitPrice)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {formatMoney(it.unitPrice * it.quantity)}
                  </div>
                </div>
                {inAnalysis ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-4">
                    <label className="block text-sm md:col-span-1">
                      <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                        Disponibilidade
                      </span>
                      <select
                        className="w-full rounded-[9px] border border-fal-line px-3 py-2"
                        value={d.availability}
                        disabled={busy}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [it.id]: {
                              ...d,
                              availability: e.target.value as OrderItemAvailability | '',
                            },
                          }))
                        }
                      >
                        <option value="">—</option>
                        <option value="disponivel">Disponível</option>
                        <option value="disponivel_com_prazo">Disponível com prazo</option>
                        <option value="indisponivel">Indisponível</option>
                      </select>
                    </label>
                    <Input
                      label="Prazo (dias)"
                      type="number"
                      min={1}
                      disabled={busy || d.availability !== 'disponivel_com_prazo'}
                      value={d.leadDays}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [it.id]: { ...d, leadDays: e.target.value },
                        }))
                      }
                    />
                    <Input
                      label="Obs. interna"
                      value={d.staffNote}
                      disabled={busy}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [it.id]: { ...d, staffNote: e.target.value },
                        }))
                      }
                    />
                    <div className="flex items-end">
                      <Button type="button" disabled={busy} onClick={() => void saveItem(it.id)}>
                        Salvar item
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 mb-0 text-sm text-fal-muted">
                    Disponibilidade: {it.availability ?? '—'}
                    {it.leadDays != null ? ` · ${it.leadDays} dia(s)` : ''}
                    {it.staffNote ? ` · ${it.staffNote}` : ''}
                  </p>
                )}
                {inSeparation ? (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(it.separated)}
                      disabled={busy}
                      onChange={(e) => void toggleSeparated(it.id, e.target.checked)}
                    />
                    Item separado
                  </label>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {needsReception ? (
          <Button
            type="button"
            disabled={busy || pending != null}
            onClick={() => void startConfirmation()}
          >
            Iniciar análise
          </Button>
        ) : null}
        {inAnalysis ? (
          <Button type="button" disabled={busy || pending != null} onClick={() => setPending({ kind: 'finalize' })}>
            Finalizar confirmação
          </Button>
        ) : null}
        {inSeparation ? (
          <>
            <Button
              type="button"
              variant="light"
              disabled={busy || pending != null || allSeparated}
              onClick={() => void markAllSeparated()}
            >
              Marcar todos separados
            </Button>
            <Button
              type="button"
              disabled={busy || pending != null || !allSeparated}
              onClick={() => setPending({ kind: 'separate' })}
              title={!allSeparated ? 'Separe todos os itens antes de concluir' : undefined}
            >
              Concluir separação
            </Button>
          </>
        ) : null}
        {canCancel &&
        (order.status === 'aguardando_decisao' || order.status === 'aguardando_pagamento') ? (
          <Button
            type="button"
            variant="light"
            disabled={busy || pending != null}
            onClick={() => setPending({ kind: 'cancel' })}
          >
            {order.status === 'aguardando_pagamento'
              ? 'Cancelar pedido não pago'
              : 'Cancelar pedido'}
          </Button>
        ) : null}
        {!canCancel &&
        (order.status === 'aguardando_decisao' || order.status === 'aguardando_pagamento') ? (
          <span className="self-center text-xs text-fal-muted">
            Cancelamento apenas para gerente/administrador.
          </span>
        ) : null}
        {order.status === 'aguardando_pagamento' ? (
          <span className="self-center text-xs text-fal-muted">
            Cliente ainda pode retomar Pix/cartão em Meus pedidos até cancelar ou aprovar.
          </span>
        ) : null}
      </div>

      {order.status === 'pronto_para_envio' || order.status === 'preparando_envio' ? (
        <section className="rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Expedição</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <Input label="Transportadora" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <Input label="Serviço" value={service} onChange={(e) => setService(e.target.value)} />
            <Input label="Rastreio" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            <div className="flex items-end">
              <Button
                type="button"
                disabled={busy || pending != null}
                onClick={() => setPending({ kind: 'ship' })}
              >
                Registrar envio
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {order.status === 'enviado' ? (
        <section className="rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Entrega</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Input
              label="Comprovante (ref. opcional)"
              value={proofRef}
              onChange={(e) => setProofRef(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                type="button"
                disabled={busy || pending != null}
                onClick={() => setPending({ kind: 'deliver' })}
              >
                Confirmar entrega
              </Button>
            </div>
          </div>
          {order.shipment?.trackingCode ? (
            <p className="mt-2 mb-0 text-sm text-fal-muted">
              Rastreio: {order.shipment.trackingCode}
              {order.shipment.carrier ? ` · ${order.shipment.carrier}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Eventos</h2>
        <ul className="mt-2 mb-0 list-none space-y-2 p-0">
          {order.events.length === 0 ? (
            <li className="text-sm text-fal-muted">Sem eventos.</li>
          ) : (
            order.events.map((e) => (
              <li key={e.id} className="rounded-[10px] bg-fal-bg px-3 py-2 text-sm">
                <span className="font-semibold">
                  {orderEventLabel[e.eventType] ?? e.eventType}
                </span>{' '}
                <span className="text-xs text-fal-muted">
                  ({e.visibility}) · {formatDateTime(e.createdAt)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
