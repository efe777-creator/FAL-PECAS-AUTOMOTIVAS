import { isOrderPackingComplete, parseOrderPacking } from '@/lib/orderPacking'
import {
  isOrderStorePickup,
  orderShippingKind,
  orderUsesMelhorEnvio,
} from '@/lib/orderShippingKind'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'

export type OpsWizardStepId =
  | 'conferencia'
  | 'volumes'
  | 'frete'
  | 'etiqueta'
  | 'despacho'
  | 'entrega'

export type OpsWizardStep = {
  id: OpsWizardStepId
  label: string
  anchor: string
  state: 'done' | 'current' | 'todo' | 'skipped'
}

/**
 * Wizard operacional Fase 2: Conferência → Volumes → Frete → Etiqueta(ME) → Despacho.
 * Retirada: volumes opcionais (skipped); frete = retirada; etiqueta skipped.
 * Own/mock: etiqueta = skipped.
 */
export function buildOrderOpsWizard(order: AdminOrderDetail): OpsWizardStep[] {
  const st = order.status
  const pickup = isOrderStorePickup(order)
  const kind = orderShippingKind(order)
  const packingOptional = pickup || kind === 'own'
  const packing = parseOrderPacking(order.shipment?.metadata ?? null)
  const packingDone =
    packingOptional ||
    isOrderPackingComplete(
      packing,
      order.items.map((i) => ({ id: i.id, quantity: i.quantity })),
    )
  const allSeparated =
    order.items.length > 0 && order.items.every((i) => Boolean(i.separated))
  const isMe = orderUsesMelhorEnvio(order)

  const confDone = ['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(st)
  const confCurrent = ['confirmado', 'em_separacao'].includes(st)
  const volDone = packingOptional || confDone || (confCurrent && packingDone)
  const volCurrent = !packingOptional && confCurrent && !packingDone
  const freteDone = ['enviado', 'entregue'].includes(st) || (confDone && Boolean(order.shipment))
  const freteCurrent = confDone && !['enviado', 'entregue'].includes(st)
  const labelDone =
    pickup ||
    !isMe ||
    ['enviado', 'entregue'].includes(st) ||
    Boolean(
      order.shipment?.metadata &&
        typeof order.shipment.metadata === 'object' &&
        (order.shipment.metadata as { me?: { label_state?: string } }).me?.label_state &&
        ['purchased', 'generated', 'printed'].includes(
          String(
            (order.shipment.metadata as { me?: { label_state?: string } }).me?.label_state,
          ),
        ),
    )
  const labelCurrent = !pickup && isMe && freteCurrent && !labelDone
  const shipDone = ['enviado', 'entregue'].includes(st)
  const shipCurrent = confDone && !shipDone
  const delDone = st === 'entregue'
  const delCurrent = st === 'enviado'

  const pickupAuthorized = Boolean(
    order.shipment?.metadata &&
      typeof order.shipment.metadata === 'object' &&
      (order.shipment.metadata as { pickup?: { authorized_at?: unknown } }).pickup
        ?.authorized_at,
  )

  const freteLabel = pickup
    ? pickupAuthorized
      ? 'Retirada OK'
      : 'Autorizar retirada'
    : isMe
      ? 'Frete ME'
      : kind === 'own'
        ? 'Frete próprio'
        : 'Frete'

  const steps: OpsWizardStep[] = [
    {
      id: 'conferencia',
      label: 'Conferência',
      anchor: 'ops-conferencia',
      state: confDone ? 'done' : confCurrent ? 'current' : 'todo',
    },
    {
      id: 'volumes',
      label: packingOptional ? 'Volumes (opc.)' : 'Volumes',
      anchor: 'ops-volumes',
      state: packingOptional
        ? 'skipped'
        : volDone
          ? 'done'
          : volCurrent
            ? 'current'
            : confCurrent || confDone
              ? 'todo'
              : 'todo',
    },
    {
      id: 'frete',
      label: freteLabel,
      anchor: 'ops-expedicao',
      state: freteDone ? 'done' : freteCurrent ? 'current' : 'todo',
    },
  ]

  if (isMe && !pickup) {
    steps.push({
      id: 'etiqueta',
      label: 'Etiqueta',
      anchor: 'ops-expedicao',
      state: labelDone ? 'done' : labelCurrent ? 'current' : 'todo',
    })
  } else {
    steps.push({
      id: 'etiqueta',
      label: 'Etiqueta',
      anchor: 'ops-expedicao',
      state: 'skipped',
    })
  }

  steps.push(
    {
      id: 'despacho',
      label: pickup ? 'Liberar retirada' : 'Despacho',
      anchor: 'ops-expedicao',
      state: shipDone ? 'done' : shipCurrent ? 'current' : 'todo',
    },
    {
      id: 'entrega',
      label: pickup ? 'Cliente retirou' : 'Entrega',
      anchor: 'ops-expedicao',
      state: delDone ? 'done' : delCurrent ? 'current' : 'todo',
    },
  )

  // Uma única "current": a primeira não-done/não-skipped
  let sawCurrent = false
  return steps.map((s) => {
    if (s.state === 'skipped' || s.state === 'done') return s
    if (!sawCurrent && (s.state === 'current' || s.state === 'todo')) {
      // Se conferência atual mas itens não todos separated, permanece conferência
      if (s.id === 'volumes' && confCurrent && !allSeparated) {
        return { ...s, state: 'todo' }
      }
      sawCurrent = true
      return { ...s, state: 'current' }
    }
    return { ...s, state: 'todo' }
  })
}

export function wizardHint(steps: OpsWizardStep[], order?: AdminOrderDetail): string {
  const cur = steps.find((s) => s.state === 'current')
  if (!cur) return 'Fluxo operacional concluído ou fora da expedição.'
  const pickup = order ? isOrderStorePickup(order) : false
  const kind = order ? orderShippingKind(order) : 'unknown'
  switch (cur.id) {
    case 'conferencia':
      return pickup
        ? 'Retirada na loja: separe e confira os itens. Volumes não são obrigatórios para liberar a retirada.'
        : 'Separe e confira todos os itens. Medidas de volume costumam ser confirmadas após a separação.'
    case 'volumes':
      if (kind === 'melhorenvio') {
        return 'Melhor Envio: registre L×A×P e peso reais e aloque os itens — libera cotação/compra de etiqueta.'
      }
      if (kind === 'own') {
        return 'Frete próprio: registre volumes e peso antes de organizar a saída.'
      }
      return 'Registre L×A×P e peso de cada volume (cm/kg).'
    case 'frete':
      return pickup
        ? 'Autorize a retirada para o cliente ver “Pronto para retirar” no app.'
        : kind === 'melhorenvio'
          ? 'Confirme medidas → etiqueta Melhor Envio → despacho quando postar.'
          : kind === 'own'
            ? 'Confirme o envio (rastreio opcional). Combinar entrega ao vivo fica para depois.'
            : 'Confira o frete do pedido.'
    case 'etiqueta':
      return 'Cotar → preparar → comprar → gerar → imprimir etiqueta ME. Despacho é passo separado.'
    case 'despacho':
      return pickup
        ? 'Quando o cliente buscar, confirme “Cliente retirou”.'
        : kind === 'own'
          ? 'Confirme o envio; depois confirme a entrega ao cliente.'
          : 'Confirme o despacho agora ou depois; então informe obs/rastreio.'
    case 'entrega':
      return pickup
        ? 'Confirme que o cliente retirou o pedido.'
        : 'Confirme a entrega ao cliente.'
    default:
      return ''
  }
}
