import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  appendVehicleEvent,
  listIdentityTimeline,
  type TimelineItem,
  type TimelineMode,
} from '@/services/garage/vehicleEventService'
import {
  VEHICLE_EVENT_CATEGORIES,
  VEHICLE_EVENT_CATEGORY_LABEL,
  VEHICLE_VALIDATION_LABEL,
  type VehicleEventCategory,
} from '@/services/garage/vehicleEventTypes'
import { recordOdometer } from '@/services/garage/odometerService'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

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

export function VehicleIdentityTimeline({
  membershipId,
  vehicleIdentityId,
}: {
  membershipId: string
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = (searchParams.get('modo') === 'meu' ? 'meu' : 'vida') as TimelineMode
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<VehicleEventCategory>('manutencao')
  const [km, setKm] = useState('')
  const [saving, setSaving] = useState(false)

  const setMode = (next: TimelineMode) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('modulo', 'historico')
    nextParams.set('modo', next)
    setSearchParams(nextParams, { replace: true })
  }

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(
        await listIdentityTimeline({
          vehicleIdentityId,
          membershipId,
          mode,
        }),
      )
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar timeline'), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, membershipId, mode, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onRegister(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      toast.push('Informe um título', 'error')
      return
    }
    setSaving(true)
    try {
      const kmNum = km.trim() ? Number(km) : null
      if (km.trim() && (!Number.isFinite(kmNum) || (kmNum as number) < 0)) {
        throw new Error('Quilometragem inválida')
      }
      await appendVehicleEvent({
        vehicleIdentityId,
        category,
        title: t,
        odometerKm: kmNum,
        createOdometerRecord: kmNum != null,
      })
      if (kmNum != null && category === 'quilometragem') {
        // append já pode criar odometer; se só km sem create flag, recordOdometer
      }
      setTitle('')
      setKm('')
      toast.push('Acontecimento registrado', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao registrar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onQuickKm() {
    const kmNum = Number(km)
    if (!Number.isFinite(kmNum) || kmNum < 0) {
      toast.push('Informe a quilometragem', 'error')
      return
    }
    setSaving(true)
    try {
      await recordOdometer({ vehicleIdentityId, km: kmNum })
      await appendVehicleEvent({
        vehicleIdentityId,
        category: 'quilometragem',
        title: `Odômetro ${kmNum.toLocaleString('pt-BR')} km`,
        odometerKm: kmNum,
        createOdometerRecord: false,
      })
      setKm('')
      toast.push('Quilometragem registrada', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao registrar km'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'vida' ? 'primary' : 'light'}
          onClick={() => setMode('vida')}
        >
          Vida completa
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'meu' ? 'primary' : 'light'}
          onClick={() => setMode('meu')}
        >
          Meu período
        </Button>
      </div>
      <p className="m-0 text-xs text-fal-muted">
        Compra, recebimento e instalação são acontecimentos distintos. Só o que você está
        autorizado a ver aparece aqui (sem contagens de ocultos).
      </p>

      <form
        onSubmit={onRegister}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <label className="block text-sm font-semibold sm:col-span-2">
          Categoria
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={category}
            onChange={(ev) => setCategory(ev.target.value as VehicleEventCategory)}
          >
            {VEHICLE_EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {VEHICLE_EVENT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <Input label="Título" value={title} onChange={(ev) => setTitle(ev.target.value)} />
        </div>
        <Input
          label="Km (opcional)"
          value={km}
          onChange={(ev) => setKm(ev.target.value)}
          inputMode="numeric"
        />
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            Registrar acontecimento
          </Button>
          <Button
            type="button"
            size="sm"
            variant="light"
            disabled={saving}
            onClick={() => void onQuickKm()}
          >
            Só atualizar km
          </Button>
        </div>
      </form>

      {loading ? (
        <Loading label="Carregando histórico…" />
      ) : !items.length ? (
        <EmptyState
          title="Nenhum acontecimento visível"
          description="Registre uma manutenção ou aguarde compras FAL vinculadas a este veículo."
        />
      ) : (
        <ol className="m-0 list-none space-y-3 p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-extrabold text-fal-fg">{item.title}</span>
                <time className="text-xs text-fal-muted" dateTime={item.occurredAt}>
                  {formatWhen(item.occurredAt)}
                </time>
              </div>
              <p className="m-0 mt-1 text-xs font-semibold text-fal-muted">
                {VEHICLE_EVENT_CATEGORY_LABEL[item.category]}
                {item.validationState
                  ? ` · ${VEHICLE_VALIDATION_LABEL[item.validationState]}`
                  : ''}
                {item.odometerKm != null
                  ? ` · ${item.odometerKm.toLocaleString('pt-BR')} km`
                  : ''}
                {item.source === 'g7' ? ' · comércio FAL' : ''}
              </p>
              {item.description ? (
                <p className="m-0 mt-1 text-sm text-fal-fg">{item.description}</p>
              ) : null}
              {item.orderId ? (
                <Link
                  to={`/conta/pedidos/${item.orderId}`}
                  className="mt-2 inline-block text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
                >
                  Ver pedido
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
