import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import {
  isVehicleIncomplete,
  vehicleDisplayName,
  vehiclePartsModuleHref,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import type { CustomerSavedVehicle } from '@/types'
import { Link } from 'react-router-dom'

type Props = {
  vehicle: CustomerSavedVehicle
  isActive?: boolean
  onUseInStore?: () => void
  onSetPrimary?: () => void
  onRemove?: () => void
}

export function GarageVehicleCard({
  vehicle,
  isActive,
  onUseInStore,
  onSetPrimary,
  onRemove,
}: Props) {
  const plate = vehiclePlateLabel(vehicle)
  const incomplete = isVehicleIncomplete(vehicle)

  return (
    <article className="rounded-fal border border-fal-line bg-fal-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 font-extrabold">
            <Link
              to={`/conta/veiculos/${vehicle.id}`}
              className="text-fal-fg hover:text-fal-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent"
            >
              {vehicleDisplayName(vehicle)}
            </Link>
            {vehicle.isPrimary ? (
              <span className="text-xs font-bold text-fal-success"> · Principal</span>
            ) : null}
            {isActive ? (
              <span className="text-xs font-bold text-fal-accent"> · Ativo</span>
            ) : null}
          </p>
          <p className="mb-0 mt-1 text-sm text-fal-muted">{vehicleTechLine(vehicle) || '—'}</p>
          <p className="mb-0 mt-1 text-sm">
            {plate ? (
              <span className="font-semibold tracking-wide">{plate}</span>
            ) : (
              <span className="text-fal-muted">Sem placa</span>
            )}
            {incomplete ? (
              <span className="text-fal-muted"> · incompleto</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onUseInStore && !isActive ? (
            <Button type="button" size="sm" onClick={onUseInStore}>
              Usar na loja
            </Button>
          ) : null}
          <ButtonLink to={`/conta/veiculos/${vehicle.id}`} variant="light" size="sm">
            Abrir
          </ButtonLink>
          <ButtonLink to={vehiclePartsModuleHref(vehicle)} variant="light" size="sm">
            Peças
          </ButtonLink>
          {!vehicle.isPrimary && onSetPrimary ? (
            <Button type="button" variant="light" size="sm" onClick={onSetPrimary}>
              Principal
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" variant="danger" size="sm" onClick={onRemove}>
              Remover
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
