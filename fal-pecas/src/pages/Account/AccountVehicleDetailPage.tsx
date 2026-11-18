import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import {
  isVehicleIncomplete,
  vehicleCatalogHref,
  vehicleDisplayName,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import {
  getSavedVehicle,
  removeSavedVehicle,
  setPrimaryVehicle,
  updateSavedVehicle,
} from '@/services/customers/customerVehicleService'
import { formatPlateMask, plateValidationMessage } from '@/services/plates/plateNormalize'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import type { CustomerSavedVehicle } from '@/types'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

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
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [vehicle, setVehicle] = useState<CustomerSavedVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [nickname, setNickname] = useState('')
  const [plate, setPlate] = useState('')
  const [saving, setSaving] = useState(false)

  useDocumentTitle(
    vehicle
      ? `${vehicleDisplayName(vehicle)} | Minha Garagem`
      : 'Veículo | Minha Garagem',
  )

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
        setError(null)
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
      })
      setVehicle(updated)
      setEditing(false)
      toast.push('Veículo atualizado.', 'success')
      navigate(`/conta/veiculos/${vehicle.id}`, { replace: true })
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div
          className="flex min-h-[180px] items-end rounded-fal bg-gradient-to-br from-fal-navy to-fal-navy-dark p-5 text-white"
          aria-hidden
        >
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-white/70">
              {vehicle.isPrimary ? 'Principal' : 'Na garagem'}
            </p>
            <p className="mb-0 mt-1 text-2xl font-extrabold leading-tight">
              {vehicleDisplayName(vehicle)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="mt-0 mb-1 text-xl font-extrabold">{vehicleDisplayName(vehicle)}</h2>
            <p className="mb-0 text-sm text-fal-muted">{vehicleTechLine(vehicle) || '—'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={vehicleCatalogHref(vehicle)} size="sm">
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
          className="grid max-w-xl gap-3 rounded-fal border border-fal-line bg-fal-surface p-4 sm:grid-cols-2"
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
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              Salvar alterações
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
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
              <dt className="text-xs font-semibold uppercase text-fal-muted">Principal</dt>
              <dd className="m-0 font-semibold">{vehicle.isPrimary ? 'Sim' : 'Não'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-fal-muted">Contexto na loja</dt>
              <dd className="m-0 text-fal-muted">
                Seletor de veículo ativo chega na próxima etapa (G4).
              </dd>
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
          </dl>
        </Section>

        <Section title="Produtos / compatibilidade">
          <p className="m-0 text-fal-muted">
            Badges de compatibilidade (confirmada / provável / não confirmada) entram no motor G5.
            Por enquanto, abra o catálogo com o filtro deste veículo.
          </p>
          <div className="mt-3">
            <ButtonLink to={vehicleCatalogHref(vehicle)} variant="light" size="sm">
              Abrir catálogo filtrado
            </ButtonLink>
          </div>
        </Section>

        <Section title="Fotos e personalização">
          <p className="m-0 text-fal-muted">
            Cor, notas e galeria de fotos chegam na etapa G3.
          </p>
        </Section>

        <Section title="Histórico">
          <p className="m-0 text-fal-muted">
            Timeline de peças e eventos (compra, instalação) chega nas etapas G6–G7.
          </p>
        </Section>
      </div>
    </div>
  )
}
