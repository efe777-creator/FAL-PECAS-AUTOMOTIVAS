import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import {
  appendVehiclePartEvent,
  declareInstalled,
  hasSystemAssociatedForOrderItem,
  listVehiclePartEvents,
  type VehiclePartEvent,
} from '@/services/garage/vehiclePartEventService'
import type { OrderDetail } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * T10 — UX pós-compra: associar peça ao veículo / declarar instalação.
 * Append-only G7; compra ≠ instalação.
 */
export function OrderPostPurchaseGarageActions({ order }: { order: OrderDetail }) {
  const toast = useToast()
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; label: string }>
  >([])
  const [vehicleId, setVehicleId] = useState('')
  const [events, setEvents] = useState<VehiclePartEvent[]>([])
  const [busy, setBusy] = useState(false)

  const eligible = useMemo(() => {
    const paid = order.payment?.status === 'approved'
    const statusOk = [
      'pagamento_aprovado',
      'recebido',
      'preparando_envio',
      'pronto_para_envio',
      'enviado',
      'entregue',
    ].includes(order.status)
    // Prefer status (quando G7 dispara); payment approved ainda mostra UI com reload
    return statusOk || paid
  }, [order.payment?.status, order.status])

  const reloadEvents = useCallback(async (membershipId: string) => {
    if (!membershipId) {
      setEvents([])
      return
    }
    try {
      const all = await listVehiclePartEvents(membershipId)
      setEvents(all.filter((e) => e.orderId === order.id))
    } catch {
      setEvents([])
    }
  }, [order.id])

  useEffect(() => {
    if (!eligible) return
    void (async () => {
      try {
        const list = await listSavedVehicles()
        setVehicles(
          list.map((v) => ({
            id: v.id,
            label:
              v.nickname?.trim() ||
              [v.makerName, v.modelName, v.year].filter(Boolean).join(' ') ||
              v.falCode ||
              v.id.slice(0, 8),
          })),
        )
        const fromItems =
          order.items
            .map((i) => i.customerVehicleId || i.vehicleSnapshot?.customerVehicleId)
            .find((x): x is string => Boolean(x)) ?? ''
        const initial = fromItems || list[0]?.id || ''
        setVehicleId(initial)
        if (initial) await reloadEvents(initial)
      } catch {
        setVehicles([])
      }
    })()
  }, [eligible, order.items, reloadEvents])

  useEffect(() => {
    void reloadEvents(vehicleId)
  }, [vehicleId, reloadEvents])

  if (!eligible) return null

  async function associateItem(item: OrderDetail['items'][number]) {
    if (!vehicleId) {
      toast.push('Selecione um veículo da garagem', 'error')
      return
    }
    setBusy(true)
    try {
      await appendVehiclePartEvent({
        customerVehicleId: vehicleId,
        eventType: 'associated',
        productId: item.productId,
        orderId: order.id,
        orderItemId: item.id,
        payload: { sku: item.sku, name: item.nameSnapshot },
      })
      toast.push('Peça associada ao veículo (compra ≠ instalação)', 'success')
      await reloadEvents(vehicleId)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao associar'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function installFromBought(src: VehiclePartEvent) {
    if (!vehicleId) return
    setBusy(true)
    try {
      await declareInstalled({ customerVehicleId: vehicleId, sourceEvent: src })
      toast.push('Instalação declarada (não sobrescreve a compra)', 'success')
      await reloadEvents(vehicleId)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao declarar instalação'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const actionable = order.items.filter((i) => i.productId)

  return (
    <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
      <h3 className="mt-0 text-base font-extrabold">Garagem · pós-compra</h3>
      <p className="m-0 mb-3 text-xs text-fal-muted">
        Peças compradas com veículo ativo aparecem no Histórico da garagem. Associe só se a compra
        ainda não estiver vinculada.
      </p>

      <label className="mb-3 block text-sm font-semibold">
        Veículo
        <select
          className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
          value={vehicleId}
          onChange={(ev) => setVehicleId(ev.target.value)}
        >
          <option value="">Selecione…</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>

      {!vehicles.length ? (
        <p className="m-0 text-sm text-fal-muted">
          Cadastre um veículo em{' '}
          <Link to="/conta/veiculos" className="font-semibold text-fal-accent underline">
            Minha Garagem
          </Link>
          .
        </p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {actionable.map((item) => {
            const related = events.filter((e) => e.orderItemId === item.id || e.productId === item.productId)
            const boughtOrAssoc = related.find(
              (e) => e.eventType === 'bought' || e.eventType === 'associated',
            )
            const systemAssoc = hasSystemAssociatedForOrderItem(events, item.id)
            const installed = related.some((e) => e.eventType === 'installed_declared')
            const linked = Boolean(boughtOrAssoc || systemAssoc)
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2 text-sm last:border-0"
              >
                <span>
                  {item.nameSnapshot}
                  <span className="block text-xs text-fal-muted">
                    {installed
                      ? 'Instalação já declarada'
                      : linked
                        ? 'Já no histórico do veículo'
                        : 'Ainda sem vínculo na garagem'}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {!linked ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="light"
                      disabled={busy || !vehicleId}
                      onClick={() => void associateItem(item)}
                    >
                      Associar ao veículo
                    </Button>
                  ) : null}
                  {boughtOrAssoc && !installed ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !vehicleId}
                      onClick={() => void installFromBought(boughtOrAssoc)}
                    >
                      Declarar instalada
                    </Button>
                  ) : null}
                  {vehicleId ? (
                    <Link
                      to={`/conta/veiculos/${vehicleId}?modulo=historico`}
                      className="inline-flex min-h-9 items-center text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
                    >
                      Ver histórico
                    </Link>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
