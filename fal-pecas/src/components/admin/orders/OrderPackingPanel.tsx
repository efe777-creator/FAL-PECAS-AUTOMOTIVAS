import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  emptyPackingVolume,
  parseOrderPacking,
  volumesToRpcPayload,
  type OrderPackingVolume,
} from '@/lib/orderPacking'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminSetOrderPacking,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import { useEffect, useState } from 'react'

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

  useEffect(() => {
    const parsed = parseOrderPacking(order.shipment?.metadata ?? null)
    setVolumes(parsed.volumes.length ? parsed.volumes : [])
  }, [order.id, order.shipment?.metadata])

  function updateVol(id: string, patch: Partial<OrderPackingVolume>) {
    setVolumes((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }

  async function save() {
    if (!volumes.length) {
      onError('Adicione ao menos um volume.')
      return
    }
    onBusy(true)
    try {
      await adminSetOrderPacking(order.id, volumesToRpcPayload(volumes))
      onOk(`Packing salvo · ${volumes.length} volume(s)`)
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao salvar packing'))
    } finally {
      onBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Volumes / embalagem</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Fonte neutra do pedido (cm / kg). Não grava em metadata Melhor Envio.
          {locked ? ' Somente leitura após despacho.' : ''}
        </p>
      </div>

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
            </li>
          ))}
        </ul>
      )}

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
          <Button type="button" disabled={busy || volumes.length === 0} onClick={() => void save()}>
            Salvar packing
          </Button>
        </div>
      ) : null}
    </section>
  )
}
