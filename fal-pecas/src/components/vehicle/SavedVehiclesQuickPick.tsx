import { useAuth } from '@/contexts/AuthContext'
import { useGarageOptional } from '@/contexts/GarageContext'
import { vehicleDisplayName } from '@/components/garage/garageVehicleUi'
import { vehicleToActiveFilter } from '@/services/garage/activeGarageStorage'
import type { CustomerSavedVehicle } from '@/types'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Atalho: define veículo ativo e aplica filtros no catálogo.
 * ★ = principal (DB) · anel accent = ativo (localStorage).
 */
export function SavedVehiclesQuickPick({
  onPick,
}: {
  /** Se informado, chama em vez de navegar (útil no catálogo). */
  onPick?: (v: CustomerSavedVehicle) => void
}) {
  const { user } = useAuth()
  const garage = useGarageOptional()
  const navigate = useNavigate()
  const items = garage?.vehicles ?? []

  if (!user) {
    return (
      <p className="m-0 text-xs text-fal-muted">
        <Link
          to="/login"
          state={{ from: '/catalogo' }}
          className="font-semibold text-fal-navy underline-offset-2 hover:underline"
        >
          Entrar
        </Link>{' '}
        para usar a Minha Garagem
      </p>
    )
  }

  if (!items.length) {
    return (
      <p className="m-0 text-xs text-fal-muted">
        <Link
          to="/conta/veiculos"
          className="font-semibold text-fal-navy underline-offset-2 hover:underline"
        >
          Minha Garagem
        </Link>
        {' — '}
        salve um carro na conta para filtrar peças rapidamente.
      </p>
    )
  }

  function apply(v: CustomerSavedVehicle) {
    garage?.setActiveVehicle(v)
    if (onPick) {
      onPick(v)
      return
    }
    const filter = vehicleToActiveFilter(v)
    const qs = new URLSearchParams()
    if (filter.maker) qs.set('maker', filter.maker)
    if (filter.model) qs.set('model', filter.model)
    if (filter.year) qs.set('year', filter.year)
    if (filter.engine) qs.set('engine', filter.engine)
    if (filter.version) qs.set('version', filter.version)
    navigate(`/catalogo?${qs.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-fal-muted">Garagem:</span>
      {items.map((v) => {
        const label = vehicleDisplayName(v)
        const limited = !v.versionId
        const isActive = garage?.activeVehicle?.id === v.id
        return (
          <button
            key={v.id}
            type="button"
            title={
              [
                isActive ? 'Ativo na loja agora' : 'Usar como ativo na loja',
                v.isPrimary ? 'Principal da garagem' : null,
                limited ? 'Compatibilidade limitada — versão ainda não vinculada' : null,
              ]
                .filter(Boolean)
                .join(' · ')
            }
            className={[
              'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
              isActive
                ? 'border-fal-accent bg-fal-accent/15 text-fal-navy ring-2 ring-fal-accent/40'
                : v.isPrimary
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-[#d8dee3] bg-[#f7f9fa] text-fal-navy hover:border-fal-navy',
            ].join(' ')}
            onClick={() => apply(v)}
          >
            {label}
            {v.isPrimary ? ' ★' : ''}
            {isActive ? ' · ativo' : ''}
          </button>
        )
      })}
      {garage?.activeVehicle ? (
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline-offset-2 hover:underline"
          onClick={() => garage.clearActiveVehicle()}
        >
          Nenhum / limpar
        </button>
      ) : null}
      <Link
        to="/conta/veiculos"
        className="text-xs font-semibold text-fal-muted underline-offset-2 hover:underline"
      >
        Gerenciar
      </Link>
    </div>
  )
}
