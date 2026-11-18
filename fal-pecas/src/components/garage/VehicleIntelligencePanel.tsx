import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  listInsightsForIdentity,
  type MaintenanceInsight,
} from '@/services/garage/maintenanceInsightService'
import {
  listMaintenanceSchedules,
  upsertMaintenanceSchedule,
  type MaintenanceSchedule,
  type ScheduleKind,
} from '@/services/garage/maintenanceScheduleService'
import { useCallback, useEffect, useState } from 'react'

export function VehicleIntelligencePanel({
  vehicleIdentityId,
}: {
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [insights, setInsights] = useState<MaintenanceInsight[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('Troca de óleo')
  const [kind, setKind] = useState<ScheduleKind>('both')
  const [days, setDays] = useState('180')
  const [km, setKm] = useState('10000')
  const [lastKm, setLastKm] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [ins, sch] = await Promise.all([
        listInsightsForIdentity(vehicleIdentityId),
        listMaintenanceSchedules(vehicleIdentityId),
      ])
      setInsights(ins)
      setSchedules(sch)
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar inteligência'), 'error')
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const intervalDays = days.trim() ? Number(days) : null
    const intervalKm = km.trim() ? Number(km) : null
    const lastDoneKm = lastKm.trim() ? Number(lastKm) : null
    if (kind !== 'km' && (!intervalDays || intervalDays <= 0)) {
      toast.push('Informe intervalo em dias', 'error')
      return
    }
    if (kind !== 'time' && (!intervalKm || intervalKm <= 0)) {
      toast.push('Informe intervalo em km', 'error')
      return
    }
    setSaving(true)
    try {
      await upsertMaintenanceSchedule({
        vehicleIdentityId,
        title: title.trim() || 'Lembrete',
        scheduleKind: kind,
        intervalDays: kind === 'km' ? null : intervalDays,
        intervalKm: kind === 'time' ? null : intervalKm,
        lastDoneAt: new Date().toISOString(),
        lastDoneKm:
          lastDoneKm != null && Number.isFinite(lastDoneKm) ? lastDoneKm : null,
        source: 'customer',
      })
      toast.push('Lembrete criado (não é diagnóstico)', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao criar lembrete'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Lembretes por tempo/km com fonte etiquetada. Estimativa ≠ diagnóstico — a FAL não afirma
        falha mecânica.
      </p>

      <form
        onSubmit={onCreate}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <Input label="Título" value={title} onChange={(ev) => setTitle(ev.target.value)} />
        <label className="block text-sm font-semibold">
          Tipo
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={kind}
            onChange={(ev) => setKind(ev.target.value as ScheduleKind)}
          >
            <option value="both">Tempo + km</option>
            <option value="time">Só tempo</option>
            <option value="km">Só km</option>
          </select>
        </label>
        {kind !== 'km' ? (
          <Input
            label="Intervalo (dias)"
            value={days}
            onChange={(ev) => setDays(ev.target.value)}
            inputMode="numeric"
          />
        ) : null}
        {kind !== 'time' ? (
          <Input
            label="Intervalo (km)"
            value={km}
            onChange={(ev) => setKm(ev.target.value)}
            inputMode="numeric"
          />
        ) : null}
        <Input
          label="Km na última vez (opcional)"
          value={lastKm}
          onChange={(ev) => setLastKm(ev.target.value)}
          inputMode="numeric"
        />
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Criar lembrete
          </Button>
        </div>
      </form>

      {loading ? (
        <Loading label="Calculando insights…" />
      ) : (
        <>
          <section>
            <h3 className="m-0 mb-2 text-sm font-extrabold">Alertas e lacunas</h3>
            {!insights.length ? (
              <EmptyState
                title="Nada a destacar"
                description="Com lembretes e km, os avisos aparecem aqui."
              />
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {insights.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
                  >
                    <p className="m-0 text-sm font-extrabold text-fal-fg">{i.title}</p>
                    <p className="m-0 mt-1 text-xs text-fal-muted">{i.detail}</p>
                    <p className="m-0 mt-1 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      {i.sourceLabel} · {i.confidence}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="m-0 mb-2 text-sm font-extrabold">Lembretes ativos</h3>
            {!schedules.length ? (
              <EmptyState title="Nenhum lembrete" description="Crie o primeiro acima." />
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {schedules.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-fal border border-fal-line px-3 py-2 text-xs font-semibold text-fal-muted"
                  >
                    {s.title}
                    {s.nextDueAt
                      ? ` · até ${new Date(s.nextDueAt).toLocaleDateString('pt-BR')}`
                      : ''}
                    {s.nextDueKm != null
                      ? ` · até ${s.nextDueKm.toLocaleString('pt-BR')} km`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
