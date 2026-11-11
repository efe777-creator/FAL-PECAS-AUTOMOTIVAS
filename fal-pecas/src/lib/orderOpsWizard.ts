import { parseOrderPacking } from '@/lib/orderPacking'
import { orderUsesMelhorEnvio } from '@/lib/orderShippingKind'
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
 * Own/mock: etiqueta = skipped.
 */
export function buildOrderOpsWizard(order: AdminOrderDetail): OpsWizardStep[] {
  const st = order.status
  const packing = parseOrderPacking(order.shipment?.metadata ?? null)
  const hasVolumes = packing.volumes.length > 0
  const isMe = orderUsesMelhorEnvio(order)
  const allSeparated =
    order.items.length > 0 && order.items.every((i) => Boolean(i.separated))

  const confDone = ['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(st)
  const confCurrent = ['confirmado', 'em_separacao'].includes(st)
  const volDone = confDone || (confCurrent && hasVolumes)
  const volCurrent = confCurrent && !hasVolumes
  const freteDone = ['enviado', 'entregue'].includes(st) || (confDone && Boolean(order.shipment))
  const freteCurrent = confDone && !['enviado', 'entregue'].includes(st)
  const labelDone =
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
  const labelCurrent = isMe && freteCurrent && !labelDone
  const shipDone = ['enviado', 'entregue'].includes(st)
  const shipCurrent = confDone && !shipDone
  const delDone = st === 'entregue'
  const delCurrent = st === 'enviado'

  const steps: OpsWizardStep[] = [
    {
      id: 'conferencia',
      label: 'Conferência',
      anchor: 'ops-conferencia',
      state: confDone ? 'done' : confCurrent ? 'current' : 'todo',
    },
    {
      id: 'volumes',
      label: 'Volumes',
      anchor: 'ops-volumes',
      state: volDone ? 'done' : volCurrent ? 'current' : confCurrent || confDone ? 'todo' : 'todo',
    },
    {
      id: 'frete',
      label: isMe ? 'Frete ME' : 'Frete',
      anchor: 'ops-expedicao',
      state: freteDone ? 'done' : freteCurrent ? 'current' : 'todo',
    },
  ]

  if (isMe) {
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
      label: 'Despacho',
      anchor: 'ops-expedicao',
      state: shipDone ? 'done' : shipCurrent ? 'current' : 'todo',
    },
    {
      id: 'entrega',
      label: 'Entrega',
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

export function wizardHint(steps: OpsWizardStep[]): string {
  const cur = steps.find((s) => s.state === 'current')
  if (!cur) return 'Fluxo operacional concluído ou fora da expedição.'
  switch (cur.id) {
    case 'conferencia':
      return 'Separe e confira todos os itens antes de concluir a separação.'
    case 'volumes':
      return 'Registre L×A×P e peso de cada volume (cm/kg).'
    case 'frete':
      return 'Confira o frete do pedido (ME ou próprio).'
    case 'etiqueta':
      return 'Cotar → preparar → comprar → gerar → imprimir etiqueta ME.'
    case 'despacho':
      return 'Registre entrega à transportadora / envio (pedido → enviado).'
    case 'entrega':
      return 'Confirme a entrega ao cliente.'
    default:
      return ''
  }
}
