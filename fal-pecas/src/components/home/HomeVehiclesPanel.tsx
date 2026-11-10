import { ButtonLink } from '@/components/common/ButtonLink'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import type { CustomerSavedVehicle } from '@/types'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/** Painel da vitrine Home: veículos salvos (menu, sem sair da página). */
export function HomeVehiclesPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomerSavedVehicle[]>([])
  const [loading, setLoading] = useState(Boolean(user))

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    void listSavedVehicles()
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch(() => {
        if (active) setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  function applyVehicle(v: CustomerSavedVehicle) {
    const qs = new URLSearchParams()
    if (v.makerName) qs.set('maker', v.makerName)
    if (v.modelName) qs.set('model', v.modelName)
    if (v.year != null) qs.set('year', String(v.year))
    if (v.engine) qs.set('engine', v.engine)
    if (v.versionName) qs.set('version', v.versionName)
    navigate(`/catalogo?${qs.toString()}`)
  }

  return (
    <div id="garagem">
      <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Meus carros</h2>
          <p className="mt-1 text-sm text-fal-muted">
            Escolha um carro salvo para filtrar peças compatíveis.
          </p>
        </div>
        {user ? (
          <Link to="/conta/veiculos" className="text-sm font-semibold text-fal-navy">
            Gerenciar na conta →
          </Link>
        ) : null}
      </div>

      {!user ? (
        <div className="rounded-[12px] border border-fal-line bg-fal-bg px-4 py-5 text-center sm:px-6">
          <p className="m-0 text-sm text-fal-muted">
            Entre na conta para ver e usar os veículos salvos na garagem.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ButtonLink to="/login" state={{ from: '/' }} variant="primary">
              Entrar
            </ButtonLink>
            <ButtonLink to="/cadastro" state={{ from: '/' }} variant="outline">
              Criar conta
            </ButtonLink>
          </div>
          <p className="mt-3 text-xs text-fal-muted">
            Sem conta: use a placa acima e, se quiser, salve o veículo depois.
          </p>
        </div>
      ) : null}

      {user && loading ? <Loading /> : null}

      {user && !loading && items.length === 0 ? (
        <div className="rounded-[12px] border border-fal-line bg-fal-bg px-4 py-5 text-center sm:px-6">
          <p className="m-0 text-sm text-fal-muted">
            Você ainda não salvou nenhum veículo. Identifique pela placa acima e confirme para
            guardar na garagem.
          </p>
          <div className="mt-4">
            <ButtonLink to="/conta/veiculos" variant="outline">
              Abrir garagem na conta
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {user && !loading && items.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => {
            const label =
              v.nickname ||
              [v.makerName, v.modelName, v.year, v.engine].filter(Boolean).join(' ') ||
              'Veículo'
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => applyVehicle(v)}
                  className={[
                    'flex min-h-[72px] w-full flex-col items-start justify-center rounded-fal border px-4 py-3 text-left transition',
                    v.isPrimary
                      ? 'border-fal-navy bg-fal-navy text-white hover:brightness-110'
                      : 'border-fal-line bg-white text-fal-navy hover:border-fal-navy/40 hover:bg-fal-bg',
                  ].join(' ')}
                >
                  <span className="text-sm font-extrabold">
                    {label}
                    {v.isPrimary ? ' ★' : ''}
                  </span>
                  <span
                    className={[
                      'mt-0.5 text-xs',
                      v.isPrimary ? 'text-white/80' : 'text-fal-muted',
                    ].join(' ')}
                  >
                    Ver peças compatíveis
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
