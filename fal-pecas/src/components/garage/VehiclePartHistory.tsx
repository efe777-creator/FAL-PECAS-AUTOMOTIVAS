/**
 * @deprecated Fundação 2026-11-21: histórico oficial = VehicleIdentityTimeline (compras G7).
 * Não montar em páginas novas; mantido só para referência / possíveis deep-links internos.
 */
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  declareInstalled,
  eventProductLabel,
  listVehiclePartEvents,
  VEHICLE_PART_EVENT_LABEL,
  type VehiclePartEvent,
} from '@/services/garage/vehiclePartEventService'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function VehiclePartHistory({ vehicleId }: { vehicleId: string }) {
  const toast = useToast()
  const [events, setEvents] = useState<VehiclePartEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setEvents(await listVehiclePartEvents(vehicleId))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar histórico'), 'error')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [vehicleId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onDeclareInstalled(source: VehiclePartEvent) {
    setBusyId(source.id)
    try {
      await declareInstalled({ customerVehicleId: vehicleId, sourceEvent: source })
      toast.push('Instalação registrada (compra permanece no histórico).', 'success')
      await reload()
    } catch (e) {
      toast.push(toUserMessage(e, 'Não foi possível registrar a instalação'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Loading label="Carregando histórico…" />

  if (!events.length) {
    return (
      <EmptyState
        title="Nenhum evento ainda"
        description="Quando uma compra com este veículo for paga, a peça aparece aqui. Instalação e correções viram novos eventos — a compra não é alterada."
      />
    )
  }

  return (
    <ol className="m-0 list-none space-y-3 p-0">
      {events.map((ev) => {
        const canInstall =
          ev.eventType === 'bought' ||
          ev.eventType === 'associated' ||
          ev.eventType === 'awaiting_install'
        return (
          <li
            key={ev.id}
            className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-extrabold text-fal-fg">
                {VEHICLE_PART_EVENT_LABEL[ev.eventType]}
              </span>
              <time className="text-xs text-fal-muted" dateTime={ev.createdAt}>
                {formatWhen(ev.createdAt)}
              </time>
            </div>
            <p className="m-0 mt-1 text-sm text-fal-fg">{eventProductLabel(ev)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {ev.orderId ? (
                <Link
                  to={`/conta/pedidos/${ev.orderId}`}
                  className="text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
                >
                  Ver pedido
                </Link>
              ) : null}
              {canInstall ? (
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  disabled={busyId === ev.id}
                  onClick={() => void onDeclareInstalled(ev)}
                >
                  Declarar instalada
                </Button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
