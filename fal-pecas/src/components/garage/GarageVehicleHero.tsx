import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import {
  isVehicleIncomplete,
  vehicleCatalogHref,
  vehicleDisplayName,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import type { CustomerSavedVehicle } from '@/types'
import { Link } from 'react-router-dom'

type Props = {
  vehicle: CustomerSavedVehicle
  onSetPrimary?: () => void
  onRemove?: () => void
}

export function GarageVehicleHero({ vehicle, onSetPrimary, onRemove }: Props) {
  const plate = vehiclePlateLabel(vehicle)
  const incomplete = isVehicleIncomplete(vehicle)

  return (
    <article className="overflow-hidden rounded-fal border border-fal-navy/20 bg-fal-surface">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,220px)_1fr]">
        <div
          className="flex min-h-[140px] items-end bg-gradient-to-br from-fal-navy to-fal-navy-dark p-4 text-white lg:min-h-full"
          aria-hidden
        >
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-white/70">
              Veículo principal
            </p>
            <p className="mb-0 mt-1 text-2xl font-extrabold leading-tight">
              {vehicleDisplayName(vehicle)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <p className="m-0 text-sm text-fal-muted">{vehicleTechLine(vehicle) || '—'}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              {plate ? (
                <span className="rounded-[8px] border border-fal-line bg-fal-bg px-2.5 py-1 tracking-wide">
                  {plate}
                </span>
              ) : (
                <span className="rounded-[8px] border border-dashed border-fal-line px-2.5 py-1 text-fal-muted">
                  Sem placa
                </span>
              )}
              {incomplete ? (
                <span className="rounded-[8px] border border-fal-yellow/50 bg-fal-yellow/15 px-2.5 py-1 text-fal-navy-dark">
                  Cadastro incompleto
                </span>
              ) : (
                <span className="rounded-[8px] border border-fal-success/30 bg-fal-success/10 px-2.5 py-1 text-fal-success">
                  Versão vinculada
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/conta/veiculos/${vehicle.id}`} size="sm">
              Abrir
            </ButtonLink>
            <ButtonLink to={vehicleCatalogHref(vehicle)} variant="light" size="sm">
              {incomplete ? 'Buscar no catálogo' : 'Ver peças'}
            </ButtonLink>
            <Link
              to={`/conta/veiculos/${vehicle.id}?edit=1`}
              className="inline-flex min-h-9 items-center justify-center rounded-[10px] border border-fal-line bg-fal-surface px-3 text-xs font-extrabold text-fal-fg hover:bg-fal-bg"
            >
              Editar
            </Link>
            {!vehicle.isPrimary && onSetPrimary ? (
              <Button type="button" variant="light" size="sm" onClick={onSetPrimary}>
                Definir principal
              </Button>
            ) : null}
            {onRemove ? (
              <Button type="button" variant="danger" size="sm" onClick={onRemove}>
                Remover
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
