import { useToast } from '@/components/common/Toast'
import { vehicleDisplayName } from '@/components/garage/garageVehicleUi'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { useAuth } from '@/contexts/AuthContext'
import { useGarageOptional } from '@/contexts/GarageContext'
import { toUserMessage } from '@/lib/toUserMessage'
import { ensureSavedVehicleFromFilter } from '@/services/customers/customerVehicleService'
import { filterDisplayLabel } from '@/services/garage/activeGarageStorage'
import { savePendingGarageVehicle } from '@/services/plates/pendingGarage'
import type { CustomerSavedVehicle, VehicleFilter } from '@/types'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type Panel = 'menu' | 'manual'

/** Chip / CTA do veículo ativo (contexto loja) — distinto de “principal”. Guest OK (sessão); salvar exige login. */
export function GarageActiveSwitcher({ compact = false }: { compact?: boolean }) {
  const garage = useGarageOptional()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('menu')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setPanel('menu')
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setPanel('menu')
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!garage) return null

  const loggedIn = Boolean(user)
  const hasActive = Boolean(garage.activeFilter)
  const label = garage.activeVehicle
    ? vehicleDisplayName(garage.activeVehicle)
    : filterDisplayLabel(garage.activeFilter)

  function openMenu() {
    setPanel('menu')
    setOpen((v) => !v)
  }

  function pickVehicle(v: CustomerSavedVehicle) {
    garage!.setActiveVehicle(v)
    setOpen(false)
    setPanel('menu')
  }

  function clear() {
    garage!.clearActiveVehicle()
    setOpen(false)
    setPanel('menu')
  }

  function returnPath() {
    return `${location.pathname}${location.search}`
  }

  function onManualConfirm(filter: VehicleFilter) {
    garage!.setSessionFilter(filter)
    setOpen(false)
    setPanel('menu')
    const name = filterDisplayLabel(filter)
    toast.push(`Compatibilidade confirmada: ${name}`, 'success', {
      durationMs: 8000,
      action: {
        label: loggedIn ? 'Salvar na Minha Garagem' : 'Entrar ou criar conta para salvar',
        onClick: () => {
          void saveToGarage(filter)
        },
      },
    })
  }

  async function saveToGarage(filter: VehicleFilter) {
    if (saving) return
    if (!loggedIn) {
      savePendingGarageVehicle({ ...filter, returnTo: returnPath() })
      navigate('/login', { state: { from: returnPath() } })
      toast.push(
        'Para guardar na Minha Garagem, entre ou crie uma conta. Os selos desta sessão continuam.',
        'info',
      )
      return
    }
    setSaving(true)
    try {
      const saved = await ensureSavedVehicleFromFilter(filter)
      await garage!.refreshVehicles()
      garage!.setActiveVehicle(saved)
      toast.push('Veículo salvo na Minha Garagem.', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Não foi possível salvar o veículo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const triggerClass = [
    'inline-flex w-full max-w-full items-center gap-1 rounded-[10px] border px-1.5 py-1 text-left transition sm:gap-1.5 sm:px-2',
    compact ? 'min-h-9 text-[10px] leading-tight sm:text-[11px]' : 'text-xs',
    hasActive
      ? 'border-fal-accent/40 bg-fal-accent/10'
      : 'border-fal-navy/25 bg-fal-surface-2 text-fal-navy dark:border-fal-line dark:bg-fal-surface-2 dark:text-fal-fg',
  ].join(' ')

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        aria-label={
          hasActive
            ? `Veículo ativo: ${label}`
            : 'Confirmar compatibilidade do veículo'
        }
        title={
          hasActive
            ? 'Veículo ativo na loja (contexto de busca). Diferente do principal da garagem.'
            : 'Confirme um veículo para ver selos de compatibilidade nesta sessão.'
        }
        onClick={openMenu}
      >
        {hasActive ? (
          <>
            <span className="min-w-0 truncate font-extrabold text-fal-navy dark:text-fal-fg">
              {compact ? (
                <>
                  <span className="sm:hidden">Ativo</span>
                  <span className="hidden truncate sm:inline">
                    Ativo: {label}
                    {garage.activeVehicle?.isPrimary ? ' ★' : ''}
                  </span>
                </>
              ) : (
                <>
                  Ativo: {label}
                  {garage.activeVehicle?.isPrimary ? ' ★' : ''}
                  {garage.isSessionActive ? ' · sessão' : ''}
                </>
              )}
            </span>
            <span className="shrink-0 font-semibold text-fal-auth-link">Trocar</span>
          </>
        ) : (
          <span className="truncate font-extrabold">
            {compact ? (
              <>
                <span className="sm:hidden">Compatibilidade</span>
                <span className="hidden sm:inline">Confirmar compatibilidade</span>
              </>
            ) : (
              'Confirmar compatibilidade'
            )}
          </span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Compatibilidade na loja"
          className={[
            'absolute right-0 z-[120] mt-1.5 w-[min(320px,calc(100vw-2rem))] rounded-[12px] border border-fal-line bg-fal-surface p-2 shadow-fal',
            compact ? 'left-0 right-auto' : '',
          ].join(' ')}
        >
          {panel === 'menu' ? (
            <div className="flex flex-col gap-0.5">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                {loggedIn ? 'Minha Garagem' : 'Nesta sessão'}
              </p>
              {!loggedIn ? (
                <p className="px-2 py-2 text-xs text-fal-muted">
                  Confirme o modelo para ver selos — sem cadastro. Conta só é pedida para guardar o
                  carro na Minha Garagem.
                </p>
              ) : garage.vehicles.length === 0 ? (
                <p className="px-2 py-2 text-xs text-fal-muted">
                  Nenhum carro salvo. Use o filtro manual ou gerencie a garagem.
                </p>
              ) : (
                garage.vehicles.map((v) => {
                  const active = garage.activeVehicle?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={[
                        'flex min-h-10 w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left text-xs font-semibold',
                        active
                          ? 'bg-fal-accent/15 text-fal-navy dark:text-fal-fg'
                          : 'text-fal-fg hover:bg-fal-surface-2',
                      ].join(' ')}
                      onClick={() => pickVehicle(v)}
                    >
                      <span className="truncate">
                        {vehicleDisplayName(v)}
                        {v.isPrimary ? ' ★' : ''}
                      </span>
                      {active ? <span className="shrink-0 text-fal-muted">ativo</span> : null}
                    </button>
                  )
                })
              )}

              <div className="my-1 border-t border-fal-line" />

              <button
                type="button"
                className="min-h-10 rounded-[8px] px-2 py-1.5 text-left text-xs font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg"
                onClick={() => setPanel('manual')}
              >
                Filtrar manualmente…
              </button>

              {hasActive ? (
                <button
                  type="button"
                  className="min-h-10 rounded-[8px] px-2 py-1.5 text-left text-xs font-semibold text-fal-muted hover:bg-fal-surface-2"
                  onClick={clear}
                >
                  Limpar ativo
                </button>
              ) : null}

              {loggedIn ? (
                <Link
                  to="/conta/veiculos"
                  className="min-h-10 rounded-[8px] px-2 py-1.5 text-xs font-semibold text-fal-auth-link hover:bg-fal-surface-2"
                  onClick={() => setOpen(false)}
                >
                  Gerenciar garagem
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    state={{ from: returnPath() }}
                    className="min-h-10 rounded-[8px] px-2 py-1.5 text-xs font-semibold text-fal-auth-link hover:bg-fal-surface-2"
                    onClick={() => setOpen(false)}
                  >
                    Entrar para Minha Garagem
                  </Link>
                  <Link
                    to="/cadastro"
                    state={{ from: returnPath() }}
                    className="min-h-10 rounded-[8px] px-2 py-1.5 text-xs font-semibold text-fal-muted hover:bg-fal-surface-2"
                    onClick={() => setOpen(false)}
                  >
                    Criar conta grátis
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <button
                type="button"
                className="mb-1 px-1 text-xs font-semibold text-fal-muted hover:underline"
                onClick={() => setPanel('menu')}
              >
                ← Voltar
              </button>
              <VehicleSelector
                compact
                hideQuickPick
                title="Filtrar modelo"
                subtitle={
                  loggedIn
                    ? 'Confirme para ver compatibilidade nesta página. Depois pode salvar na garagem.'
                    : 'Confirme para ver selos agora. Guardar o carro na Minha Garagem pede entrar ou criar conta.'
                }
                confirmLabel="Confirmar compatibilidade"
                onConfirm={onManualConfirm}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
