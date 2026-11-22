import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { VehicleEvidencePanel } from '@/components/garage/VehicleEvidencePanel'
import { VehicleIdentityTimeline } from '@/components/garage/VehicleIdentityTimeline'
import { VehicleImageFrame } from '@/components/garage/VehicleImageFrame'
import { VehicleIntelligencePanel } from '@/components/garage/VehicleIntelligencePanel'
import { VehicleMaintenancesPanel } from '@/components/garage/VehicleMaintenancesPanel'
import { VehiclePhotoGallery } from '@/components/garage/VehiclePhotoGallery'
import { VehicleProfessionalsPanel } from '@/components/garage/VehicleProfessionalsPanel'
import { VehicleSharesPanel } from '@/components/garage/VehicleSharesPanel'
import { VehicleTransferPanel } from '@/components/garage/VehicleTransferPanel'
import { VehicleCompatiblePartsPanel } from '@/components/garage/VehicleCompatiblePartsPanel'
import { VehicleVisualPanel } from '@/components/garage/VehicleVisualPanel'
import {
  vehicleDisplayName,
  vehiclePartsModuleHref,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import { useGarage } from '@/contexts/GarageContext'
import {
  GARAGE_MODULE_TABS,
  GARAGE_MORE_ADVANCED_KEYS,
  GARAGE_MORE_LABELS,
  GARAGE_MORE_PRIMARY_KEYS,
} from '@/lib/garageNav'
import {
  GARAGE_MORE_MODULE_KEYS,
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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

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
  const tabHighlight: GarageModuleKey =
    modulo === 'visao' || modulo === 'historico' || modulo === 'pecas' || modulo === 'mais'
      ? modulo
      : 'mais'
  const inMoreBranch = (GARAGE_MORE_MODULE_KEYS as string[]).includes(modulo)

  const compactStage = modulo === 'pecas' || modulo === 'visual'
  const compactLabel = modulo === 'visual' ? 'Visualização' : 'Peças'

  return (
    <div className="space-y-4">
      {compactStage ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-fal border border-fal-line bg-fal-navy px-4 py-3 text-white dark:bg-fal-navy-dark">
          <div className="min-w-0">
            <h2 className="m-0 truncate text-base font-extrabold sm:text-lg">
              {vehicleDisplayName(vehicle)}
            </h2>
            <p className="mb-0 mt-0.5 truncate text-xs text-white/70">
              {vehicleTechLine(vehicle) || '—'}
              {plateLabel ? ` · ${plateLabel}` : ''}
            </p>
          </div>
          <p className="m-0 shrink-0 text-xs font-bold text-fal-yellow">{compactLabel}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-fal border border-fal-line bg-fal-navy/95 text-white dark:bg-fal-navy-dark">
          <VehicleImageFrame
            image={image}
            colorHex={vehicle.colorHex}
            title={vehicleDisplayName(vehicle)}
            className="min-h-[220px] rounded-none bg-transparent sm:min-h-[320px]"
          />
          <div className="space-y-3 border-t border-white/10 p-4 sm:p-5">
            <div>
              {vehicle.isPrimary ? (
                <span className="inline-flex rounded-full bg-fal-success/20 px-2.5 py-1 text-[11px] font-extrabold text-fal-success">
                  Veículo principal
                </span>
              ) : null}
              <h2 className="mt-2 mb-1 text-xl font-extrabold text-white sm:text-2xl">
                {vehicleDisplayName(vehicle)}
              </h2>
              <p className="mb-0 text-sm text-white/70">{vehicleTechLine(vehicle) || '—'}</p>
              {vehicle.falCode ? (
                <p className="mb-0 mt-1 text-xs font-bold tabular-nums tracking-wide text-white/55">
                  ID FAL · {vehicle.falCode}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] bg-black/25 px-2 py-2 text-center">
                <p className="m-0 text-[10px] font-semibold uppercase text-white/50">Placa</p>
                <p className="m-0 text-sm font-extrabold tracking-wide">{plateLabel || '—'}</p>
              </div>
              <div className="rounded-[10px] bg-black/25 px-2 py-2 text-center">
                <p className="m-0 text-[10px] font-semibold uppercase text-white/50">Status</p>
                <p className="m-0 text-sm font-extrabold text-fal-success">Na garagem</p>
              </div>
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
                <span className="inline-flex min-h-9 items-center rounded-[10px] border border-fal-yellow/50 bg-fal-yellow/15 px-3 text-xs font-extrabold text-fal-yellow">
                  Ativo na loja
                </span>
              )}
              <ButtonLink to={vehiclePartsModuleHref(vehicle)} variant="light" size="sm">
                Peças
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
      )}

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

      <nav
        className="sticky top-[3.25rem] z-10 -mx-1 flex gap-2 overflow-x-auto bg-fal-bg/95 px-1 py-2 backdrop-blur-sm lg:top-0"
        aria-label="Seções do veículo"
      >
        {GARAGE_MODULE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setModulo(tab.key)}
            className={[
              'min-h-11 shrink-0 rounded-[10px] border px-3 text-sm font-extrabold transition',
              tabHighlight === tab.key
                ? 'border-fal-navy bg-fal-navy text-white dark:border-fal-yellow dark:bg-fal-yellow dark:text-fal-navy-dark'
                : 'border-fal-line bg-fal-surface text-fal-muted hover:text-fal-fg',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
        {modulo !== 'visual' ? (
          <button
            type="button"
            onClick={() => setModulo('visual')}
            className="min-h-11 shrink-0 rounded-[10px] border border-fal-yellow/70 bg-fal-yellow/15 px-3 text-sm font-extrabold text-fal-navy dark:text-fal-yellow"
            title="Abrir visualização 3D / foto"
          >
            Visual
          </button>
        ) : null}
      </nav>

      {modulo === 'mais' ? (
        <section className="rounded-fal border border-fal-line bg-fal-surface p-4">
          <h3 className="mt-0 mb-1 text-base font-extrabold">Mais opções</h3>
          <p className="mt-0 mb-3 text-sm text-fal-muted">
            Visualização e configurações. O dia a dia fica em Resumo, Histórico e Peças.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GARAGE_MORE_PRIMARY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setModulo(key)}
                className="flex min-h-11 items-center justify-between rounded-[10px] border border-fal-line bg-fal-bg px-3 text-left text-sm font-extrabold text-fal-fg hover:border-fal-navy/40"
              >
                {GARAGE_MORE_LABELS[key] ?? key}
                <span aria-hidden className="text-fal-muted">
                  →
                </span>
              </button>
            ))}
          </div>
          <details className="mt-4 rounded-[10px] border border-fal-line bg-fal-bg/50">
            <summary className="cursor-pointer list-none px-3 py-3 text-sm font-extrabold marker:content-none [&::-webkit-details-marker]:hidden">
              Avançado (em breve)
            </summary>
            <p className="m-0 border-t border-fal-line px-3 py-2 text-xs text-fal-muted">
              Cuidados, manutenção e parceiros ficam aqui até a rede FAL Parceiros.
            </p>
            <div className="grid gap-2 border-t border-fal-line p-3 sm:grid-cols-2">
              {GARAGE_MORE_ADVANCED_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setModulo(key)}
                  className="flex min-h-11 items-center justify-between rounded-[10px] border border-fal-line bg-fal-surface px-3 text-left text-sm font-extrabold text-fal-fg hover:border-fal-navy/40"
                >
                  {GARAGE_MORE_LABELS[key] ?? key}
                  <span aria-hidden className="text-fal-muted">
                    →
                  </span>
                </button>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {inMoreBranch ? (
        <button
          type="button"
          onClick={() => setModulo('mais')}
          className="text-sm font-semibold text-fal-auth-link hover:underline"
        >
          ← Mais opções
        </button>
      ) : null}

      {modulo === 'historico' ? (
        <VehicleIdentityTimeline
          membershipId={vehicle.id}
          vehicleIdentityId={vehicle.vehicleIdentityId ?? vehicle.id}
        />
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

      {modulo === 'evidencias' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleEvidencePanel vehicleIdentityId={vehicle.vehicleIdentityId} />
        ) : (
          <ErrorState
            title="Identidade pendente"
            description="Evidências exigem identidade permanente."
          />
        )
      ) : null}

      {modulo === 'compartilhar' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleSharesPanel vehicleIdentityId={vehicle.vehicleIdentityId} />
        ) : (
          <ErrorState
            title="Identidade pendente"
            description="Compartilhamento exige identidade permanente."
          />
        )
      ) : null}

      {modulo === 'inteligencia' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleIntelligencePanel vehicleIdentityId={vehicle.vehicleIdentityId} />
        ) : (
          <ErrorState
            title="Cuidados indisponíveis"
            description="Complete o cadastro do veículo para adicionar lembretes."
          />
        )
      ) : null}

      {modulo === 'pecas' ? <VehicleCompatiblePartsPanel vehicle={vehicle} /> : null}

      {modulo === 'visual' ? (
        vehicle.vehicleIdentityId ? (
          <VehicleVisualPanel
            vehicleIdentityId={vehicle.vehicleIdentityId}
            membershipId={vehicle.id}
            seedColorHex={vehicle.colorHex}
            vehicle={vehicle}
          />
        ) : (
          <ErrorState
            title="Identidade pendente"
            description="Aparência visual exige identidade permanente."
          />
        )
      ) : null}

      {modulo === 'visao' || modulo === 'config' ? (
        <div className="space-y-2">
          {modulo === 'visao' ? (
            <>
              <div className="rounded-fal border border-fal-line bg-fal-surface p-4">
                <p className="m-0 text-sm font-extrabold text-fal-fg">Resumo</p>
                <p className="mt-1 mb-3 text-sm text-fal-muted">
                  Dados do veículo e atalhos para compras, peças e visualização.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModulo('historico')}
                    className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-bg px-3 text-sm font-extrabold"
                  >
                    Peças compradas
                  </button>
                  <button
                    type="button"
                    onClick={() => setModulo('pecas')}
                    className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-bg px-3 text-sm font-extrabold"
                  >
                    Peças que cabem
                  </button>
                  <button
                    type="button"
                    onClick={() => setModulo('visual')}
                    className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-bg px-3 text-sm font-extrabold"
                  >
                    Visualização
                  </button>
                </div>
              </div>
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
                      {vehicle.versionId
                        ? 'Versão vinculada ao cadastro'
                        : vehicle.modelId
                          ? 'Modelo vinculado; versão não identificada'
                          : 'Sem vínculo ao cadastro (só o que você informou)'}
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

            </>
          ) : null}

          {modulo === 'config' ? (
            <>
              <Section title="Fotos e personalização" defaultOpen>
                <VehiclePhotoGallery vehicleId={vehicle.id} onChanged={() => void reload()} />
              </Section>
              {vehicle.vehicleIdentityId ? (
                <Section title="Transferência de propriedade" defaultOpen>
                  <VehicleTransferPanel vehicleIdentityId={vehicle.vehicleIdentityId} />
                </Section>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
