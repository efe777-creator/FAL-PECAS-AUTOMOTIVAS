import { GarageBackButton } from '@/components/garage/GarageBackButton'
import { vehiclePlateLabel } from '@/components/garage/garageVehicleUi'
import { useGarage } from '@/contexts/GarageContext'
import { GARAGE_SIDEBAR_ITEMS } from '@/lib/garageNav'
import type { GarageModuleKey } from '@/lib/garageWorkspacePrefs'
import {
  GARAGE_MORE_MODULE_KEYS,
  writeGarageWorkspacePrefs,
} from '@/lib/garageWorkspacePrefs'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'

function moduleHref(vehicleId: string | null | undefined, key: GarageModuleKey) {
  if (!vehicleId) return '/conta/veiculos'
  return `/conta/veiculos/${vehicleId}?modulo=${key}`
}

function isSidebarItemActive(
  itemKey: (typeof GARAGE_SIDEBAR_ITEMS)[number]['key'],
  isHome: boolean,
  activeModulo: string | null,
): boolean {
  if (itemKey === 'home') return isHome
  if (isHome || !activeModulo) return false
  if (itemKey === 'mais') {
    return (
      activeModulo === 'mais' ||
      (GARAGE_MORE_MODULE_KEYS as string[]).includes(activeModulo)
    )
  }
  return activeModulo === itemKey
}

export function GarageShell() {
  const garage = useGarage()
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeVehicleId } = useParams()
  const focusVehicleId = useMemo(() => {
    if (routeVehicleId) return routeVehicleId
    return (
      garage.vehicles.find((v) => v.isPrimary)?.id ??
      garage.activeVehicle?.id ??
      garage.vehicles[0]?.id ??
      null
    )
  }, [routeVehicleId, garage.vehicles, garage.activeVehicle])

  const focusVehicle = useMemo(
    () => garage.vehicles.find((v) => v.id === focusVehicleId) ?? null,
    [garage.vehicles, focusVehicleId],
  )

  const isHome = /^\/conta\/veiculos\/?$/.test(location.pathname)
  const search = new URLSearchParams(location.search)
  const activeModulo = search.get('modulo')

  function goModule(key: GarageModuleKey) {
    if (!focusVehicleId) {
      navigate('/conta/veiculos')
      return
    }
    writeGarageWorkspacePrefs({ lastModule: key })
    navigate(moduleHref(focusVehicleId, key))
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-4 lg:flex-row lg:gap-0">
      <aside
        className="hidden w-[220px] shrink-0 flex-col rounded-fal bg-fal-navy text-white lg:flex"
        aria-label="Navegação da Minha Garagem"
      >
        <div className="border-b border-white/10 px-4 py-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-fal-yellow">
            FAL
          </p>
          <p className="m-0 text-sm font-extrabold">Minha Garagem</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {GARAGE_SIDEBAR_ITEMS.map((item) => {
            const active = isSidebarItemActive(item.key, isHome, activeModulo)
            if (item.key === 'home') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate('/conta/veiculos')}
                  className={[
                    'flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-left text-sm font-semibold transition',
                    active
                      ? 'bg-fal-yellow text-fal-navy-dark'
                      : 'text-white/85 hover:bg-white/10',
                  ].join(' ')}
                >
                  <span aria-hidden className="w-4 text-center opacity-80">
                    {item.glyph}
                  </span>
                  {item.label}
                </button>
              )
            }
            return (
              <button
                key={item.key}
                type="button"
                disabled={!focusVehicleId}
                onClick={() => goModule(item.key as GarageModuleKey)}
                className={[
                  'flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-left text-sm font-semibold transition',
                  active
                    ? 'bg-fal-yellow text-fal-navy-dark'
                    : 'text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40',
                ].join(' ')}
              >
                <span aria-hidden className="w-4 text-center opacity-80">
                  {item.glyph}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 p-3">
          <p className="m-0 px-1 text-[11px] font-semibold text-white/55">
            Use Voltar para retornar ao catálogo ou à conta.
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4 lg:pl-5">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-fal border border-fal-line bg-fal-surface/95 px-3 py-2 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5">
          <GarageBackButton />
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="garage-vehicle-switcher">
              Veículo em foco
            </label>
            <select
              id="garage-vehicle-switcher"
              className="min-h-11 w-full max-w-md rounded-[10px] border border-fal-line bg-fal-bg px-3 text-sm font-extrabold text-fal-fg"
              value={focusVehicleId ?? ''}
              onChange={(e) => {
                const next = e.target.value
                if (!next) return
                if (isHome) {
                  const found = garage.vehicles.find((v) => v.id === next)
                  if (found) garage.setActiveVehicle(found)
                  return
                }
                const mod = (activeModulo as GarageModuleKey) || 'visao'
                navigate(moduleHref(next, mod))
              }}
              disabled={garage.vehicles.length === 0}
            >
              {garage.vehicles.length === 0 ? (
                <option value="">Nenhum veículo</option>
              ) : (
                garage.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname?.trim() ||
                      [v.makerName, v.modelName, v.year].filter(Boolean).join(' ')}
                    {v.isPrimary ? ' · principal' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          {focusVehicle && vehiclePlateLabel(focusVehicle) ? (
            <span className="hidden rounded-[8px] border border-fal-line bg-fal-bg px-2.5 py-1 text-xs font-bold tracking-wide sm:inline">
              {vehiclePlateLabel(focusVehicle)}
            </span>
          ) : null}
        </header>

        <Outlet />
      </div>
    </div>
  )
}
