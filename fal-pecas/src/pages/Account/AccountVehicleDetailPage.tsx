import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { VehicleIdentityTimeline } from '@/components/garage/VehicleIdentityTimeline'
import { VehicleImageFrame } from '@/components/garage/VehicleImageFrame'
import { VehicleMaintenancesPanel } from '@/components/garage/VehicleMaintenancesPanel'
import { VehiclePhotoGallery } from '@/components/garage/VehiclePhotoGallery'
import { VehicleProfessionalsPanel } from '@/components/garage/VehicleProfessionalsPanel'
import {
  isVehicleIncomplete,
  vehicleCatalogHref,
  vehicleDisplayName,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import { useGarage } from '@/contexts/GarageContext'
import {
  parseGarageModule,
  writeGarageWorkspacePrefs,
  type GarageModuleKey,
} from '@/lib/garageWorkspacePrefs'
import {
  getSavedVehicle,
  removeSavedVehicle,
  setPrimaryVehicle,
  updateSavedVehicle,
} from '@/services/customers/customerVehicleService'
import { listVehicleAssets } from '@/services/customers/vehicleAssetService'
import {
  placeholderVehicleImage,
  resolveVehicleDisplayImage,
} from '@/services/customers/vehicleImageResolver'
import { getLatestOdometerKm } from '@/services/garage/odometerService'
import { formatPlateMask, plateValidationMessage } from '@/services/plates/plateNormalize'
import { formatSourceSnapshotExtras } from '@/services/plates/plateSourceSnapshot'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import type { CustomerSavedVehicle, ResolvedVehicleImage } from '@/types'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

const MODULE_TABS: { key: GarageModuleKey; label: string }[] = [
  { key: 'visao', label: 'Visão geral' },
  { key: 'historico', label: 'Histórico' },
  { key: 'manutencoes', label: 'Manutenções' },
  { key: 'profissionais', label: 'Profissionais' },
  { key: 'config', label: 'Configurações' },
]

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-fal border border-fal-line bg-fal-surface open:pb-1"
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-extrabold marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-xs font-semibold text-fal-muted">abrir / fechar</span>
        </span>
      </summary>
      <div className="border-t border-fal-line px-4 py-3 text-sm">{children}</div>
    </details>
  )
}

export function AccountVehicleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const garage = useGarage()
  const [vehicle, setVehicle] = useState<CustomerSavedVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [nickname, setNickname] = useState('')
  const [plate, setPlate] = useState('')
  const [colorHex, setColorHex] = useState('#808080')
  const [colorLabel, setColorLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [image, setImage] = useState<ResolvedVehicleImage>(placeholderVehicleImage())
  const [latestKm, setLatestKm] = useState<number | null>(null)
  const modulo = parseGarageModule(searchParams.get('modulo'))

  function setModulo(next: GarageModuleKey) {
    writeGarageWorkspacePrefs({ lastModule: next })
    const p = new URLSearchParams(searchParams)
    p.set('modulo', next)
    if (next !== 'historico') p.delete('modo')
    setSearchParams(p, { replace: true })
  }

  useDocumentTitle(
    vehicle
      ? `${vehicleDisplayName(vehicle)} | Minha Garagem`
      : 'Veículo | Minha Garagem',
  )

  async function refreshImage(row: CustomerSavedVehicle) {
    try {
      const assets = await listVehicleAssets(row.id)
      setImage(await resolveVehicleDisplayImage({ vehicle: row, assets }))
    } catch {
      setImage(placeholderVehicleImage())
    }
  }

  async function refreshKm(row: CustomerSavedVehicle) {
    if (!row.vehicleIdentityId) {
      setLatestKm(null)
      return
    }
    try {
      setLatestKm(await getLatestOdometerKm(row.vehicleIdentityId))
    } catch {
      setLatestKm(null)
    }
  }

  async function reload() {
    if (!id) {
      setError('Veículo não encontrado.')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const row = await getSavedVehicle(id)
      if (!row) {
        setVehicle(null)
        setError('Veículo não encontrado na sua garagem.')
      } else {
        setVehicle(row)
        setNickname(row.nickname ?? '')
        setPlate(row.plate ? formatPlateMask(row.plate) : '')
        setColorHex(row.colorHex || '#808080')
        setColorLabel(row.colorLabel ?? '')
        setNotes(row.notes ?? '')
        setError(null)
        await Promise.all([refreshImage(row), refreshKm(row)])
      }
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar veículo'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id
  }, [id])

  useEffect(() => {
    if (searchParams.get('edit') === '1') setEditing(true)
  }, [searchParams])

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!vehicle) return
    const plateRaw = plate.trim()
    if (plateRaw) {
      const msg = plateValidationMessage(plateRaw)
      if (msg) {
        toast.push(msg, 'error')
        return
      }
    }
    setSaving(true)
    try {
      const updated = await updateSavedVehicle(vehicle.id, {
        nickname: nickname.trim() || null,
        plate: plateRaw || null,
        colorHex: colorHex.trim() || null,
        colorLabel: colorLabel.trim() || null,
        notes: notes.trim() || null,
      })
      setVehicle(updated)
      setEditing(false)
      toast.push('Veículo atualizado.', 'success')
      navigate(`/conta/veiculos/${vehicle.id}`, { replace: true })
      await refreshImage(updated)
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao atualizar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (error || !vehicle) {
    return (
      <ErrorState
        message={error ?? 'Veículo não encontrado.'}
        onRetry={() => void reload()}
      />
    )
  }

  const plateLabel = vehiclePlateLabel(vehicle)
  const incomplete = isVehicleIncomplete(vehicle)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/conta/veiculos" className="font-semibold text-fal-auth-link hover:underline">
          ← Minha Garagem
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <VehicleImageFrame
          image={image}
          colorHex={vehicle.colorHex}
          title={vehicleDisplayName(vehicle)}
          className="min-h-[200px]"
        />

        <div className="space-y-3">
          <div>
            <h2 className="mt-0 mb-1 text-xl font-extrabold">{vehicleDisplayName(vehicle)}</h2>
            <p className="mb-0 text-sm text-fal-muted">{vehicleTechLine(vehicle) || '—'}</p>
            {vehicle.falCode ? (
              <p className="mb-0 mt-1 text-xs font-bold tabular-nums tracking-wide text-fal-muted">
                ID FAL · {vehicle.falCode}
              </p>
            ) : null}
            <p className="mb-0 mt-1 text-xs text-fal-muted">
              Quilometragem ·{' '}
              {latestKm != null ? (
                <span className="font-extrabold tabular-nums text-fal-fg">
                  {latestKm.toLocaleString('pt-BR')} km
                </span>
              ) : (
                <span className="font-semibold">Sem dado</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {garage.activeVehicle?.id !== vehicle.id ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  garage.setActiveVehicle(vehicle)
                  toast.push('Veículo ativo na loja (não altera o principal).', 'success')
                }}
              >
                Usar na loja
              </Button>
            ) : (
              <span className="inline-flex min-h-9 items-center rounded-[10px] border border-fal-accent/40 bg-fal-accent/10 px-3 text-xs font-extrabold text-fal-navy">
                Ativo na loja
              </span>
            )}
            <ButtonLink to={vehicleCatalogHref(vehicle)} variant="light" size="sm">
              {incomplete ? 'Buscar no catálogo' : 'Ver peças compatíveis'}
            </ButtonLink>
            <Button
              type="button"
              variant="light"
              size="sm"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Fechar edição' : 'Editar'}
            </Button>
            {!vehicle.isPrimary ? (
              <Button
                type="button"
                variant="light"
                size="sm"
                onClick={() =>
                  void setPrimaryVehicle(vehicle.id)
                    .then(async () => {
                      toast.push('Definido como principal.', 'success')
                      await reload()
                    })
                    .catch((err) =>
                      toast.push(toUserMessage(err, 'Falha ao definir principal'), 'error'),
                    )
                }
              >
                Definir principal
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                void (async () => {
                  const { confirmed } = await confirmDialog({
                    title: 'Remover veículo?',
                    message: 'Remover este veículo da sua garagem?',
                    confirmLabel: 'Remover',
                    danger: true,
                  })
                  if (!confirmed) return
                  try {
                    await removeSavedVehicle(vehicle.id)
                    await garage.notifyVehicleRemoved(vehicle.id)
                    toast.push('Veículo removido.', 'success')
                    navigate('/conta/veiculos')
                  } catch (err) {
                    toast.push(toUserMessage(err, 'Falha ao remover'), 'error')
                  }
                })()
              }}
            >
              Remover
            </Button>
          </div>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={onSaveEdit}
          className="grid max-w-2xl gap-3 rounded-fal border border-fal-line bg-fal-surface p-4 sm:grid-cols-2"
        >
          <Input
            label="Apelido"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            label="Placa"
            value={plate}
            onChange={(e) => setPlate(formatPlateMask(e.target.value))}
            placeholder="ABC1D23"
            autoComplete="off"
          />
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="vehicle-color">
              Cor
            </label>
            <div className="flex items-center gap-2">
              <input
                id="vehicle-color"
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : '#808080'}
                onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                className="h-11 w-14 cursor-pointer rounded-[10px] border border-fal-line bg-fal-bg p-1"
              />
              <Input
                label="Nome da cor"
                value={colorLabel}
                onChange={(e) => setColorLabel(e.target.value)}
                placeholder="Prata"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold" htmlFor="vehicle-notes">
              Observações
            </label>
            <textarea
              id="vehicle-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm text-fal-fg"
              placeholder="Notas pessoais (não alteram o cadastro técnico)"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              Salvar alterações
            </Button>
          </div>
        </form>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Módulos da garagem">
        {MODULE_TABS.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            size="sm"
            variant={modulo === tab.key ? 'primary' : 'light'}
            onClick={() => setModulo(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </nav>

      {modulo === 'historico' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleIdentityTimeline
            membershipId={vehicle.id}
            vehicleIdentityId={vehicle.vehicleIdentityId}
          />
        ) : (
          <ErrorState
            title="Identidade pendente"
            description="Este veículo ainda não tem identidade permanente. Atualize a página ou recadastre após a Etapa 1."
          />
        )
      ) : null}

      {modulo === 'manutencoes' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleMaintenancesPanel vehicleIdentityId={vehicle.vehicleIdentityId} />
        ) : (
          <ErrorState
            title="Identidade pendente"
            description="Manutenções exigem identidade permanente do veículo."
          />
        )
      ) : null}

      {modulo === 'profissionais' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleProfessionalsPanel vehicleIdentityId={vehicle.vehicleIdentityId} />
        ) : (
          <ErrorState
            title="Identidade pendente"
            description="Profissionais vinculados exigem identidade permanente."
          />
        )
      ) : null}

      {modulo === 'visao' || modulo === 'config' ? (
        <div className="space-y-2">
          {modulo === 'visao' ? (
            <>
              <Section title="Identificação" defaultOpen>
                <dl className="m-0 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Apelido</dt>
                    <dd className="m-0 font-semibold">{vehicle.nickname?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Placa</dt>
                    <dd className="m-0 font-semibold tracking-wide">{plateLabel ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">ID FAL</dt>
                    <dd className="m-0 font-semibold tabular-nums">{vehicle.falCode ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Km</dt>
                    <dd className="m-0 font-semibold">
                      {latestKm != null
                        ? `${latestKm.toLocaleString('pt-BR')} km`
                        : 'Sem dado'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Cor</dt>
                    <dd className="m-0 flex items-center gap-2 font-semibold">
                      {vehicle.colorHex ? (
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-fal-line"
                          style={{ background: vehicle.colorHex }}
                          aria-hidden
                        />
                      ) : null}
                      {vehicle.colorLabel || vehicle.colorHex || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Principal</dt>
                    <dd className="m-0 font-semibold">{vehicle.isPrimary ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Ativo na loja</dt>
                    <dd className="m-0 font-semibold">
                      {garage.activeVehicle?.id === vehicle.id
                        ? 'Sim (contexto de navegação)'
                        : 'Não'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Observações</dt>
                    <dd className="m-0 whitespace-pre-wrap">{vehicle.notes?.trim() || '—'}</dd>
                  </div>
                </dl>
              </Section>

              <Section title="Características técnicas" defaultOpen>
                <dl className="m-0 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Montadora</dt>
                    <dd className="m-0 font-semibold">{vehicle.makerName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Modelo</dt>
                    <dd className="m-0 font-semibold">{vehicle.modelName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Ano</dt>
                    <dd className="m-0 font-semibold">{vehicle.year ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Motor</dt>
                    <dd className="m-0 font-semibold">{vehicle.engine ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Versão</dt>
                    <dd className="m-0 font-semibold">{vehicle.versionName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-fal-muted">Vínculo canônico</dt>
                    <dd className="m-0 font-semibold">
                      {vehicle.versionId ? 'Vinculado ao cadastro' : 'Ainda sem version_id'}
                    </dd>
                  </div>
                  {formatSourceSnapshotExtras(vehicle.sourceSnapshot) ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase text-fal-muted">
                        Dados da consulta (informativo)
                      </dt>
                      <dd className="m-0 font-semibold">
                        {formatSourceSnapshotExtras(vehicle.sourceSnapshot)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Section>

              <Section title="Produtos / compatibilidade">
                <p className="m-0 text-fal-muted">
                  Com este veículo <strong>ativo na loja</strong>, o catálogo e a página do produto
                  mostram o veredito do motor (confirmada / provável / não confirmada) com
                  evidências.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {garage.activeVehicle?.id !== vehicle.id ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        garage.setActiveVehicle(vehicle)
                        toast.push('Veículo ativo — abra o catálogo para ver badges.', 'success')
                      }}
                    >
                      Usar na loja e ver peças
                    </Button>
                  ) : null}
                  <ButtonLink to={vehicleCatalogHref(vehicle)} variant="light" size="sm">
                    Abrir catálogo filtrado
                  </ButtonLink>
                </div>
              </Section>
            </>
          ) : null}

          {modulo === 'config' ? (
            <Section title="Fotos e personalização" defaultOpen>
              <VehiclePhotoGallery vehicleId={vehicle.id} onChanged={() => void reload()} />
            </Section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
