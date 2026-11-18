import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  appendVehicleMaintenance,
  listVehicleMaintenances,
  type VehicleMaintenance,
} from '@/services/garage/maintenanceService'
import {
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABEL,
  type MaintenanceType,
} from '@/services/garage/maintenanceTypes'
import {
  listMyProfessionalProfiles,
  type ProfessionalProfile,
} from '@/services/garage/professionalProfileService'
import { VEHICLE_VALIDATION_LABEL } from '@/services/garage/vehicleEventTypes'
import { useCallback, useEffect, useState } from 'react'

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

export function VehicleMaintenancesPanel({
  vehicleIdentityId,
}: {
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [items, setItems] = useState<VehicleMaintenance[]>([])
  const [pros, setPros] = useState<ProfessionalProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<MaintenanceType>('preventiva')
  const [km, setKm] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [costReais, setCostReais] = useState('')
  const [professionalId, setProfessionalId] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([
        listVehicleMaintenances(vehicleIdentityId),
        listMyProfessionalProfiles(),
      ])
      setItems(m)
      setPros(p)
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar manutenções'), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      toast.push('Informe um título', 'error')
      return
    }
    const kmNum = km.trim() ? Number(km) : null
    if (km.trim() && (!Number.isFinite(kmNum) || (kmNum as number) < 0)) {
      toast.push('Quilometragem inválida', 'error')
      return
    }
    let costCents: number | null = null
    if (costReais.trim()) {
      const reais = Number(costReais.replace(',', '.'))
      if (!Number.isFinite(reais) || reais < 0) {
        toast.push('Custo inválido', 'error')
        return
      }
      costCents = Math.round(reais * 100)
    }

    setSaving(true)
    try {
      await appendVehicleMaintenance({
        vehicleIdentityId,
        maintenanceType: type,
        title: t,
        description: description.trim() || null,
        odometerKm: kmNum,
        createOdometerRecord: kmNum != null,
        workshopName: workshop.trim() || null,
        costCents,
        professionalId: professionalId || null,
      })
      setTitle('')
      setDescription('')
      setKm('')
      setWorkshop('')
      setCostReais('')
      setProfessionalId('')
      toast.push('Manutenção registrada', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao registrar manutenção'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Instalação não nasce de compra — só de registro explícito. Profissional vinculado não
        recebe acesso automático à garagem.
      </p>

      <form
        onSubmit={onSubmit}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <label className="block text-sm font-semibold">
          Tipo
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={type}
            onChange={(ev) => setType(ev.target.value as MaintenanceType)}
          >
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {MAINTENANCE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <Input label="Título" value={title} onChange={(ev) => setTitle(ev.target.value)} />
        <div className="sm:col-span-2">
          <Input
            label="Descrição (opcional)"
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
          />
        </div>
        <Input
          label="Km (opcional)"
          value={km}
          onChange={(ev) => setKm(ev.target.value)}
          inputMode="numeric"
        />
        <Input
          label="Oficina (opcional)"
          value={workshop}
          onChange={(ev) => setWorkshop(ev.target.value)}
        />
        <Input
          label="Custo R$ (opcional)"
          value={costReais}
          onChange={(ev) => setCostReais(ev.target.value)}
          inputMode="decimal"
        />
        <label className="block text-sm font-semibold">
          Profissional (opcional)
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={professionalId}
            onChange={(ev) => setProfessionalId(ev.target.value)}
          >
            <option value="">Nenhum</option>
            {pros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({p.falCode})
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Registrar manutenção
          </Button>
        </div>
      </form>

      {loading ? (
        <Loading label="Carregando manutenções…" />
      ) : !items.length ? (
        <EmptyState
          title="Nenhuma manutenção"
          description="Registre preventiva, corretiva, inspeção ou instalação explícita."
        />
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-extrabold text-fal-fg">
                  {item.title ?? 'Manutenção'}
                </span>
                {item.occurredAt ? (
                  <time className="text-xs text-fal-muted" dateTime={item.occurredAt}>
                    {formatWhen(item.occurredAt)}
                  </time>
                ) : null}
              </div>
              <p className="m-0 mt-1 text-xs font-semibold text-fal-muted">
                {MAINTENANCE_TYPE_LABEL[item.maintenanceType]}
                {item.validationState
                  ? ` · ${VEHICLE_VALIDATION_LABEL[item.validationState as keyof typeof VEHICLE_VALIDATION_LABEL] ?? item.validationState}`
                  : ''}
                {item.odometerKm != null
                  ? ` · ${item.odometerKm.toLocaleString('pt-BR')} km`
                  : ''}
                {item.workshopName ? ` · ${item.workshopName}` : ''}
                {item.costCents != null
                  ? ` · R$ ${(item.costCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
