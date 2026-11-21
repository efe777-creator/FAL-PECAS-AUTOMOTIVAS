import { VehicleImageFrame } from '@/components/garage/VehicleImageFrame'
import {
  vehiclePartsModuleHref,
  vehicleDisplayName,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import { GARAGE_MOBILE_SHORTCUTS } from '@/lib/garageNav'
import type { GarageModuleKey } from '@/lib/garageWorkspacePrefs'
import { writeGarageWorkspacePrefs } from '@/lib/garageWorkspacePrefs'
import {
  listInsightsForIdentity,
  type MaintenanceInsight,
} from '@/services/garage/maintenanceInsightService'
import { listIdentityTimeline, type TimelineItem } from '@/services/garage/vehicleEventService'
import { listVehicleAssets } from '@/services/customers/vehicleAssetService'
import {
  placeholderVehicleImage,
  resolveVehicleDisplayImage,
} from '@/services/customers/vehicleImageResolver'
import { getLatestOdometerKm } from '@/services/garage/odometerService'
import type { CustomerSavedVehicle, ResolvedVehicleImage } from '@/types'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Props = {
  primary: CustomerSavedVehicle
  vehicleCount: number
  onOpenAdd?: () => void
}

function moduleLink(id: string, key: GarageModuleKey) {
  writeGarageWorkspacePrefs({ lastModule: key })
  return `/conta/veiculos/${id}?modulo=${key}`
}

export function GarageDashboardBento({ primary, vehicleCount, onOpenAdd }: Props) {
  const navigate = useNavigate()
  const [image, setImage] = useState<ResolvedVehicleImage>(placeholderVehicleImage())
  const [km, setKm] = useState<number | null>(null)
  const [insights, setInsights] = useState<MaintenanceInsight[]>([])
  const [recent, setRecent] = useState<TimelineItem[]>([])
  const [counts, setCounts] = useState({ events: 0, care: 0 })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const assets = await listVehicleAssets(primary.id)
        const resolved = await resolveVehicleDisplayImage({ vehicle: primary, assets })
        if (!cancelled) setImage(resolved)
      } catch {
        if (!cancelled) setImage(placeholderVehicleImage())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [primary])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!primary.vehicleIdentityId) {
        if (!cancelled) {
          setKm(null)
          setInsights([])
          setRecent([])
          setCounts({ events: 0, care: 0 })
        }
        return
      }
      try {
        const [latest, ins, timeline] = await Promise.all([
          getLatestOdometerKm(primary.vehicleIdentityId),
          listInsightsForIdentity(primary.vehicleIdentityId),
          listIdentityTimeline({
            vehicleIdentityId: primary.vehicleIdentityId,
            membershipId: primary.id,
            mode: 'vida',
          }),
        ])
        if (cancelled) return
        setKm(latest)
        setInsights(ins.slice(0, 4))
        setRecent(timeline.slice(0, 4))
        setCounts({
          events: timeline.length,
          care: ins.filter((i) => i.kind === 'reminder').length,
        })
      } catch {
        if (!cancelled) {
          setInsights([])
          setRecent([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [primary])

  const plate = vehiclePlateLabel(primary)
  const detailHref = `/conta/veiculos/${primary.id}?modulo=visao`

  function goShortcut(key: GarageModuleKey) {
    navigate(moduleLink(primary.id, key))
  }

  return (
    <div className="space-y-4">
      {/* Mobile module grid */}
      <nav
        className="grid grid-cols-3 gap-2 lg:hidden"
        aria-label="Atalhos da garagem"
      >
        {GARAGE_MOBILE_SHORTCUTS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => goShortcut(item.key as GarageModuleKey)}
            className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-fal border border-fal-line bg-fal-surface px-2 text-center text-xs font-extrabold text-fal-fg"
          >
            <span className="text-base text-fal-navy dark:text-fal-yellow" aria-hidden>
              {item.glyph}
            </span>
            {item.shortLabel}
          </button>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Hero */}
        <article className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface lg:col-span-7">
          <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <VehicleImageFrame
              image={image}
              colorHex={primary.colorHex}
              title={vehicleDisplayName(primary)}
              className="min-h-[200px] rounded-none sm:min-h-[280px]"
            />
            <div className="flex flex-col gap-3 p-4 sm:p-5">
              <div>
                <span className="inline-flex rounded-full bg-fal-success/15 px-2.5 py-1 text-[11px] font-extrabold text-fal-success">
                  Veículo principal
                </span>
                <h2 className="mt-2 mb-1 text-xl font-extrabold text-fal-fg sm:text-2xl">
                  {vehicleDisplayName(primary)}
                </h2>
                <p className="m-0 text-sm text-fal-muted">
                  {vehicleTechLine(primary) || '—'}
                </p>
              </div>
              <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-fal-muted">Placa</dt>
                  <dd className="m-0 font-extrabold tracking-wide">{plate || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-fal-muted">Km</dt>
                  <dd className="m-0 font-extrabold">
                    {km != null ? `${km.toLocaleString('pt-BR')} km` : '—'}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  to={detailHref}
                  className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-4 text-sm font-extrabold text-white hover:bg-fal-navy-dark"
                >
                  Ver carro
                </Link>
                <Link
                  to={vehiclePartsModuleHref(primary)}
                  className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-4 text-sm font-extrabold text-fal-fg"
                >
                  Peças
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* Próximos cuidados */}
        <section className="rounded-fal border border-fal-line bg-fal-surface p-4 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-extrabold">Próximos cuidados</h3>
            <Link
              to={moduleLink(primary.id, 'inteligencia')}
              className="text-xs font-bold text-fal-accent hover:underline"
            >
              Ver cuidados
            </Link>
          </div>
          {!primary.vehicleIdentityId ? (
            <p className="m-0 text-sm text-fal-muted">
              Cadastro do veículo incompleto — cuidados aparecem após salvar.
            </p>
          ) : insights.length === 0 ? (
            <p className="m-0 text-sm text-fal-muted">
              Nenhum cuidado agendado. Adicione um lembrete.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {insights.map((ins) => (
                <li
                  key={ins.id}
                  className="rounded-[10px] border border-fal-line bg-fal-bg/50 px-3 py-2"
                >
                  <p className="m-0 text-sm font-extrabold text-fal-fg">{ins.title}</p>
                  <p className="m-0 text-xs text-fal-muted">{ins.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Histórico recente */}
        <section className="rounded-fal border border-fal-line bg-fal-surface p-4 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-extrabold">Histórico recente</h3>
            <Link
              to={moduleLink(primary.id, 'historico')}
              className="text-xs font-bold text-fal-accent hover:underline"
            >
              Ver histórico
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="m-0 text-sm text-fal-muted">Sem registros ainda.</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {recent.map((item) => (
                <li key={item.id} className="flex gap-2 text-sm">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fal-success"
                    aria-hidden
                  />
                  <span>
                    <span className="font-extrabold text-fal-fg">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-fal-muted">
                      {new Date(item.occurredAt).toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Preview visual secundário */}
        <section className="rounded-fal border border-fal-line bg-fal-navy p-4 text-white lg:col-span-4">
          <h3 className="m-0 text-sm font-extrabold text-fal-yellow">Visualização</h3>
          <p className="mt-1 text-xs text-white/70">
            Ilustração de referência — não é a foto do seu carro.
          </p>
          <div className="mt-3 overflow-hidden rounded-[12px] bg-black/30">
            {image.url ? (
              <img
                src={image.url}
                alt=""
                className="h-36 w-full object-contain"
              />
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-white/50">
                Sem preview
              </div>
            )}
          </div>
          <Link
            to={moduleLink(primary.id, 'mais')}
            className="mt-3 inline-flex min-h-10 items-center text-sm font-extrabold text-fal-yellow hover:underline"
          >
            Mais opções →
          </Link>
        </section>

        {/* Resumo */}
        <section className="rounded-fal border border-fal-line bg-fal-surface p-4 lg:col-span-4">
          <h3 className="m-0 text-sm font-extrabold">Resumo</h3>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[10px] bg-fal-bg px-2 py-3">
              <dt className="text-[10px] font-semibold uppercase text-fal-muted">Veículos</dt>
              <dd className="m-0 text-lg font-extrabold text-fal-navy dark:text-fal-yellow">
                {vehicleCount}
              </dd>
            </div>
            <div className="rounded-[10px] bg-fal-bg px-2 py-3">
              <dt className="text-[10px] font-semibold uppercase text-fal-muted">Histórico</dt>
              <dd className="m-0 text-lg font-extrabold text-fal-navy dark:text-fal-yellow">
                {counts.events}
              </dd>
            </div>
            <div className="rounded-[10px] bg-fal-bg px-2 py-3">
              <dt className="text-[10px] font-semibold uppercase text-fal-muted">Cuidados</dt>
              <dd className="m-0 text-lg font-extrabold text-fal-navy dark:text-fal-yellow">
                {counts.care}
              </dd>
            </div>
          </dl>
          {onOpenAdd ? (
            <button
              type="button"
              onClick={onOpenAdd}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[10px] border border-dashed border-fal-navy/40 text-sm font-extrabold text-fal-navy dark:border-fal-yellow/40 dark:text-fal-yellow"
            >
              + Adicionar veículo
            </button>
          ) : null}
        </section>
      </div>
    </div>
  )
}
