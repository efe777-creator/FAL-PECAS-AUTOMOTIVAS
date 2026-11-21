import { AdminOrderExpeditionSlot } from '@/components/admin/orders/AdminOrderExpeditionSlot'
import { OrderAnalysisResolutionPanel } from '@/components/admin/orders/OrderAnalysisResolutionPanel'
import { PostSaleCaseQuickActions } from '@/components/admin/orders/PostSaleCaseQuickActions'
import { PostSaleReturnLogisticsPanel } from '@/components/admin/orders/PostSaleReturnLogisticsPanel'
import { OrderOpsWizardNav } from '@/components/admin/orders/OrderOpsWizardNav'
import {
  badgeClass,
  toneForOrderStatus,
  toneForPaymentStatus,
} from '@/components/admin/orders/orderStatusTone'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import {
  actionAuthorizeStorePickup,
  actionCancelOrder,
  actionCompleteSeparation,
  actionConfirmStorePickup,
  actionErrorMessage,
  actionFinalizeToSeparation,
  actionHoldForAvailability,
  actionMarkAllSeparated,
  actionRequestCustomerDecision,
  actionSetItemAvailability,
  actionSetItemSeparated,
  actionStartAnalysis,
  actionWithdrawCustomerDecision,
  createOrderOpsActionRunner,
} from '@/lib/orderOpsActions'
import {
  analysisModeFromItems,
  canStaffFinalizeAnalysis,
  finalizeBlockedReason,
  isExpeditionOrLater,
  isInAnalysis,
  isInSeparation,
  isNeedsReception,
} from '@/lib/orderOpsGates'
import {
  resolveOrderOpsPendencia,
  resolveOrderOpsSubstatus,
  statusOperatorLabel,
} from '@/lib/orderOpsTaxonomy'
import {
  ORDER_OPS_WAVE,
  resolveOrderOpsPresentation,
  type OrderOpsActionId,
  type OrderOpsWave,
} from '@/lib/orderOpsSurfacePolicy'
import { openSeparationList } from '@/lib/adminOrderPrint'
import {
  contractedShippingShortLine,
  readContractedShipping,
} from '@/lib/contractedShipping'
import { formatDateTime } from '@/lib/datetime'
import { meLabelState, meLabelStateLabel } from '@/lib/melhorEnvioLabelState'
import { formatMoney } from '@/lib/money'
import { isOrderStorePickup, orderShippingKind, orderUsesMelhorEnvio } from '@/lib/orderShippingKind'
import { buildPostSaleReturnOpsSummary } from '@/lib/postSaleReturnOpsSummary'
import { isStorePickupAuthorized } from '@/lib/storePickupOps'
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/lib/paymentLabels'
import {
  adminGetOrderDetail,
  adminMarkPaymentRefunded,
  adminResolveOrderCancellation,
  adminRestockOrderItemPhysical,
  staffCanCancel,
  type AdminOrderDetail,
  type AdminOrderListRow,
  type OrderItemAvailability,
  type StaffDecisionReasonKind,
} from '@/services/admin/adminOrderService'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type OrderOpsDensity = 'compact' | 'comfortable'

export type OrderOpsSurfaceProps = {
  orderId: string
  density?: OrderOpsDensity
  wave?: OrderOpsWave
  listRow?: AdminOrderListRow | null
  /** Pedido fora do filtro da lista atual (hub). */
  outsideCurrentFilter?: boolean
  onClose?: () => void
  onOpenFull?: () => void
  /** Só altera workspaceMode do Adaptive — não density. */
  onRequestWideMode?: (mode: 'expanded' | 'fullscreen') => void
  /** Após mutação bem-sucedida (lista/widgets). */
  onOrderMutated?: () => void
  /** Espelha o pedido carregado (evita double-fetch no casco full). */
  onOrderChange?: (order: AdminOrderDetail | null) => void
  /** Conteúdo onda 2 / expedição só no casco full (até registry onda 2). */
  renderAfterWave1?: (ctx: {
    order: AdminOrderDetail
    busy: boolean
    reload: () => Promise<void>
    pushOk: (m: string) => void
    pushError: (m: string) => void
  }) => ReactNode
  chromeExtra?: ReactNode
  hideFooter?: boolean
  /** Adaptive já mostra badge no PanelChrome — evita status duplicado. */
  hideStatusHeader?: boolean
}

type SurfaceTab = 'geral' | 'itens' | 'pagamento' | 'logistica'

const SURFACE_TABS: { id: SurfaceTab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'itens', label: 'Itens' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'logistica', label: 'Logística' },
]
type PendingKind = 'finalize' | 'separate' | 'cancel'

type ItemDraft = {
  availability: OrderItemAvailability | ''
  leadDays: string
  staffNote: string
}

const PENDING_COPY: Record<PendingKind, { title: string; body: string }> = {
  finalize: {
    title: 'Confirmar pedido e enviar para separação?',
    body: 'Confirme após conferir os itens. Pedir confirmação ao cliente é opcional.',
  },
  separate: {
    title: 'Concluir separação e enviar para expedição?',
    body: 'Todos os itens a enviar devem estar marcados como separados.',
  },
  cancel: {
    title: 'Cancelar pedido?',
    body: 'Informe o motivo. Somente gerente/administrador.',
  },
}

const ACTION_LABEL: Record<OrderOpsActionId, string> = {
  'start-analysis': 'Iniciar análise',
  'finalize-to-separation': 'Confirmar e enviar à separação',
  'request-customer-decision': 'Solicitar confirmação do cliente',
  'withdraw-customer-decision': 'Retirar solicitação',
  'cancel-order': 'Cancelar pedido',
  'mark-all-separated': 'Marcar todos separados',
  'complete-separation': 'Concluir separação',
  'print-separation': 'Imprimir lista de separação',
  'authorize-store-pickup': 'Autorizar retirada',
  'confirm-store-pickup': 'Cliente retirou',
  'open-full': 'Abrir página completa',
  'copy-id': 'Copiar ID',
}

export function OrderOpsSurface({
  orderId,
  density = 'compact',
  wave = ORDER_OPS_WAVE,
  listRow = null,
  outsideCurrentFilter = false,
  onClose,
  onOpenFull,
  onRequestWideMode: _onRequestWideMode,
  onOrderMutated,
  onOrderChange,
  renderAfterWave1,
  chromeExtra,
  hideFooter = false,
  hideStatusHeader = false,
}: OrderOpsSurfaceProps) {
  const toast = useToast()
  const runnerRef = useRef(createOrderOpsActionRunner())
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [tab, setTab] = useState<SurfaceTab>('geral')
  const [pending, setPending] = useState<PendingKind | null>(null)
  const [cancelNote, setCancelNote] = useState('')
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({})

  const compact = density === 'compact'
  const gap = compact ? 'gap-1.5' : 'gap-2'

  const pushOk = useCallback(
    (message: string) => {
      toast.push(message, 'success')
    },
    [toast],
  )
  const pushError = useCallback(
    (message: string) => {
      toast.push(message, 'error')
    },
    [toast],
  )

  const applyOrder = useCallback(
    (d: AdminOrderDetail | null, cancel: boolean) => {
      setOrder(d)
      setCanCancel(cancel)
      onOrderChange?.(d)
      if (d) {
        const next: Record<string, ItemDraft> = {}
        for (const it of d.items) {
          next[it.id] = {
            availability: it.availability ?? '',
            leadDays: it.leadDays != null ? String(it.leadDays) : '',
            staffNote: it.staffNote ?? '',
          }
        }
        setDrafts(next)
      }
    },
    [onOrderChange],
  )

  const reload = useCallback(async () => {
    const [d, cancel] = await Promise.all([
      adminGetOrderDetail(orderId),
      staffCanCancel(),
    ])
    applyOrder(d, cancel)
  }, [orderId, applyOrder])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setTab('geral')
    setPending(null)
    setCancelNote('')
    void (async () => {
      try {
        const [d, cancel] = await Promise.all([
          adminGetOrderDetail(orderId),
          staffCanCancel(),
        ])
        if (cancelled) return
        applyOrder(d, cancel)
        if (!d) pushError('Pedido não encontrado')
      } catch (e) {
        if (!cancelled) pushError(actionErrorMessage(e, 'Falha ao carregar pedido'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId, pushError, applyOrder])

  const analysisMode = useMemo(
    () =>
      order
        ? analysisModeFromItems(
            order.items.map((i) => ({
              availability: i.availability,
              leadDays: i.leadDays,
            })),
          )
        : 'incomplete',
    [order],
  )

  const presentation = useMemo(() => {
    if (!order) {
      return resolveOrderOpsPresentation({
        status: listRow?.status ?? 'aguardando_pagamento',
        wave,
        canCancel,
      })
    }
    const pickup = isOrderStorePickup(order)
    return resolveOrderOpsPresentation({
      status: order.status,
      customerDecision: order.customerDecision,
      analysisMode,
      shippingKind: orderShippingKind(order),
      storePickup: pickup,
      pickupAuthorized: pickup
        ? isStorePickupAuthorized(order.shipment?.metadata ?? null)
        : false,
      wave,
      canCancel,
    })
  }, [order, listRow, wave, canCancel, analysisMode])

  const substatus = useMemo(
    () =>
      resolveOrderOpsSubstatus({
        status: order?.status ?? listRow?.status ?? '',
        customerDecision: order?.customerDecision,
      }),
    [order, listRow],
  )

  const pendencia = useMemo(() => {
    if (!order) {
      return resolveOrderOpsPendencia({
        status: listRow?.status ?? '',
        customerDecision: listRow?.customerDecision,
      })
    }
    const pickup = isOrderStorePickup(order)
    return resolveOrderOpsPendencia({
      status: order.status,
      customerDecision: order.customerDecision,
      pickup,
      pickupAuthorized: isStorePickupAuthorized(order.shipment?.metadata ?? null),
      shippingKind: orderShippingKind(order),
    })
  }, [order, listRow])

  const canFinalize = order
    ? canStaffFinalizeAnalysis({
        status: order.status,
        customerDecision: order.customerDecision,
        analysisMode,
      })
    : false

  const separableItems = useMemo(
    () => order?.items.filter((it) => it.availability !== 'indisponivel') ?? [],
    [order],
  )
  const separatedCount = separableItems.filter((it) => it.separated).length
  const allSeparated =
    separableItems.length > 0 && separatedCount === separableItems.length

  async function afterMutation() {
    await reload()
    onOrderMutated?.()
  }

  async function withBusy(fn: () => Promise<boolean | void>) {
    if (busy || runnerRef.current.isBusy()) return
    setBusy(true)
    try {
      const ok = await fn()
      if (ok !== false) await afterMutation()
    } catch (e) {
      pushError(actionErrorMessage(e, 'Falha na operação'))
      try {
        await reload()
      } catch {
        /* keep selection */
      }
    } finally {
      setBusy(false)
    }
  }

  async function runAction(id: OrderOpsActionId) {
    if (!order && id !== 'copy-id' && id !== 'open-full') return
    const runner = runnerRef.current
    const fb = { ok: pushOk, error: pushError }

    switch (id) {
      case 'copy-id':
        void navigator.clipboard?.writeText(orderId).then(
          () => pushOk('ID copiado'),
          () => pushError('Não foi possível copiar'),
        )
        return
      case 'open-full':
        onOpenFull?.()
        return
      case 'start-analysis':
        if (!order) return
        await withBusy(() =>
          actionStartAnalysis(runner, orderId, order.status, fb),
        )
        return
      case 'finalize-to-separation':
        setPending('finalize')
        return
      case 'complete-separation':
        setPending('separate')
        return
      case 'cancel-order':
        setPending('cancel')
        return
      case 'print-separation':
        if (order && !openSeparationList(order)) {
          pushError('Libere pop-ups para imprimir a lista de separação.')
        }
        return
      case 'mark-all-separated': {
        const pendingIds = separableItems.filter((i) => !i.separated).map((i) => i.id)
        await withBusy(() => actionMarkAllSeparated(runner, pendingIds, fb))
        return
      }
      case 'authorize-store-pickup':
        await withBusy(() => actionAuthorizeStorePickup(runner, orderId, fb))
        return
      case 'confirm-store-pickup':
        setTab('logistica')
        await withBusy(() => actionConfirmStorePickup(runner, orderId, undefined, fb))
        return
      case 'request-customer-decision': {
        const { confirmed, reason } = await confirmDialog({
          title: 'Solicitar confirmação do cliente?',
          message:
            'O pedido fica aguardando o cliente autorizar ou recusar. Informe o motivo.',
          confirmLabel: 'Solicitar',
          requireReason: true,
          reasonLabel: 'Motivo',
          reasonPlaceholder: 'Ex.: prazo de 5 dias · peça sob encomenda',
        })
        if (!confirmed || !reason?.trim()) return
        const text = reason.trim()
        const lower = text.toLowerCase()
        let kind: StaffDecisionReasonKind = 'outro'
        if (lower.includes('prazo') || lower.includes('dia')) kind = 'prazo'
        else if (lower.includes('obs')) kind = 'obs'
        else if (lower.includes('indispon')) kind = 'indisponivel'
        await withBusy(() =>
          actionRequestCustomerDecision(runner, orderId, kind, text, fb),
        )
        return
      }
      case 'withdraw-customer-decision': {
        const { confirmed, reason } = await confirmDialog({
          title: 'Retirar solicitação ao cliente?',
          message: 'O pedido volta para análise.',
          confirmLabel: 'Retirar solicitação',
          askReason: true,
          reasonLabel: 'Nota (opcional)',
        })
        if (!confirmed) return
        await withBusy(() =>
          actionWithdrawCustomerDecision(runner, orderId, reason, fb),
        )
        return
      }
      default:
        return
    }
  }

  async function confirmPending() {
    if (!pending || !order) return
    const runner = runnerRef.current
    const fb = { ok: pushOk, error: pushError }
    if (pending === 'finalize') {
      await withBusy(async () => {
        const ok = await actionFinalizeToSeparation(runner, orderId, fb)
        if (ok) setPending(null)
        return ok
      })
    } else if (pending === 'separate') {
      await withBusy(async () => {
        const ok = await actionCompleteSeparation(runner, orderId, fb)
        if (ok) setPending(null)
        return ok
      })
    } else if (pending === 'cancel') {
      await withBusy(async () => {
        const ok = await actionCancelOrder(runner, orderId, cancelNote, fb)
        if (ok) {
          setPending(null)
          setCancelNote('')
        }
        return ok
      })
    }
  }

  const statusKey = order?.status ?? listRow?.status ?? ''
  const statusLabel = statusOperatorLabel(statusKey)
  const total = order?.total ?? listRow?.total ?? 0
  const customerName = order?.customerName ?? listRow?.customerName ?? 'Cliente'
  const showAnalysis =
    order != null && presentation.blocks.includes('analysisPanel')

  const primaryId = presentation.primaryActionId
  const primaryDisabled =
    busy ||
    pending != null ||
    (primaryId === 'finalize-to-separation' && !canFinalize) ||
    (primaryId === 'complete-separation' && !allSeparated) ||
    (primaryId === 'cancel-order' && !canCancel)

  const primaryTitle =
    primaryId === 'finalize-to-separation' && !canFinalize
      ? finalizeBlockedReason({
          status: order?.status ?? '',
          customerDecision: order?.customerDecision,
          analysisMode,
        })
      : primaryId === 'complete-separation' && !allSeparated
        ? 'Separe todos os itens antes de concluir'
        : undefined

  const freightLine = useMemo(() => {
    if (listRow?.shippingChoiceLabel) return listRow.shippingChoiceLabel
    if (!order) return null
    if (isOrderStorePickup(order)) return 'Retirada na loja'
    return contractedShippingShortLine(
      readContractedShipping(order.shipment, order.shippingAmount),
    )
  }, [order, listRow])

  const returnLogistics = useMemo(() => {
    if (!order) return null
    return buildPostSaleReturnOpsSummary({
      events: (order.events ?? []).map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload,
        visibility: e.visibility,
        createdAt: e.createdAt,
      })),
      orderStatus: order.status,
      provider: order.shipment?.provider,
      shipmentMetadata: order.shipment?.metadata ?? null,
      outboundTracking: order.shipment?.trackingCode ?? null,
    })
  }, [order])

  const itemHandlers = {
    onSaveItem: (itemId: string) =>
      void withBusy(async () => {
        const d = drafts[itemId]
        if (!d?.availability) {
          pushError('Selecione a disponibilidade')
          return false
        }
        return actionSetItemAvailability(
          runnerRef.current,
          {
            orderItemId: itemId,
            availability: d.availability,
            leadDays:
              d.availability === 'disponivel_com_prazo' ? Number(d.leadDays) : null,
            staffNote: d.staffNote || null,
          },
          { ok: pushOk, error: pushError },
        )
      }),
    onToggleSeparated: (itemId: string, separated: boolean) =>
      void withBusy(() =>
        actionSetItemSeparated(runnerRef.current, itemId, separated),
      ),
  }

  if (loading && !order) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center p-2">
        <Loading label="Carregando pedido…" />
      </div>
    )
  }

  /** Utilitários (copiar / abrir full) ficam no menu do chrome — evita botões duplicados. */
  const workflowSecondary = presentation.secondaryActionIds.filter(
    (id) => id !== 'open-full' && id !== 'copy-id',
  )
  /** Policy: CTAs de análise ficam no painel — footer só cancel (se houver) + nav guia. */
  const footerSecondaries = presentation.pendenciaActionsDeferred
    ? workflowSecondary.filter((id) => id === 'cancel-order')
    : workflowSecondary

  function navigateWizardAnchor(anchor: string) {
    if (anchor === 'ops-conferencia') {
      setTab('itens')
    } else {
      setTab('logistica')
    }
    requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div
      className={`flex flex-col ${gap} ${compact ? 'text-sm' : ''}`}
      data-order-ops-density={density}
      data-order-ops-wave={wave}
    >
      {!hideStatusHeader || outsideCurrentFilter || chromeExtra ? (
        <header className={`flex flex-wrap items-start justify-between ${gap}`}>
          <div className="min-w-0">
            {!hideStatusHeader ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={badgeClass(toneForOrderStatus(statusKey))}>
                  {statusLabel}
                </span>
                {substatus ? (
                  <span className="rounded-md border border-fal-line bg-fal-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fal-muted">
                    {substatus.label}
                  </span>
                ) : null}
                <span className="font-mono text-xs text-fal-muted">
                  #{orderId.slice(0, 8)}
                </span>
              </div>
            ) : null}
            {outsideCurrentFilter ? (
              <p className="mb-0 mt-1 text-xs text-fal-warning">
                Pedido fora do filtro atual da lista.
              </p>
            ) : null}
          </div>
          {chromeExtra ? <div className="shrink-0">{chromeExtra}</div> : null}
        </header>
      ) : null}

      {compact && order ? (
        <OrderOpsWizardNav order={order} compact onNavigate={navigateWizardAnchor} />
      ) : null}

      <div
        className="flex flex-wrap gap-1 rounded-[10px] border border-fal-line bg-fal-bg p-1"
        role="tablist"
        aria-label="Seções do pedido"
      >
        {SURFACE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={[
              'min-h-8 flex-1 rounded-[8px] px-2 text-xs font-bold transition',
              tab === t.id
                ? 'bg-fal-surface text-fal-fg shadow-sm'
                : 'text-fal-muted hover:bg-fal-surface/70 hover:text-fal-fg',
            ].join(' ')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'logistica' && returnLogistics ? (
              <span
                className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-fal-accent align-middle"
                title="Caso pós-venda aberto"
                aria-label="Caso pós-venda aberto"
              />
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
          {tab === 'geral' ? (
            <div className="flex flex-col gap-2" role="tabpanel" aria-label="Geral">
              <section className="rounded-[10px] border border-fal-line bg-fal-bg/50 px-2.5 py-2">
                <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
                  Situação
                </p>
                <p className="mb-0 mt-1 text-sm font-semibold text-fal-fg">
                  {statusLabel}
                  {substatus ? (
                    <span className="font-normal text-fal-muted"> · {substatus.label}</span>
                  ) : null}
                </p>
                {pendencia ? (
                  <div className="mt-1 space-y-0.5 rounded-[8px] border border-fal-warning/40 bg-fal-warning/10 px-2 py-1.5">
                    <p className="mb-0 text-xs font-semibold text-fal-fg">
                      {pendencia.title}
                    </p>
                    {pendencia.body ? (
                      <p className="mb-0 text-xs text-fal-muted">{pendencia.body}</p>
                    ) : null}
                  </div>
                ) : null}
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div>
                    <dt className="text-fal-muted">Cliente</dt>
                    <dd className="m-0 truncate font-semibold text-fal-fg">{customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-fal-muted">Total</dt>
                    <dd className="m-0 font-semibold text-fal-fg">{formatMoney(total)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-fal-muted">Frete / retirada</dt>
                    <dd className="m-0 font-semibold text-fal-fg">
                      {freightLine ?? '—'}
                    </dd>
                  </div>
                  {order?.createdAt ? (
                    <div className="col-span-2">
                      <dt className="text-fal-muted">Criado em</dt>
                      <dd className="m-0 text-fal-fg">{formatDateTime(order.createdAt)}</dd>
                    </div>
                  ) : null}
                </dl>
                {order ? (
                  <p className="mb-0 mt-2 text-xs text-fal-muted">
                    {order.items.length} item(ns)
                    {isInSeparation(order.status)
                      ? ` · separação ${separatedCount}/${separableItems.length}`
                      : null}
                    {' · '}
                    <button
                      type="button"
                      className="font-semibold text-fal-accent underline-offset-2 hover:underline"
                      onClick={() => setTab('itens')}
                    >
                      Ver itens
                    </button>
                  </p>
                ) : null}
              </section>

              {showAnalysis && order ? (
                <OrderAnalysisResolutionPanel
                  order={order}
                  busy={busy || pending != null}
                  onFinalize={() => setPending('finalize')}
                  onRequestDecision={(kind, reasonText, proposal) =>
                    void withBusy(() =>
                      actionRequestCustomerDecision(
                        runnerRef.current,
                        orderId,
                        kind,
                        reasonText,
                        { ok: pushOk, error: pushError },
                        proposal,
                      ),
                    )
                  }
                  onHold={(waitDays, note) =>
                    void withBusy(() =>
                      actionHoldForAvailability(
                        runnerRef.current,
                        orderId,
                        waitDays,
                        note,
                        { ok: pushOk, error: pushError },
                      ),
                    )
                  }
                  onWithdraw={
                    order.status === 'aguardando_decisao'
                      ? () => void runAction('withdraw-customer-decision')
                      : undefined
                  }
                />
              ) : null}

              {isNeedsReception(statusKey) && !pending ? (
                <p className="mb-0 text-xs text-fal-muted">
                  Use <strong>Iniciar análise</strong> para receber o pedido e conferir
                  itens.
                </p>
              ) : null}

              {renderAfterWave1 &&
              order &&
              !presentation.blocks.includes('expeditionSlot') ? (
                <div className="border-t border-fal-line pt-2">
                  {renderAfterWave1({
                    order,
                    busy,
                    reload,
                    pushOk,
                    pushError,
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'itens' ? (
            <div id="ops-conferencia" className="scroll-mt-4" role="tabpanel" aria-label="Itens">
              {order ? (
                <ItemsBlock
                  order={order}
                  drafts={drafts}
                  setDrafts={setDrafts}
                  busy={busy}
                  conference={
                    isNeedsReception(order.status) || isInAnalysis(order.status)
                  }
                  separation={isInSeparation(order.status)}
                  onSaveItem={itemHandlers.onSaveItem}
                  onToggleSeparated={itemHandlers.onToggleSeparated}
                  onRestockPhysical={(itemId) =>
                    void withBusy(async () => {
                      const item = order.items.find((i) => i.id === itemId)
                      if (!item) return false
                      const remaining =
                        item.quantity - (item.quantityRestocked ?? 0)
                      if (remaining <= 0) {
                        pushError('Item já totalmente reposto')
                        return false
                      }
                      const { confirmed } = await confirmDialog({
                        title: 'Repor estoque físico?',
                        message: item.kitCompositionSnapshot?.length
                          ? `Reposição do kit "${item.nameSnapshot}" usa o snapshot do pedido (${remaining} un.). Componentes voltam ao estoque.`
                          : `Repor ${remaining} un. de "${item.nameSnapshot}" no estoque físico?`,
                        confirmLabel: 'Repor',
                      })
                      if (!confirmed) return false
                      try {
                        const r = await adminRestockOrderItemPhysical({
                          orderItemId: itemId,
                        })
                        pushOk(
                          `Reposto: ${r.qtyRestocked} un. · ${r.stockLines} linha(s) de estoque`,
                        )
                        return true
                      } catch (e) {
                        pushError(toUserMessage(e, 'Falha na reposição'))
                        return false
                      }
                    })
                  }
                />
              ) : (
                <p className="m-0 text-sm text-fal-muted">Carregando itens…</p>
              )}
            </div>
          ) : null}

          {tab === 'pagamento' ? (
            <div
              className="flex flex-col gap-2"
              role="tabpanel"
              aria-label="Pagamento"
            >
              <section className="rounded-[10px] border border-fal-line bg-fal-bg/50 px-2.5 py-2 text-sm">
                <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
                  Pagamento
                </p>
                <dl className="mt-2 grid gap-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-fal-muted">Forma</dt>
                    <dd className="m-0 font-semibold text-fal-fg">
                      {paymentMethodLabel(order?.payment?.method ?? null)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-fal-muted">Situação</dt>
                    <dd className="m-0">
                      <span
                        className={badgeClass(
                          toneForPaymentStatus(
                            order?.payment?.status ?? listRow?.paymentStatus ?? null,
                          ),
                        )}
                      >
                        {paymentStatusLabel(
                          order?.payment?.status ?? listRow?.paymentStatus ?? null,
                        )}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-fal-muted">Total</dt>
                    <dd className="m-0 font-semibold text-fal-fg">
                      {formatMoney(total)}
                    </dd>
                  </div>
                  {order?.payment?.expiresAt ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fal-muted">Expira</dt>
                      <dd className="m-0 text-fal-fg">
                        {formatDateTime(order.payment.expiresAt)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {statusKey === 'aguardando_pagamento' ? (
                  <p className="mb-0 mt-2 text-xs text-fal-muted">
                    Aprovação só pelo provedor — o painel não confirma pagamento
                    manualmente.
                  </p>
                ) : null}
                {order?.payment?.status === 'approved' ||
                order?.payment?.status === 'refund_pending' ||
                order?.payment?.status === 'pending_manual_refund' ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="light"
                      disabled={busy}
                      onClick={() =>
                        void (async () => {
                          const { confirmed } = await confirmDialog({
                            title: 'Estorno concluído no Mercado Pago?',
                            message:
                              'Marque apenas após estornar no painel do provedor (pós-venda / cancelamento). O pedido permanece no status comercial atual.',
                            confirmLabel: 'Marcar estorno feito',
                          })
                          if (!confirmed) return
                          await withBusy(async () => {
                            const ran = await runnerRef.current.runExclusive(
                              async () => {
                                await adminMarkPaymentRefunded(orderId)
                                pushOk('Estorno marcado')
                                return true
                              },
                            )
                            return ran === true
                          })
                        })()
                      }
                    >
                      Marcar estorno feito
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {tab === 'logistica' ? (
            <div
              className="flex flex-col gap-2"
              role="tabpanel"
              aria-label="Logística"
            >
              {returnLogistics && order ? (
                <>
                  <PostSaleReturnLogisticsPanel
                    summary={returnLogistics}
                    outboundLabelState={
                      orderUsesMelhorEnvio(order)
                        ? meLabelStateLabel(meLabelState(order.shipment?.metadata ?? null))
                        : order.shipment?.provider ?? null
                    }
                  />
                  <PostSaleCaseQuickActions
                    order={order}
                    busy={busy}
                    runner={runnerRef.current}
                    pushOk={pushOk}
                    pushError={pushError}
                    onBusy={setBusy}
                    reload={reload}
                  />
                </>
              ) : null}
              <section className="rounded-[10px] border border-fal-line bg-fal-bg/50 px-2.5 py-2 text-sm">
                <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
                  Frete e retirada
                </p>
                <p className="mb-0 mt-1.5 text-sm font-semibold text-fal-fg">
                  {freightLine ?? 'Sem escolha registrada'}
                </p>
                {order?.shippingAmount != null ? (
                  <p className="mb-0 mt-1 text-xs text-fal-muted">
                    Valor frete: {formatMoney(order.shippingAmount)}
                  </p>
                ) : null}
                {order?.shipment?.trackingCode ? (
                  <p className="mb-0 mt-1 text-xs text-fal-fg">
                    Rastreio:{' '}
                    <span className="font-mono font-semibold">
                      {order.shipment.trackingCode}
                    </span>
                  </p>
                ) : null}
              </section>

              {order &&
              presentation.blocks.includes('expeditionSlot') &&
              isExpeditionOrLater(order.status) ? (
                <AdminOrderExpeditionSlot
                  order={order}
                  busy={busy}
                  reload={reload}
                  pushOk={pushOk}
                  pushError={pushError}
                  onBusy={setBusy}
                  actionRunner={runnerRef.current}
                />
              ) : order && presentation.blocks.includes('wave2Placeholder') ? (
                <p className="mb-0 rounded-[8px] border border-dashed border-fal-line bg-fal-surface px-2 py-2 text-xs text-fal-muted">
                  Expedição completa (volumes / ME) na aba Logística quando o pedido
                  chegar em pronto para envio. Retirada: Autorizar + Cliente retirou.
                </p>
              ) : (
                <p className="mb-0 text-xs text-fal-muted">
                  Ações de frete, etiqueta e retirada aparecem aqui após a separação.
                </p>
              )}

              {renderAfterWave1 && order && !presentation.blocks.includes('expeditionSlot')
                ? renderAfterWave1({
                    order,
                    busy,
                    reload,
                    pushOk,
                    pushError,
                  })
                : null}
            </div>
          ) : null}
        </div>

        {pending ? (
          <div className="shrink-0 rounded-[10px] border border-fal-warning/50 bg-fal-warning/15 px-2.5 py-2 text-sm text-fal-fg">
            <p className="m-0 font-bold">{PENDING_COPY[pending].title}</p>
            <p className="mb-0 mt-1 text-xs text-fal-muted">{PENDING_COPY[pending].body}</p>
            {pending === 'cancel' ? (
              <div className="mt-2">
                <Input
                  label="Motivo do cancelamento"
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  disabled={busy}
                />
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="dark"
                disabled={busy || (pending === 'cancel' && !cancelNote.trim())}
                onClick={() => void confirmPending()}
              >
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
          </div>
        ) : null}

        {order?.cancellationRequest === 'pending' ? (
          <div className="shrink-0 rounded-[10px] border border-fal-warning/50 bg-fal-warning/15 px-2.5 py-2 text-xs">
            <p className="m-0 font-semibold text-fal-fg">
              Cancelamento solicitado pelo cliente
            </p>
            <p className="mb-0 mt-1 text-fal-muted">
              Motivo: {order.cancellationReason?.trim() || '—'}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void (async () => {
                    const { confirmed } = await confirmDialog({
                      title: 'Aprovar cancelamento?',
                      message: 'Confirma o cancelamento do pedido.',
                      confirmLabel: 'Aprovar',
                    })
                    if (!confirmed) return
                    await withBusy(async () => {
                      const ran = await runnerRef.current.runExclusive(async () => {
                        await adminResolveOrderCancellation(orderId, true)
                        pushOk('Cancelamento aprovado')
                        return true
                      })
                      return ran === true
                    })
                  })()
                }
              >
                Aprovar cancelamento
              </Button>
              <Button
                type="button"
                variant="light"
                disabled={busy}
                onClick={() =>
                  void (async () => {
                    const { confirmed } = await confirmDialog({
                      title: 'Recusar solicitação?',
                      message: 'O pedido segue o fluxo normal.',
                      confirmLabel: 'Recusar',
                    })
                    if (!confirmed) return
                    await withBusy(async () => {
                      const ran = await runnerRef.current.runExclusive(async () => {
                        await adminResolveOrderCancellation(orderId, false)
                        pushOk('Solicitação recusada')
                        return true
                      })
                      return ran === true
                    })
                  })()
                }
              >
                Recusar
              </Button>
            </div>
          </div>
        ) : null}

      {presentation.primaryActionId ||
      footerSecondaries.length > 0 ||
      (!hideFooter && (onOpenFull || onClose)) ? (
        <footer className="border-t border-fal-line pt-2" aria-label="Ações do pedido">
          {presentation.primaryActionId ? (
            <Button
              type="button"
              variant="dark"
              fullWidth
              disabled={primaryDisabled}
              title={primaryTitle}
              onClick={() => void runAction(presentation.primaryActionId!)}
            >
              {ACTION_LABEL[presentation.primaryActionId]}
            </Button>
          ) : null}
          {footerSecondaries.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {footerSecondaries.map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant="light"
                  disabled={busy || pending != null}
                  onClick={() => void runAction(id)}
                >
                  {ACTION_LABEL[id]}
                </Button>
              ))}
            </div>
          ) : null}
          {!hideFooter && (onOpenFull || onClose) ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {onOpenFull ? (
                <button
                  type="button"
                  className="font-semibold text-fal-accent underline-offset-2 hover:underline"
                  onClick={onOpenFull}
                >
                  Página completa
                </button>
              ) : null}
              {onClose ? (
                <button
                  type="button"
                  className="font-semibold text-fal-muted underline-offset-2 hover:text-fal-fg hover:underline"
                  onClick={onClose}
                >
                  Fechar guia
                </button>
              ) : null}
            </div>
          ) : null}
        </footer>
      ) : null}
    </div>
  )
}

function ItemsBlock({
  order,
  drafts,
  setDrafts,
  busy,
  conference,
  separation,
  onSaveItem,
  onToggleSeparated,
  onRestockPhysical,
}: {
  order: AdminOrderDetail
  drafts: Record<string, ItemDraft>
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, ItemDraft>>>
  busy: boolean
  conference: boolean
  separation: boolean
  onSaveItem: (itemId: string) => void
  onToggleSeparated: (itemId: string, separated: boolean) => void
  onRestockPhysical?: (itemId: string) => void
}) {
  const canPhysicalRestock =
    order.status === 'enviado' || order.status === 'entregue'
  return (
    <ul className="m-0 list-none space-y-1.5 p-0">
      {order.items.map((it) => {
        const d = drafts[it.id] ?? {
          availability: '',
          leadDays: '',
          staffNote: '',
        }
        const lineTotal = it.unitPrice * it.quantity
        return (
          <li
            key={it.id}
            className="flex items-start gap-2 rounded-[10px] border border-fal-line bg-fal-bg/40 px-2 py-1.5 text-sm"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-fal-line bg-fal-surface">
              {it.imageUrl ? (
                <img
                  src={it.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-[10px] font-bold text-fal-muted"
                  aria-hidden
                >
                  —
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-semibold text-fal-fg">{it.nameSnapshot}</p>
              <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                {it.sku} · Qtd. {it.quantity} · {formatMoney(it.unitPrice)}
                <span className="text-fal-muted"> · </span>
                <span className="font-semibold text-fal-fg">{formatMoney(lineTotal)}</span>
              </p>
              {it.kitCompositionSnapshot?.length ? (
                <div className="mb-0 mt-1 rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1 text-[11px] text-fal-muted">
                  <p className="m-0 font-semibold text-fal-fg">Separar kit (snapshot):</p>
                  <ul className="mb-0 mt-0.5 list-disc pl-4">
                    {it.kitCompositionSnapshot.map((c) => (
                      <li key={`${it.id}-${c.productId}`}>
                        {c.sku || c.productId} — {c.name} × {c.quantity * it.quantity}
                        {it.quantity > 1 ? (
                          <span className="text-fal-muted">
                            {' '}
                            ({c.quantity}/kit × {it.quantity})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {it.availability ? (
                <p className="mb-0 mt-0.5 text-[11px] text-fal-muted">
                  Disp.: {it.availability}
                  {it.leadDays != null ? ` · ${it.leadDays}d` : ''}
                </p>
              ) : null}
              {it.vehicleSnapshot?.compatDecision ? (
                <p className="mb-0 mt-0.5 text-[11px] text-fal-muted">
                  Fit no pedido:{' '}
                  <span className="font-semibold text-fal-fg">
                    {it.vehicleSnapshot.compatDecision.sealLabel}
                  </span>
                  {it.vehicleSnapshot.compatDecision.action === 'continue_unconfirmed'
                    ? ' · sem confirmar'
                    : it.vehicleSnapshot.compatDecision.action === 'continue_incompatible'
                      ? ' · incompatível aceito'
                      : null}
                </p>
              ) : null}
              {conference ? (
                <div className="mt-1.5 space-y-1.5">
                  <select
                    className="min-h-9 w-full rounded-[8px] border border-fal-line bg-fal-surface px-2 text-sm"
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
                    <option value="">Disponibilidade…</option>
                    <option value="disponivel">Disponível</option>
                    <option value="disponivel_com_prazo">Com prazo</option>
                    <option value="indisponivel">Indisponível</option>
                  </select>
                  {d.availability === 'disponivel_com_prazo' ? (
                    <Input
                      label="Prazo (dias)"
                      value={d.leadDays}
                      disabled={busy}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [it.id]: { ...d, leadDays: e.target.value },
                        }))
                      }
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="light"
                    disabled={busy || !d.availability}
                    onClick={() => onSaveItem(it.id)}
                  >
                    Salvar item
                  </Button>
                </div>
              ) : null}
              {separation && it.availability !== 'indisponivel' ? (
                <label className="mt-1.5 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(it.separated)}
                    disabled={busy}
                    onChange={(e) => onToggleSeparated(it.id, e.target.checked)}
                  />
                  Item separado
                </label>
              ) : null}
              {separation && it.availability === 'indisponivel' ? (
                <p className="mb-0 mt-1.5 text-xs text-red-800">
                  Indisponível — fora do envio
                </p>
              ) : null}
              {canPhysicalRestock && onRestockPhysical ? (
                <div className="mt-1.5">
                  {(it.quantityRestocked ?? 0) >= it.quantity ? (
                    <p className="mb-0 text-[11px] font-semibold text-emerald-800">
                      Estoque físico já reposto
                    </p>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onRestockPhysical(it.id)}
                    >
                      Repor estoque
                      {(it.quantityRestocked ?? 0) > 0
                        ? ` (${it.quantityRestocked}/${it.quantity})`
                        : ''}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
