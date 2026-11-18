import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { VehicleImageFrame } from '@/components/garage/VehicleImageFrame'
import {
  isVehicleIncomplete,
  vehicleCatalogHref,
  vehicleDisplayName,
  vehiclePlateLabel,
  vehicleTechLine,
} from '@/components/garage/garageVehicleUi'
import { listVehicleAssets } from '@/services/customers/vehicleAssetService'
import {
  placeholderVehicleImage,
  resolveVehicleDisplayImage,
} from '@/services/customers/vehicleImageResolver'
import type { CustomerSavedVehicle, ResolvedVehicleImage } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  vehicle: CustomerSavedVehicle
  onSetPrimary?: () => void
  onRemove?: () => void
}

export function GarageVehicleHero({ vehicle, onSetPrimary, onRemove }: Props) {
  const plate = vehiclePlateLabel(vehicle)
  const incomplete = isVehicleIncomplete(vehicle)
  const [image, setImage] = useState<ResolvedVehicleImage>(placeholderVehicleImage())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const assets = await listVehicleAssets(vehicle.id)
        const resolved = await resolveVehicleDisplayImage({ vehicle, assets })
        if (!cancelled) setImage(resolved)
      } catch {
        if (!cancelled) setImage(placeholderVehicleImage())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [vehicle])

  return (
    <article className="overflow-hidden rounded-fal border border-fal-navy/20 bg-fal-surface">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,240px)_1fr]">
        <VehicleImageFrame
          image={image}
          colorHex={vehicle.colorHex}
          title={vehicleDisplayName(vehicle)}
          className="min-h-[160px] rounded-none lg:min-h-full"
        />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-fal-muted">
              Veículo principal
            </p>
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
              {vehicle.colorLabel || vehicle.colorHex ? (
                <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-fal-line bg-fal-bg px-2.5 py-1">
                  {vehicle.colorHex ? (
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-fal-line"
                      style={{ background: vehicle.colorHex }}
                      aria-hidden
                    />
                  ) : null}
                  {vehicle.colorLabel || vehicle.colorHex}
                </span>
              ) : null}
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
