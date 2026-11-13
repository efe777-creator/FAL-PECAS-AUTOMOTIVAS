import { MeExpeditionPanel } from '@/components/admin/orders/MeExpeditionPanel'
import { ContractedFreightSnapshotPanel } from '@/components/admin/orders/ContractedFreightSnapshotPanel'
import { FreightFinancePanel } from '@/components/admin/orders/FreightFinancePanel'
import { OrderAnalysisResolutionPanel } from '@/components/admin/orders/OrderAnalysisResolutionPanel'
import { OrderOccurrencesPanel } from '@/components/admin/orders/OrderOccurrencesPanel'
import { AdminOrderCommandBar } from '@/components/admin/orders/AdminOrderCommandBar'
import { PurchasedShippingSummary } from '@/components/admin/orders/PurchasedShippingSummary'
import {
  contractedShippingShortLine,
  readContractedShipping,
} from '@/lib/contractedShipping'
import { OrderPackingPanel } from '@/components/admin/orders/OrderPackingPanel'
import { OwnShipPanel } from '@/components/admin/orders/OwnShipPanel'
import { StorePickupPanel } from '@/components/admin/orders/StorePickupPanel'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { openSeparationList } from '@/lib/adminOrderPrint'
import { classifyAnalysisItems } from '@/lib/orderAnalysisResolution'
import { summarizeOrderMargin, type OrderMarginSummary } from '@/lib/orderMarginSummary'
import { toUserMessage } from '@/lib/toUserMessage'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { SKU_FAL_LABEL } from '@/lib/productLabels'
import {
  paymentMethodLabel,
  paymentProviderLabel,
  paymentStatusLabel,
} from '@/lib/paymentLabels'
import {
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  orderStatusOperatorLabel,
  projectAdminOrderTimeline,
} from '@/lib/adminOrderOps'
import { meLabelStateLabel, meLabelState } from '@/lib/melhorEnvioLabelState'
import { consumeOrdersReturnPath } from '@/lib/adminOrdersNav'
import {
  isOrderStorePickup,
  orderShippingKind,
  orderUsesMelhorEnvio,
} from '@/lib/orderShippingKind'
import { isStorePickupAuthorized } from '@/lib/storePickupOps'
import {
  adminOrderNextStep,
  orderConfirmationResultLabel,
  orderEventLabel,
  orderEventVisibilityLabel,
} from '@/lib/orderLifecycle'
import {
  adminAdvanceOrder,
  adminCancelOrder,
  adminCompleteSeparation,
  adminDeliverOrder,
  adminFinalizeConfirmation,
  adminGetOrderDetail,
  adminHoldForAvailability,
  adminMarkPaymentRefunded,
  adminRequestCustomerDecision,
  adminResolveOrderCancellation,
  adminSetItemAvailability,
  adminSetItemSeparated,
  adminShipOrder,
  adminWithdrawCustomerDecisionRequest,
  staffCanCancel,
  type AdminOrderDetail,
  type OrderItemAvailability,
  type StaffDecisionReasonKind,
} from '@/services/admin/adminOrderService'
import { loadProductBaseCosts } from '@/services/admin/adminPriceListService'
import { useEffect, useMemo, useState } from 'react'
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
    title: 'Confirmar pedido e enviar para separação?',
    body: 'Confirme após conferir os itens. Pedir confirmação ao cliente é opcional (botão separado).',
  },
  separate: {
    title: 'Concluir separação e enviar para expedição?',
    body: 'Todos os itens devem estar marcados como separados. Em seguida o pedido fica pronto para etiqueta/postagem.',
  },
  ship: {
    title: 'Registrar entrega à transportadora?',
    body: 'Isto marca o pedido como enviado. Não use só por ter gerado a etiqueta.',
  },
  deliver: {
    title: 'Confirmar entrega ao cliente?',
    body: 'O pedido será encerrado como entregue. Diferente de postagem à transportadora.',
  },
  cancel: {
    title: 'Cancelar pedido?',
    body: 'Informe o motivo. Somente gerente/administrador. A reserva será liberada se houver.',
  },
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  useDocumentTitle(
    order ? `Pedido ${order.id.slice(0, 8)} | Admin FAL` : 'Pedido | Admin FAL',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  /** Conferência: seleção para aplicar disponibilidade em lote (só se >1 item). */
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [bulkDraft, setBulkDraft] = useState<Draft>({
    availability: '',
    leadDays: '',
    staffNote: '',
  })
  const [carrier, setCarrier] = useState('')
  const [service, setService] = useState('')
  const [tracking, setTracking] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [proofRef, setProofRef] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [cancelNote, setCancelNote] = useState('')
  const [costByProduct, setCostByProduct] = useState<Map<string, { baseCost: number }>>(
    () => new Map(),
  )
  const [marginBusy, setMarginBusy] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

    /** Reload silencioso por padrão: só o primeiro load mostra spinner de página inteira. */
  async function reload(opts?: { initial?: boolean }) {
    if (opts?.initial) {
      setLoading(true)
      setError(null)
    }
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
        // ME-C3/plano: pré-preencher transportadora/rastreio com retorno ME quando vazio
        const meRaw = d.shipment?.metadata?.me
        const me =
          meRaw && typeof meRaw === 'object'
            ? (meRaw as {
                company_name?: string
                tracking?: string
                tracking_url?: string
                service_id?: string | number
              })
            : null
        setCarrier((prev) => prev || d.shipment?.carrier || me?.company_name || '')
        setService((prev) =>
          prev ||
          d.shipment?.service ||
          (me?.service_id != null ? `Melhor Envio · código do serviço ${me.service_id}` : '') ||
          '',
        )
        setTracking((prev) => prev || d.shipment?.trackingCode || me?.tracking || '')
        const metaUrl =
          (d.shipment?.metadata?.tracking_url as string | undefined) ||
          me?.tracking_url ||
          ((d.shipment?.metadata?.own as { tracking_url?: string } | undefined)?.tracking_url)
        setTrackingUrl((prev) => prev || metaUrl || '')
      }
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar'))
    } finally {
      if (opts?.initial) setLoading(false)
    }
  }

  useEffect(() => {
    setSelectedItemIds([])
    setBulkDraft({ availability: '', leadDays: '', staffNote: '' })
    if (id) void reload({ initial: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!order?.items.length) {
      setCostByProduct(new Map())
      return
    }
    const productIds = order.items
      .map((it) => it.productId)
      .filter((pid): pid is string => Boolean(pid))
    if (!productIds.length) {
      setCostByProduct(new Map())
      return
    }
    let cancelled = false
    setMarginBusy(true)
    void loadProductBaseCosts(productIds)
      .then((map) => {
        if (cancelled) return
        const next = new Map<string, { baseCost: number }>()
        for (const [pid, info] of map) {
          next.set(pid, { baseCost: info.baseCost })
        }
        setCostByProduct(next)
      })
      .catch(() => {
        if (!cancelled) setCostByProduct(new Map())
      })
      .finally(() => {
        if (!cancelled) setMarginBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [order])

  const marginSummary: OrderMarginSummary | null = useMemo(() => {
    if (!order?.items.length) return null
    return summarizeOrderMargin(
      order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
      costByProduct,
    )
  }, [order, costByProduct])

  async function saveItem(itemId: string) {
    const d = drafts[itemId]
    if (!d?.availability) {
      pushError('Selecione a disponibilidade')
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
      pushOk('Disponibilidade salva')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao salvar item'))
    } finally {
      setBusy(false)
    }
  }

  function toggleItemSelected(itemId: string, checked: boolean) {
    setSelectedItemIds((prev) => {
      if (checked) return prev.includes(itemId) ? prev : [...prev, itemId]
      return prev.filter((id) => id !== itemId)
    })
  }

  function applyBulkToSelected() {
    if (!bulkDraft.availability) {
      pushError('Escolha a disponibilidade global')
      return
    }
    if (selectedItemIds.length === 0) {
      pushError('Selecione ao menos um item')
      return
    }
    if (
      bulkDraft.availability === 'disponivel_com_prazo' &&
      (!bulkDraft.leadDays.trim() || Number(bulkDraft.leadDays) < 1)
    ) {
      pushError('Informe o prazo em dias para aplicar com prazo')
      return
    }
    setDrafts((prev) => {
      const next = { ...prev }
      for (const itemId of selectedItemIds) {
        const cur = next[itemId] ?? { availability: '', leadDays: '', staffNote: '' }
        next[itemId] = {
          availability: bulkDraft.availability,
          leadDays:
            bulkDraft.availability === 'disponivel_com_prazo' ? bulkDraft.leadDays : '',
          staffNote: bulkDraft.staffNote.trim()
            ? bulkDraft.staffNote
            : cur.staffNote,
        }
      }
      return next
    })
    pushOk(
      `Disponibilidade aplicada em ${selectedItemIds.length} item(ns) — salve para gravar`,
    )
  }

  async function saveSelectedItems() {
    if (selectedItemIds.length === 0) {
      pushError('Selecione ao menos um item')
      return
    }
    const ready = selectedItemIds.filter((itemId) => drafts[itemId]?.availability)
    if (ready.length === 0) {
      pushError('Nenhum selecionado tem disponibilidade definida')
      return
    }
    const missingPrazo = ready.find((itemId) => {
      const d = drafts[itemId]
      return (
        d?.availability === 'disponivel_com_prazo' &&
        (!d.leadDays.trim() || Number(d.leadDays) < 1)
      )
    })
    if (missingPrazo) {
      pushError('Itens com prazo precisam de dias válidos')
      return
    }
    setBusy(true)
    setError(null)
    try {
      for (const itemId of ready) {
        const d = drafts[itemId]!
        await adminSetItemAvailability({
          orderItemId: itemId,
          availability: d.availability as OrderItemAvailability,
          leadDays: d.availability === 'disponivel_com_prazo' ? Number(d.leadDays) : null,
          staffNote: d.staffNote || null,
        })
      }
      pushOk(`Disponibilidade salva em ${ready.length} item(ns)`)
      setSelectedItemIds([])
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao salvar itens selecionados'))
    } finally {
      setBusy(false)
    }
  }

  async function runFinalize() {
    setBusy(true)
    setError(null)
    try {
      const r = await adminFinalizeConfirmation(id)
      pushOk(
        `Resultado: ${orderConfirmationResultLabel(r.result)} → ${orderStatusOperatorLabel[r.status] ?? r.status}`,
      )
      setPending(null)
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao finalizar'))
    } finally {
      setBusy(false)
    }
  }

  async function runRequestCustomerDecision() {
    const { confirmed, reason } = await confirmDialog({
      title: 'Solicitar confirmação do cliente?',
      message:
        'O pedido fica aguardando o cliente autorizar ou recusar. Informe o motivo (prazo, observação, etc.).',
      confirmLabel: 'Solicitar',
      requireReason: true,
      reasonLabel: 'Motivo (prazo / obs / outro)',
      reasonPlaceholder: 'Ex.: prazo de 5 dias úteis · peça sob encomenda · …',
    })
    if (!confirmed || !reason?.trim()) return
    const text = reason.trim()
    const lower = text.toLowerCase()
    let kind: StaffDecisionReasonKind = 'outro'
    if (lower.includes('prazo') || lower.includes('dia')) kind = 'prazo'
    else if (lower.includes('obs') || lower.includes('observa')) kind = 'obs'
    else if (lower.includes('indispon')) kind = 'indisponivel'
    setBusy(true)
    setError(null)
    try {
      await adminRequestCustomerDecision(id, kind, text)
      pushOk('Confirmação solicitada ao cliente')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao solicitar confirmação'))
    } finally {
      setBusy(false)
    }
  }

  async function runWithdrawCustomerDecision() {
    const { confirmed, reason } = await confirmDialog({
      title: 'Retirar solicitação ao cliente?',
      message:
        'O pedido volta para análise. Você poderá confirmar sem esperar o cliente ou solicitar de novo.',
      confirmLabel: 'Retirar solicitação',
      askReason: true,
      reasonLabel: 'Nota (opcional)',
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    try {
      await adminWithdrawCustomerDecisionRequest(id, reason)
      pushOk('Solicitação retirada — pedido em análise')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao retirar solicitação'))
    } finally {
      setBusy(false)
    }
  }

  async function runCancel() {
    const note = cancelNote.trim()
    if (!note) {
      pushError('Informe o motivo do cancelamento.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminCancelOrder(id, note)
      pushOk('Pedido cancelado')
      setPending(null)
      setCancelNote('')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao cancelar'))
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
      pushError(toUserMessage(e, 'Falha ao marcar separação'))
    } finally {
      setBusy(false)
    }
  }

  async function runCompleteSeparation() {
    setBusy(true)
    setError(null)
    try {
      await adminCompleteSeparation(id)
      pushOk('Separação concluída')
      setPending(null)
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha na separação'))
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
        trackingUrl: trackingUrl || undefined,
      })
      pushOk('Pedido expedido')
      setPending(null)
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha na expedição'))
    } finally {
      setBusy(false)
    }
  }

  async function runDeliver() {
    setBusy(true)
    setError(null)
    try {
      await adminDeliverOrder(id, proofRef || undefined)
      pushOk('Pedido entregue')
      setPending(null)
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha na entrega'))
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
  const separableItems = current.items.filter((it) => it.availability !== 'indisponivel')
  const separatedCount = separableItems.filter((it) => it.separated).length
  const allSeparated =
    current.items.length > 0 &&
    (separableItems.length === 0 || separatedCount === separableItems.length)
  const analysisMode = classifyAnalysisItems(
    current.items.map((i) => ({ availability: i.availability, leadDays: i.leadDays })),
  )
  const customerAuthorizedPartial =
    current.customerDecision === 'authorized' ||
    current.customerDecision === 'continue_available'
  const canStaffFinalizeAnalysis =
    current.status === 'aguardando_decisao'
      ? customerAuthorizedPartial
      : analysisMode === 'all_ok' || analysisMode === 'prazo_only'
  const hadDecisionStep =
    current.customerDecision != null ||
    current.status === 'aguardando_decisao' ||
    current.events.some(
      (e) =>
        e.eventType === 'order_awaiting_decision' ||
        e.eventType === 'customer_authorized_changes' ||
        e.eventType === 'customer_rejected_changes',
    )
  const actor = adminActorKind(current.status, current.customerDecision)
  const storePickup = isOrderStorePickup(current)
  const shipKind = orderShippingKind(current)
  const pickupAuthorized = isStorePickupAuthorized(current.shipment?.metadata ?? null)
  const timeline = projectAdminOrderTimeline(current.status, {
    hadDecisionStep,
    customerDecision: current.customerDecision,
    pickup: storePickup,
    pickupAuthorized,
  })
  const baseStep = adminOrderNextStep(current.status, {
    pickup: storePickup,
    shippingKind: shipKind,
  })
  const nextStep =
    current.status === 'aguardando_decisao'
      ? {
          title: adminNextActionLabel(current.status, current.customerDecision),
          body:
            current.customerDecision === 'authorized' ||
            current.customerDecision === 'continue_available'
              ? 'Cliente autorizou. Se o status ainda estiver aqui (legado), finalize a confirmação.'
              : current.customerDecision === 'rejected' ||
                  current.customerDecision === 'cancel_order'
                ? 'Cliente pediu cancelamento. Não confirme — analise o cancelamento.'
                : current.customerDecision === 'wait_arrival'
                  ? 'Cliente pediu espera. O pedido deve ir para aguardando disponibilidade.'
                  : 'Aguarde a resposta do cliente. Não confirme em silêncio.',
        }
      : storePickup &&
          pickupAuthorized &&
          ['pronto_para_envio', 'preparando_envio', 'enviado'].includes(current.status)
        ? {
            title: 'Aguardando cliente na loja',
            body: 'Retirada já autorizada no app do cliente. Quando ele buscar, use “Cliente retirou”.',
          }
        : baseStep

  async function markAllSeparated() {
    const pendingItems = current.items.filter(
      (it) => !it.separated && it.availability !== 'indisponivel',
    )
    if (pendingItems.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const it of pendingItems) {
        await adminSetItemSeparated(it.id, true)
      }
      pushOk(`${pendingItems.length} item(ns) marcado(s) como separado(s).`)
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao marcar separação'))
    } finally {
      setBusy(false)
    }
  }

  async function runHoldForAvailability(waitDays: number | null, note: string) {
    setBusy(true)
    setError(null)
    try {
      await adminHoldForAvailability(id, waitDays, note || null)
      pushOk('Pedido em aguardando disponibilidade')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao colocar em espera'))
    } finally {
      setBusy(false)
    }
  }

  async function runRequestDecisionWithKind(
    kind: StaffDecisionReasonKind,
    reasonText: string,
    proposal?: Record<string, unknown>,
  ) {
    setBusy(true)
    setError(null)
    try {
      await adminRequestCustomerDecision(id, kind, reasonText, proposal ?? null)
      pushOk('Confirmação solicitada ao cliente')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao solicitar confirmação'))
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
      pushOk('Análise iniciada')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao iniciar análise'))
    } finally {
      setBusy(false)
    }
  }

  const returnPath = consumeOrdersReturnPath('/admin/pedidos')
  const statusLabel =
    storePickup && order.status === 'entregue'
      ? 'Retirada feita'
      : storePickup &&
          (order.status === 'enviado' ||
            (pickupAuthorized &&
              ['pronto_para_envio', 'preparando_envio'].includes(order.status)))
        ? 'Pronto para retirar'
        : (orderStatusOperatorLabel[order.status] ?? order.status)
  const modalityLabel = storePickup
    ? 'Retirada na loja'
    : shipKind === 'melhorenvio'
      ? 'Melhor Envio'
      : shipKind === 'own'
        ? 'Frete próprio'
        : ''
  const contractedShip = readContractedShipping(order.shipment, order.shippingAmount)
  const freightChoiceLabel = contractedShippingShortLine(contractedShip)

  return (
    <div className="space-y-5">
      <AdminOrderCommandBar
        order={order}
        returnPath={returnPath}
        statusLabel={statusLabel}
        modalityLabel={modalityLabel}
        freightChoiceLabel={freightChoiceLabel}
        actorLabel={adminActorBadgeLabel(actor)}
        nextStep={nextStep}
        separationProgress={
          inSeparation
            ? `Separação: ${separatedCount}/${separableItems.length} item(ns) a enviar`
            : null
        }
      />

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <p className="m-0 text-xs text-fal-muted">{formatDateTime(order.createdAt)}</p>

      <PurchasedShippingSummary order={order} variant="banner" />

      {current.status === 'aguardando_decisao' ? (
        <section
          className={
            current.customerDecision === 'authorized'
              ? 'rounded-[14px] border border-green-300 bg-green-50 px-4 py-3'
              : current.customerDecision === 'rejected'
                ? 'rounded-[14px] border border-red-300 bg-red-50 px-4 py-3'
                : 'rounded-[14px] border border-sky-300 bg-sky-50 px-4 py-3'
          }
        >
          <h2 className="m-0 text-base font-extrabold text-fal-navy">Autorização do cliente</h2>
          <p className="mt-1 mb-2 text-sm text-fal-muted">
            {current.customerDecision === 'authorized'
              ? 'Cliente autorizou. Use Confirmar pedido para enviar à separação.'
              : current.customerDecision === 'rejected'
                ? 'Cliente recusou. Cancele o pedido ou retire a solicitação e renegocie.'
                : 'Você solicitou confirmação. Aguarde autorizar/recusar, ou retire a solicitação.'}
          </p>
          {current.customerDecision !== 'authorized' ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void runWithdrawCustomerDecision()}
            >
              Retirar solicitação (voltar à análise)
            </Button>
          ) : null}
        </section>
      ) : null}

      {current.cancellationRequest === 'pending' ? (
        <section className="rounded-[14px] border border-amber-400 bg-amber-50 px-4 py-3">
          <h2 className="m-0 text-base font-extrabold text-fal-navy">
            Solicitação de cancelamento (pós-pago)
          </h2>
          <p className="mt-1 mb-2 text-sm text-fal-muted">
            Motivo do cliente: {current.cancellationReason?.trim() || '—'}
          </p>
          {current.status === 'enviado' || current.status === 'entregue' ? (
            <>
              <p className="mt-0 mb-3 text-sm text-amber-950">
                Pedido já despachado/entregue — <strong>não use cancelamento comercial</strong>.
                Trate como ocorrência / pós-venda (devolução ≠ cancel). Estorno, se couber, é
                processo separado.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    const { confirmed, reason } = await confirmDialog({
                      title: 'Recusar solicitação?',
                      message:
                        'Recusar o cancelamento comercial. Oriente o cliente ao fluxo de pós-venda.',
                      confirmLabel: 'Recusar',
                      danger: true,
                      requireReason: true,
                      reasonLabel: 'Motivo',
                    })
                    if (!confirmed || !reason) return
                    setBusy(true)
                    setError(null)
                    try {
                      await adminResolveOrderCancellation(current.id, false, reason)
                      pushOk('Solicitação recusada. Use pós-venda se necessário.')
                      await reload()
                    } catch (e) {
                      pushError(toUserMessage(e, 'Falha ao recusar'))
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Recusar (manter pedido / pós-venda)
              </Button>
            </>
          ) : (
            <>
              <p className="mt-0 mb-3 text-xs text-fal-muted">
                Estorno <strong>manual</strong> no Mercado Pago após aprovar. Depois use
                “Marcar estorno feito”.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      const { confirmed, reason } = await confirmDialog({
                        title: 'Aprovar cancelamento?',
                        message:
                          'O pedido será cancelado. Estorno no Mercado Pago continua manual.',
                        confirmLabel: 'Aprovar',
                        askReason: true,
                        reasonLabel: 'Nota (opcional)',
                        reasonPlaceholder: 'Ex.: estorno será feito no painel do provedor',
                      })
                      if (!confirmed) return
                      setBusy(true)
                      setError(null)
                      try {
                        await adminResolveOrderCancellation(current.id, true, reason ?? '')
                        pushOk(
                          'Cancelamento aprovado. Faça o estorno no Mercado Pago e marque abaixo.',
                        )
                        await reload()
                      } catch (e) {
                        pushError(toUserMessage(e, 'Falha ao aprovar'))
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  Aprovar cancelamento
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      const { confirmed, reason } = await confirmDialog({
                        title: 'Recusar solicitação?',
                        message: 'O pedido permanece ativo. Informe o motivo da recusa.',
                        confirmLabel: 'Recusar',
                        danger: true,
                        requireReason: true,
                        reasonLabel: 'Motivo',
                      })
                      if (!confirmed || !reason) return
                      setBusy(true)
                      setError(null)
                      try {
                        await adminResolveOrderCancellation(current.id, false, reason)
                        pushOk('Solicitação recusada. Pedido permanece ativo.')
                        await reload()
                      } catch (e) {
                        pushError(toUserMessage(e, 'Falha ao recusar'))
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  Recusar solicitação
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {current.status === 'cancelado' &&
      current.cancellationRequest === 'approved' &&
      current.payment?.status === 'approved' ? (
        <section className="rounded-[14px] border border-fal-navy/30 bg-[#f7f9fc] px-4 py-3">
          <h2 className="m-0 text-base font-extrabold text-fal-navy">Estorno pendente (manual)</h2>
          <p className="mt-1 mb-3 text-sm text-fal-muted">
            Após concluir o refund no painel Mercado Pago, registre aqui.
            {current.cancellationResolveNote
              ? ` Nota: ${current.cancellationResolveNote}`
              : ''}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              void (async () => {
                const { confirmed, reason } = await confirmDialog({
                  title: 'Estorno concluído no Mercado Pago?',
                  message: 'Confirme que o refund já foi feito no painel do Mercado Pago.',
                  confirmLabel: 'Marcar estorno feito',
                  askReason: true,
                  reasonLabel: 'Nota (opcional)',
                })
                if (!confirmed) return
                setBusy(true)
                setError(null)
                try {
                  await adminMarkPaymentRefunded(current.id, reason ?? '')
                  pushOk('Pagamento marcado como estornado.')
                  await reload()
                } catch (e) {
                  pushError(toUserMessage(e, 'Falha ao marcar estorno'))
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Marcar estorno feito
          </Button>
        </section>
      ) : null}

      <details className="rounded-[14px] border border-fal-line bg-white open:shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold text-fal-navy marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>Cliente e valores</span>
            <span className="text-xs font-semibold text-fal-muted">
              {order.customerName ?? '—'} · {formatMoney(order.total)}
              {freightChoiceLabel ? ` · ${freightChoiceLabel}` : ''}
            </span>
          </span>
        </summary>
        <div className="border-t border-fal-line px-4 pb-4 pt-3">
        <h2 className="sr-only">Cliente e valores</h2>
        <p className="mb-0 mt-2 text-sm">
          <strong>{order.customerName ?? '—'}</strong>
          <br />
          Usuário: {order.customerEmail ?? '—'}
          <br />
          Documento: {order.customerDoc ?? '—'}
          <br />
          Endereço:{' '}
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
        <p className="mt-2 mb-0 text-sm font-semibold">
          Subtotal {formatMoney(order.subtotal)} · Frete cobrado {formatMoney(order.shippingAmount)}{' '}
          · Total {formatMoney(order.total)}
        </p>
        {contractedShip ? (
          <p className="mt-1 mb-0 text-sm text-fal-navy">
            <strong>Frete escolhido:</strong> {contractedShip.label}
            {contractedShip.etaLabel ? (
              <>
                {' '}
                · <strong>Prazo:</strong> {contractedShip.etaLabel}
              </>
            ) : null}
          </p>
        ) : null}
        {marginSummary ? (
          <div className="mt-3 rounded-[12px] border border-fal-yellow-dark/40 bg-fal-yellow/10 px-3 py-3">
            <h3 className="m-0 text-sm font-extrabold text-fal-navy">Rentabilidade estimada (itens)</h3>
            {marginBusy ? (
              <p className="mb-0 mt-1 text-xs text-fal-muted">Carregando custos…</p>
            ) : (
              <>
                <p className="mb-0 mt-2 text-sm">
                  Receita itens {formatMoney(marginSummary.revenueItems)}
                  {marginSummary.costItems != null ? (
                    <>
                      {' '}
                      · CMV est. {formatMoney(marginSummary.costItems)} · Lucro bruto{' '}
                      {formatMoney(marginSummary.profitItems ?? 0)}
                      {marginSummary.marginPercent != null
                        ? ` · Margem ${marginSummary.marginPercent}%`
                        : ''}
                    </>
                  ) : (
                    <> · Sem custo cadastrado nos itens</>
                  )}
                </p>
                <p className="mb-0 mt-1 text-xs text-fal-muted">
                  Custo atual do cadastro (não congelado na venda). Frete e taxas fora do CMV.
                  {marginSummary.itemsMissingCost > 0
                    ? ` ${marginSummary.itemsMissingCost} item(ns) sem custo.`
                    : ''}
                </p>
              </>
            )}
          </div>
        ) : null}
        </div>
      </details>

      <details
        className="rounded-[14px] border border-fal-line bg-white open:shadow-sm"
        open={order.status === 'aguardando_pagamento'}
      >
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold text-fal-navy [&::-webkit-details-marker]:hidden">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>Pagamento</span>
            <span className="text-xs font-semibold text-fal-muted">
              {paymentStatusLabel(order.payment?.status ?? order.paymentRef)}
            </span>
          </span>
        </summary>
        <div className="border-t border-fal-line px-4 pb-4 pt-3">
        <p className="mt-0 mb-0 text-sm">
          Status:{' '}
          {paymentStatusLabel(order.payment?.status ?? order.paymentRef)} (
          {paymentProviderLabel(order.payment?.provider)})
          {order.payment?.method ? ` · ${paymentMethodLabel(order.payment.method)}` : ''}
        </p>
        {order.payment?.expiresAt ? (
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Expira: {new Date(order.payment.expiresAt).toLocaleString('pt-BR')}
            {order.payment.externalRef
              ? ` · Código da cobrança: ${order.payment.externalRef}`
              : ''}
          </p>
        ) : order.payment?.externalRef ? (
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Código da cobrança: {order.payment.externalRef}
          </p>
        ) : null}
        {order.status === 'aguardando_pagamento' ? (
          <p className="mt-2 mb-0 text-xs text-fal-muted">
            Aprovação só pelo provedor de pagamento — o painel não confirma pagamento manualmente.
            Pix do cliente vale 5 min (gera novo se expirar). Pedido sai da fila se não pago em 48 h.
          </p>
        ) : null}
        </div>
      </details>

      <section
        id="ops-conferencia"
        className={[
          'scroll-mt-20 rounded-[14px] border bg-white p-4',
          inAnalysis || inSeparation
            ? 'border-fal-navy/40 shadow-sm ring-1 ring-fal-navy/10'
            : 'border-fal-line',
        ].join(' ')}
      >
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">
          {inSeparation ? 'Separação dos itens' : inAnalysis ? 'Conferência dos itens' : 'Itens do pedido'}
        </h2>
        {inAnalysis ? (
          <p className="mb-0 mt-1 text-sm font-semibold text-fal-navy">
            Marque a disponibilidade de cada item e salve
            {order.items.length > 1
              ? ' — ou selecione vários e aplique a mesma regra de uma vez'
              : ''}
          </p>
        ) : null}
        {inSeparation ? (
          <p className="mb-0 mt-1 text-sm font-semibold text-fal-navy">
            Separe a quantidade integral por linha ({separatedCount}/{separableItems.length} a
            enviar). Itens indisponíveis ficam fora.
            {storePickup
              ? ' Retirada: volumes opcionais.'
              : shipKind === 'melhorenvio'
                ? ' Depois: confirme medidas para a etiqueta.'
                : shipKind === 'own'
                  ? ' Depois: confirme o envio.'
                  : ''}
          </p>
        ) : null}
        {order.inventoryModeAtOrder === 'com_estoque' ? (
          <p className="mb-0 mt-1 text-xs text-fal-muted">
            Pedido em modo com estoque — saldos físicos abaixo (quando cadastrados).
          </p>
        ) : null}

        {inAnalysis && order.items.length > 1 ? (
          <div className="mt-3 rounded-[12px] border border-fal-navy/25 bg-[#f4f7fb] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-sm font-extrabold text-fal-navy">
                Seleção · modificar global
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setSelectedItemIds(order.items.map((i) => i.id))}
                >
                  Selecionar todos ({order.items.length})
                </Button>
                <Button
                  type="button"
                  variant="light"
                  disabled={busy || selectedItemIds.length === 0}
                  onClick={() => setSelectedItemIds([])}
                >
                  Limpar seleção
                </Button>
              </div>
            </div>
            <p className="mb-0 mt-1 text-xs text-fal-muted">
              {selectedItemIds.length === 0
                ? 'Nenhum item selecionado'
                : `${selectedItemIds.length} de ${order.items.length} selecionado(s)`}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <label className="block text-sm md:col-span-1">
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                  Disponibilidade (global)
                </span>
                <select
                  className="w-full rounded-[9px] border border-fal-line bg-white px-3 py-2"
                  value={bulkDraft.availability}
                  disabled={busy}
                  onChange={(e) =>
                    setBulkDraft((prev) => ({
                      ...prev,
                      availability: e.target.value as OrderItemAvailability | '',
                      leadDays:
                        e.target.value === 'disponivel_com_prazo' ? prev.leadDays : '',
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
                label="Prazo (dias) global"
                type="number"
                min={1}
                disabled={busy || bulkDraft.availability !== 'disponivel_com_prazo'}
                value={bulkDraft.leadDays}
                onChange={(e) =>
                  setBulkDraft((prev) => ({ ...prev, leadDays: e.target.value }))
                }
              />
              <Input
                label="Obs. interna (opcional)"
                value={bulkDraft.staffNote}
                disabled={busy}
                onChange={(e) =>
                  setBulkDraft((prev) => ({ ...prev, staffNote: e.target.value }))
                }
              />
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || selectedItemIds.length === 0}
                  onClick={() => applyBulkToSelected()}
                >
                  Aplicar nos selecionados
                </Button>
                <Button
                  type="button"
                  disabled={busy || selectedItemIds.length === 0}
                  onClick={() => void saveSelectedItems()}
                >
                  Salvar selecionados
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-4">
          {order.items.map((it) => {
            const d = drafts[it.id] ?? { availability: '', leadDays: '', staffNote: '' }
            const showInv =
              order.inventoryModeAtOrder === 'com_estoque' &&
              (it.quantityOnHand != null || it.quantityReserved != null)
            const lineMargin = marginSummary?.lines.find((l) => l.itemId === it.id)
            const selected = selectedItemIds.includes(it.id)
            return (
              <div
                key={it.id}
                className={[
                  'rounded-[12px] border p-3',
                  inAnalysis && order.items.length > 1 && selected
                    ? 'border-fal-navy/50 bg-fal-navy/[0.03] ring-1 ring-fal-navy/15'
                    : 'border-fal-line',
                ].join(' ')}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {inAnalysis && order.items.length > 1 ? (
                      <label className="mt-0.5 flex shrink-0 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={busy}
                          aria-label={`Selecionar ${it.nameSnapshot}`}
                          onChange={(e) => toggleItemSelected(it.id, e.target.checked)}
                        />
                      </label>
                    ) : null}
                    <div className="min-w-0">
                    <div className="font-extrabold text-fal-navy">{it.nameSnapshot}</div>
                    <div className="text-xs text-fal-muted">
                      {SKU_FAL_LABEL} {it.sku} · qtd {it.quantity} ·{' '}
                      {formatMoney(it.unitPrice)}
                    </div>
                    {lineMargin && !marginBusy ? (
                      <div className="mt-1 text-xs text-fal-muted">
                        {lineMargin.missingCost
                          ? 'Custo: não cadastrado'
                          : `Custo unit. ${formatMoney(lineMargin.unitCost ?? 0)} · margem ${
                              lineMargin.marginPercent != null
                                ? `${lineMargin.marginPercent}%`
                                : '—'
                            }`}
                      </div>
                    ) : null}
                    {showInv ? (
                      <div className="mt-1 text-xs font-semibold text-fal-navy">
                        Estoque: on hand {it.quantityOnHand ?? '—'} · reservado{' '}
                        {it.quantityReserved ?? '—'} · pedido pede {it.quantity}
                      </div>
                    ) : null}
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
                  it.availability === 'indisponivel' ? (
                    <p className="mt-2 mb-0 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-800">
                      Indisponível — não separar / fora do envio
                    </p>
                  ) : (
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(it.separated)}
                        disabled={busy}
                        onChange={(e) => void toggleSeparated(it.id, e.target.checked)}
                      />
                      Item separado
                    </label>
                  )
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {(inAnalysis || inSeparation) && current ? (
        <OrderAnalysisResolutionPanel
          order={current}
          busy={busy || pending != null}
          onFinalize={() => setPending({ kind: 'finalize' })}
          onRequestDecision={runRequestDecisionWithKind}
          onHold={runHoldForAvailability}
          onWithdraw={
            current.status === 'aguardando_decisao' &&
            current.customerDecision !== 'continue_available' &&
            current.customerDecision !== 'authorized' &&
            current.customerDecision !== 'cancel_order' &&
            current.customerDecision !== 'rejected'
              ? () => void runWithdrawCustomerDecision()
              : undefined
          }
          onPrintSeparation={() => {
            if (!openSeparationList(current)) {
              toast.push(
                'Não foi possível abrir a lista de separação. Libere pop-ups para este site.',
                'error',
              )
            }
          }}
        />
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-[14px] border border-dashed border-fal-line bg-white px-3 py-3">
        {needsReception ? (
          <Button
            type="button"
            disabled={busy || pending != null}
            onClick={() => void startConfirmation()}
          >
            Iniciar análise do pedido
          </Button>
        ) : null}
        {inAnalysis ? (
          <>
            {(current.status === 'em_analise' ||
              current.status === 'aguardando_disponibilidade') && (
              <Button
                type="button"
                variant="outline"
                disabled={busy || pending != null}
                onClick={() => void runRequestCustomerDecision()}
              >
                Solicitar confirmação (legado / texto livre)
              </Button>
            )}
            <Button
              type="button"
              disabled={busy || pending != null || !canStaffFinalizeAnalysis}
              title={
                !canStaffFinalizeAnalysis
                  ? analysisMode === 'incomplete'
                    ? 'Defina a disponibilidade de todos os itens'
                    : analysisMode === 'has_unavailable'
                      ? 'Com item indisponível: peça decisão ao cliente ou espere a chegada'
                      : 'Aguarde o cliente ou retire a solicitação'
                  : undefined
              }
              onClick={() => setPending({ kind: 'finalize' })}
            >
              {current.status === 'aguardando_decisao' && customerAuthorizedPartial
                ? 'Confirmar pedido e enviar para separação (cliente autorizou)'
                : 'Confirmar pedido e enviar para separação'}
            </Button>
          </>
        ) : null}
        {inSeparation ? (
          <>
            {!allSeparated ? (
              <p className="w-full rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Separação incompleta ({separatedCount}/{separableItems.length} a enviar). Não
                conclua ainda. Itens indisponíveis ficam fora do envio.
              </p>
            ) : (
              <p className="w-full rounded-[10px] border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-950">
                Itens a enviar marcados — pode concluir a separação.
              </p>
            )}
            <Button
              type="button"
              variant="light"
              disabled={busy || pending != null}
              onClick={() => {
                if (!openSeparationList(order)) {
                  toast.push(
                    'Não foi possível abrir a lista de separação. Libere pop-ups para este site.',
                    'error',
                  )
                }
              }}
            >
              Imprimir lista de separação
            </Button>
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
              aria-disabled={!allSeparated}
            >
              Concluir separação e enviar para expedição
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

      {pending ? (
        <section
          className="rounded-[14px] border border-fal-navy/30 bg-[#f7f9fc] p-4"
          aria-live="polite"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">
            {PENDING_COPY[pending.kind].title}
          </h2>
          <p className="mt-1 mb-3 text-sm text-fal-muted">{PENDING_COPY[pending.kind].body}</p>
          {pending.kind === 'cancel' ? (
            <Input
              label="Motivo do cancelamento (obrigatório)"
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Ex.: item indisponível / pedido duplicado"
              required
            />
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || (pending.kind === 'cancel' && !cancelNote.trim())}
              onClick={() => confirmPending()}
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
        </section>
      ) : null}

      {/* Zona de ação logística: expedição em destaque; packing conforme modalidade */}
      {storePickup &&
      ['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(order.status) ? (
        <div
          id="ops-expedicao"
          className="scroll-mt-20 rounded-[14px] ring-1 ring-fal-navy/15"
        >
          <StorePickupPanel
            order={order}
            busy={busy}
            onBusy={setBusy}
            onReload={reload}
            onOk={pushOk}
            onError={pushError}
          />
        </div>
      ) : null}

      {!storePickup &&
      (order.status === 'pronto_para_envio' ||
        order.status === 'preparando_envio' ||
        ((orderShippingKind(order) === 'own' || orderUsesMelhorEnvio(order)) &&
          (order.status === 'enviado' || order.status === 'entregue'))) ? (
        <div id="ops-expedicao" className="scroll-mt-20 space-y-4">
          {orderUsesMelhorEnvio(order) ? (
            <>
              <div id="ops-volumes" className="scroll-mt-20">
                <OrderPackingPanel
                  order={order}
                  busy={busy}
                  onBusy={setBusy}
                  onReload={reload}
                  onOk={pushOk}
                  onError={pushError}
                />
              </div>
              <ContractedFreightSnapshotPanel order={order} />
              <div className="rounded-[14px] ring-1 ring-fal-navy/15">
                <MeExpeditionPanel
                  order={order}
                  busy={busy}
                  pendingShip={pending != null}
                  carrier={carrier}
                  service={service}
                  tracking={tracking}
                  trackingUrl={trackingUrl}
                  onCarrier={setCarrier}
                  onService={setService}
                  onTracking={setTracking}
                  onTrackingUrl={setTrackingUrl}
                  onRequestShip={() => setPending({ kind: 'ship' })}
                  onReload={() => reload()}
                  onMessage={(m) => {
                    if (m) pushOk(m)
                    else setError(null)
                  }}
                  onError={(m) => {
                    if (m) pushError(m)
                    else setError(null)
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <ContractedFreightSnapshotPanel order={order} />
              <div className="rounded-[14px] ring-1 ring-fal-navy/15">
                <OwnShipPanel
                  order={order}
                  kind={orderShippingKind(order) === 'own' ? 'own' : 'mock'}
                  busy={busy}
                  pendingShip={pending != null}
                  carrier={carrier}
                  service={service}
                  tracking={tracking}
                  onCarrier={setCarrier}
                  onService={setService}
                  onTracking={setTracking}
                  onRequestShip={() => setPending({ kind: 'ship' })}
                  onRequestDeliver={() => setPending({ kind: 'deliver' })}
                  proofRef={proofRef}
                  onProofRef={setProofRef}
                  onReload={() => reload()}
                  onOk={pushOk}
                  onError={(m) => {
                    if (m) pushError(m)
                    else setError(null)
                  }}
                />
              </div>
              {['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio'].includes(
                order.status,
              ) ? (
                <details className="rounded-[14px] border border-fal-line bg-white" open>
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-fal-muted [&::-webkit-details-marker]:hidden">
                    Volumes / medidas (own — registre divergência se necessário)
                  </summary>
                  <div id="ops-volumes" className="border-t border-fal-line p-0">
                    <OrderPackingPanel
                      order={order}
                      busy={busy}
                      onBusy={setBusy}
                      onReload={reload}
                      onOk={pushOk}
                      onError={pushError}
                    />
                  </div>
                </details>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {storePickup &&
      ['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(
        order.status,
      ) ? (
        <details className="rounded-[14px] border border-fal-line bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-fal-muted [&::-webkit-details-marker]:hidden">
            Volumes (opcional na retirada)
          </summary>
          <div id="ops-volumes" className="border-t border-fal-line">
            <OrderPackingPanel
              order={order}
              busy={busy}
              onBusy={setBusy}
              onReload={reload}
              onOk={pushOk}
              onError={pushError}
            />
          </div>
        </details>
      ) : null}

      {['confirmado', 'em_separacao'].includes(order.status) && !storePickup && shipKind === 'melhorenvio' ? (
        <>
          <ContractedFreightSnapshotPanel order={order} />
          <div id="ops-volumes" className="scroll-mt-20">
            <OrderPackingPanel
              order={order}
              busy={busy}
              onBusy={setBusy}
              onReload={reload}
              onOk={pushOk}
              onError={pushError}
            />
          </div>
        </>
      ) : null}

      <details className="rounded-[14px] border border-fal-line bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold text-fal-navy [&::-webkit-details-marker]:hidden">
          Financeiro do frete · ocorrências
        </summary>
        <div className="space-y-4 border-t border-fal-line p-4">
          <FreightFinancePanel
            order={order}
            busy={busy}
            onBusy={setBusy}
            onReload={reload}
            onOk={pushOk}
            onError={pushError}
          />
          <OrderOccurrencesPanel
            order={order}
            busy={busy}
            onBusy={setBusy}
            onReload={reload}
            onOk={pushOk}
            onError={pushError}
          />
        </div>
      </details>

      {/* ME em trânsito: confirmação de entrega. Retirada usa StorePickupPanel (“Cliente retirou”). */}
      {!storePickup &&
      orderUsesMelhorEnvio(order) &&
      (order.status === 'enviado' || order.status === 'entregue') ? (
        <section className="rounded-[14px] border border-fal-navy/30 bg-white p-4 ring-1 ring-fal-navy/10">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Entrega ao cliente</h2>
          <p className="mt-1 text-sm text-fal-muted">
            Etiqueta:{' '}
            {meLabelStateLabel(meLabelState(order.shipment?.metadata ?? null))}
            {order.shipment?.trackingCode
              ? ` · Rastreio: ${order.shipment.trackingCode}`
              : ''}
            {order.shipment?.carrier ? ` · ${order.shipment.carrier}` : ''}
          </p>
          {order.status === 'enviado' ? (
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
                  Confirmar entrega ao cliente
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 mb-0 text-sm font-semibold text-green-800">Entregue ao cliente.</p>
          )}
        </section>
      ) : null}

      <details className="rounded-[14px] border border-fal-line bg-fal-bg/30 open:bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold text-fal-navy [&::-webkit-details-marker]:hidden">
          Andamento do pedido
        </summary>
        <ol className="mb-0 list-none space-y-2 border-t border-fal-line px-4 py-3">
          {timeline.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-sm">
              <span
                className={
                  step.state === 'done'
                    ? 'font-extrabold text-fal-success'
                    : step.state === 'current'
                      ? 'font-extrabold text-fal-navy'
                      : 'text-fal-muted'
                }
              >
                {step.state === 'done' ? '✓' : step.state === 'current' ? '●' : '○'}
              </span>
              <span
                className={
                  step.state === 'todo' ? 'text-fal-muted' : 'font-semibold text-fal-ink'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </details>

      <details className="rounded-[14px] border border-fal-line bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold text-fal-navy [&::-webkit-details-marker]:hidden">
          Registros operacionais
        </summary>
        <div className="border-t border-fal-line px-4 pb-4 pt-2">
        <h2 className="sr-only">Registros operacionais</h2>
        <ul className="mt-2 mb-0 list-none space-y-2 p-0">
          {order.events.length === 0 ? (
            <li className="text-sm text-fal-muted">Sem eventos.</li>
          ) : (
            order.events.map((e) => {
              const reason =
                (typeof e.payload.reason === 'string' && e.payload.reason) ||
                (typeof e.payload.note === 'string' && e.payload.note) ||
                null
              return (
                <li key={e.id} className="rounded-[10px] bg-fal-bg px-3 py-2 text-sm">
                  <span className="font-semibold">
                    {orderEventLabel[e.eventType] ?? e.eventType}
                  </span>{' '}
                  <span className="text-xs text-fal-muted">
                    ({orderEventVisibilityLabel(e.visibility)}) · {formatDateTime(e.createdAt)}
                  </span>
                  {reason ? (
                    <span className="mt-1 block text-sm text-fal-ink">Motivo: {reason}</span>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>
        </div>
      </details>
    </div>
  )
}
