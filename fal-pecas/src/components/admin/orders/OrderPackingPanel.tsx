import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  allocateAllToFirstVolume,
  buildItemsFingerprint,
  emptyPackingVolume,
  isOrderPackingComplete,
  parseOrderPacking,
  validatePackingAllocation,
  volumesFromContractedMeta,
  volumesToRpcPayload,
  type OrderPackingVolume,
  type PackingAllocationException,
} from '@/lib/orderPacking'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminSetOrderPacking,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import {
  isOrderStorePickup,
  orderShippingKind,
  orderUsesMelhorEnvio,
} from '@/lib/orderShippingKind'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  onBusy: (v: boolean) => void
  onReload: () => Promise<void>
  onOk: (msg: string) => void
  onError: (msg: string) => void
}

export function OrderPackingPanel({ order, busy, onBusy, onReload, onOk, onError }: Props) {
  const locked = ['enviado', 'entregue', 'cancelado'].includes(order.status)
  const [volumes, setVolumes] = useState<OrderPackingVolume[]>([])
  const [exceptionOn, setExceptionOn] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')

  const pickup = isOrderStorePickup(order)
  const kind = orderShippingKind(order)
  const isMe = orderUsesMelhorEnvio(order)
  const postSeparation = ['em_separacao', 'pronto_para_envio', 'preparando_envio'].includes(
    order.status,
  )
  // Packing obrigatório só no Melhor Envio; own/retirada liberam pós-separação sem packing.
  const packingRequired = !pickup && isMe

  const items = useMemo(
    () => order.items.map((i) => ({ id: i.id, quantity: i.quantity, name: i.nameSnapshot ?? i.sku })),
    [order.items],
  )

  useEffect(() => {
    const meta = order.shipment?.metadata ?? null
    const parsed = parseOrderPacking(meta)
    if (parsed.volumes.length) {
      setVolumes(parsed.volumes)
    } else {
      // Pré-preenche medidas da cotação e aloca itens no 1º volume (ainda precisa Salvar).
      const seeded = volumesFromContractedMeta(meta)
      if (seeded.length && items.length) {
        const qty = items.map((i) => ({ id: i.id, quantity: i.quantity }))
        setVolumes(allocateAllToFirstVolume({ volumes: seeded }, qty).volumes)
      } else {
        setVolumes(seeded)
      }
    }
    const exc = parsed.allocationException
    setExceptionOn(Boolean(exc?.active))
    setExceptionReason(exc?.reason ?? '')
  }, [order.id, order.shipment?.metadata, items])

  const itemQtys = useMemo(
    () => items.map((i) => ({ id: i.id, quantity: i.quantity })),
    [items],
  )

  const previewPacking = useMemo(() => {
    const allocationException: PackingAllocationException | null = exceptionOn
      ? { active: true, reason: exceptionReason }
      : null
    return {
      volumes,
      itemsFingerprint: buildItemsFingerprint(itemQtys),
      allocationException,
      allocationStatus: exceptionOn
        ? ('exception' as const)
        : validatePackingAllocation(
              { volumes, allocationException: null },
              itemQtys,
            ).ok
          ? ('complete' as const)
          : ('incomplete' as const),
    }
  }, [volumes, exceptionOn, exceptionReason, itemQtys])

  const complete = isOrderPackingComplete(previewPacking, itemQtys)
  const allocCheck = validatePackingAllocation(previewPacking, itemQtys)

  function updateVol(id: string, patch: Partial<OrderPackingVolume>) {
    setVolumes((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }

  function setLineQty(volumeId: string, orderItemId: string, quantity: number) {
    setVolumes((prev) =>
      prev.map((v) => {
        if (v.id !== volumeId) return v
        const others = (v.lines ?? []).filter((l) => l.orderItemId !== orderItemId)
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return { ...v, lines: others }
        }
        return { ...v, lines: [...others, { orderItemId, quantity: Math.floor(quantity) }] }
      }),
    )
  }

  function lineQty(volumeId: string, orderItemId: string): number {
    const vol = volumes.find((v) => v.id === volumeId)
    return vol?.lines?.find((l) => l.orderItemId === orderItemId)?.quantity ?? 0
  }

  function allocatedTotal(orderItemId: string): number {
    return volumes.reduce(
      (sum, v) => sum + (v.lines?.find((l) => l.orderItemId === orderItemId)?.quantity ?? 0),
      0,
    )
  }

  async function save() {
    if (!volumes.length) {
      if (pickup) {
        onOk('Retirada na loja: volumes opcionais — nada a salvar.')
        return
      }
      onError(
        packingRequired
          ? 'Para frete, adicione ao menos um volume com medidas e peso.'
          : 'Adicione ao menos um volume para registrar medidas.',
      )
      return
    }
    onBusy(true)
    try {
      const exception = exceptionOn
        ? { active: true, reason: exceptionReason.trim() }
        : null
      const res = await adminSetOrderPacking(
        order.id,
        volumesToRpcPayload(volumes),
        exception,
      )
      const st = res.allocation_status ?? (complete ? 'complete' : 'incomplete')
      onOk(
        st === 'complete' || st === 'exception'
          ? `Packing completo · ${volumes.length} volume(s)`
          : `Packing salvo (incompleto) · falta alocar itens`,
      )
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao salvar packing'))
    } finally {
      onBusy(false)
    }
  }

  const helpTitle = pickup
    ? 'Volumes (opcional — retirada na loja)'
    : isMe
      ? 'Volumes / embalagem (Melhor Envio)'
      : kind === 'own'
        ? 'Volumes / embalagem (entrega própria)'
        : 'Volumes / embalagem'

  const helpBody = pickup
    ? 'Retirada na loja: não é obrigatório cadastrar volumes para separar o pedido. Você pode registrar medidas se quiser. Confirme volumes/medidas após a separação, se for o caso.'
    : packingRequired
      ? postSeparation
        ? isMe
          ? 'Confirme ou altere as medidas da cotação (pré-preenchidas quando disponíveis) e aloque os itens. Isso libera a etiqueta Melhor Envio.'
          : 'Após a separação, confirme medidas se quiser documentar. No frete próprio o envio já fica liberado sem packing.'
        : 'Medidas da cotação podem aparecer pré-preenchidas. Confirme após a separação antes da etiqueta (ME).'
      : 'Registre volumes quando precisar documentar a embalagem.'

  const statusLine = pickup
    ? volumes.length === 0
      ? 'Retirada: packing não bloqueia separação.'
      : complete
        ? 'Medidas registradas (opcional).'
        : 'Medidas opcionais incompletas — não bloqueia retirada.'
    : complete
      ? 'Packing completo — liberado para etiqueta/expedição (se demais gates OK).'
      : packingRequired
        ? `Obrigatório para frete${allocCheck.reason ? ` — ${allocCheck.reason}` : ''}.`
        : `Incompleto${allocCheck.reason ? ` — ${allocCheck.reason}` : ''}.`

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">{helpTitle}</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          {helpBody}
          {locked ? ' Somente leitura após despacho.' : ''}
        </p>
        <p
          className={`mt-2 mb-0 text-sm font-semibold ${
            pickup || complete ? 'text-emerald-700' : 'text-amber-800'
          }`}
        >
          {statusLine}
        </p>
      </div>

      {items.length > 0 && (volumes.length > 0 || !pickup) ? (
        <div className="rounded-[12px] border border-fal-line bg-fal-bg/40 px-3 py-2">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Itens do pedido
          </p>
          <ul className="mb-0 mt-2 list-none space-y-1 p-0 text-sm">
            {items.map((it) => {
              const got = allocatedTotal(it.id)
              const ok = got === it.quantity
              return (
                <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-fal-navy">{it.name}</span>
                  <span className={ok ? 'text-emerald-700' : 'text-amber-800'}>
                    alocado {got}/{it.quantity}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {volumes.length === 0 ? (
        <p className="text-sm text-fal-muted">Nenhum volume registrado.</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {volumes.map((v, idx) => (
            <li key={v.id} className="rounded-[12px] border border-fal-line p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-fal-navy">Volume {idx + 1}</span>
                {!locked ? (
                  <Button
                    type="button"
                    variant="light"
                    disabled={busy}
                    onClick={() => setVolumes((prev) => prev.filter((x) => x.id !== v.id))}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Input
                  label="Comp. (cm)"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={String(v.lengthCm)}
                  disabled={locked || busy}
                  onChange={(e) => updateVol(v.id, { lengthCm: Number(e.target.value) })}
                />
                <Input
                  label="Larg. (cm)"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={String(v.widthCm)}
                  disabled={locked || busy}
                  onChange={(e) => updateVol(v.id, { widthCm: Number(e.target.value) })}
                />
                <Input
                  label="Alt. (cm)"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={String(v.heightCm)}
                  disabled={locked || busy}
                  onChange={(e) => updateVol(v.id, { heightCm: Number(e.target.value) })}
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  min={0}
                  step={0.01}
                  value={String(v.weightKg)}
                  disabled={locked || busy}
                  onChange={(e) => updateVol(v.id, { weightKg: Number(e.target.value) })}
                />
                <Input
                  label="Obs."
                  value={v.notes ?? ''}
                  disabled={locked || busy}
                  onChange={(e) => updateVol(v.id, { notes: e.target.value })}
                />
              </div>

              {!exceptionOn && items.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-fal-line pt-3">
                  <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                    Itens neste volume
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((it) => (
                      <Input
                        key={`${v.id}-${it.id}`}
                        label={`${it.name} (qty)`}
                        type="number"
                        min={0}
                        step={1}
                        value={String(lineQty(v.id, it.id))}
                        disabled={locked || busy}
                        onChange={(e) => setLineQty(v.id, it.id, Number(e.target.value))}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!locked && (!pickup || volumes.length > 0) ? (
        <div className="space-y-3 rounded-[12px] border border-dashed border-fal-line p-3">
          <label className="flex items-start gap-2 text-sm text-fal-navy">
            <input
              type="checkbox"
              className="mt-1"
              checked={exceptionOn}
              disabled={busy}
              onChange={(e) => setExceptionOn(e.target.checked)}
            />
            <span>
              Exceção de alocação (sem mapear SKU↔volume) — exige justificativa e autorização
              staff.
            </span>
          </label>
          {exceptionOn ? (
            <Input
              label="Justificativa da exceção"
              value={exceptionReason}
              disabled={busy}
              onChange={(e) => setExceptionReason(e.target.value)}
            />
          ) : null}
        </div>
      ) : null}

      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="light"
            disabled={busy}
            onClick={() => setVolumes((prev) => [...prev, emptyPackingVolume()])}
          >
            + Volume
          </Button>
          {!exceptionOn && volumes.length > 0 && items.length > 0 ? (
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => {
                const next = allocateAllToFirstVolume({ volumes }, itemQtys)
                setVolumes(next.volumes)
              }}
            >
              Alocar tudo no 1º volume
            </Button>
          ) : null}
          {volumes.length > 0 ? (
            <Button type="button" disabled={busy} onClick={() => void save()}>
              Salvar packing
            </Button>
          ) : pickup ? (
            <p className="m-0 self-center text-sm text-fal-muted">
              Sem volumes — ok para separar. Use “+ Volume” só se quiser registrar medidas.
            </p>
          ) : (
            <Button type="button" disabled>
              Salvar packing
            </Button>
          )}
        </div>
      ) : null}
    </section>
  )
}
