import { useGarageOptional } from '@/contexts/GarageContext'
import { vehicleDisplayName } from '@/components/garage/garageVehicleUi'
import { Link } from 'react-router-dom'

/** Chip do veículo ativo (contexto loja) — distinto de “principal”. */
export function GarageActiveSwitcher({ compact = false }: { compact?: boolean }) {
  const garage = useGarageOptional()
  if (!garage?.activeVehicle) return null

  const name = vehicleDisplayName(garage.activeVehicle)

  return (
    <div
      className={[
        'inline-flex max-w-[220px] items-center gap-1.5 rounded-[10px] border border-fal-accent/40 bg-fal-accent/10 px-2 py-1',
        compact ? 'text-[11px]' : 'text-xs',
      ].join(' ')}
      title="Veículo ativo na loja (contexto de busca). Diferente do principal da garagem."
    >
      <span className="truncate font-extrabold text-fal-navy dark:text-fal-fg">
        Ativo: {name}
      </span>
      <button
        type="button"
        className="shrink-0 font-semibold text-fal-muted underline-offset-2 hover:underline"
        onClick={() => garage.clearActiveVehicle()}
      >
        Limpar
      </button>
      {!compact ? (
        <Link
          to="/conta/veiculos"
          className="shrink-0 font-semibold text-fal-auth-link underline-offset-2 hover:underline"
        >
          Trocar
        </Link>
      ) : null}
    </div>
  )
}
