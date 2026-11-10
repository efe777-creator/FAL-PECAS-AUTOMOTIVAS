import { Container } from '@/components/layout/Container'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { useAuth } from '@/contexts/AuthContext'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Bloco leve Minha Garagem na Home: atalho se autenticado / CTA se visitante.
 */
export function HomeGarageSection() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setCount(0)
      return
    }
    void listSavedVehicles()
      .then((rows) => setCount(rows.length))
      .catch(() => setCount(0))
  }, [user])

  return (
    <section
      id="garagem"
      className="scroll-mt-20 border-b border-fal-line bg-white py-6 sm:py-8"
      aria-labelledby="home-garage-heading"
    >
      <Container>
        <div className="rounded-[12px] border border-fal-line bg-fal-bg px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h2 id="home-garage-heading" className="m-0 text-lg font-extrabold sm:text-xl">
                Minha Garagem
              </h2>
              <p className="mt-1 text-sm text-fal-muted">
                {user
                  ? count > 0
                    ? 'Escolha um veículo salvo para filtrar peças compatíveis.'
                    : 'Salve seu carro após identificar pela placa e compre mais rápido depois.'
                  : 'Identifique o veículo pela placa acima. Com conta, você salva e reusa em qualquer dispositivo.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/veiculo"
                className="inline-flex min-h-10 items-center rounded-fal border border-fal-line bg-white px-3 text-sm font-semibold text-fal-navy no-underline hover:bg-white/80"
              >
                Buscar veículo
              </Link>
              <Link
                to={user ? '/conta/veiculos' : '/login'}
                state={user ? undefined : { from: '/conta/veiculos' }}
                className="inline-flex min-h-10 items-center rounded-fal bg-fal-navy px-3 text-sm font-semibold text-white no-underline hover:brightness-110"
              >
                {user ? 'Gerenciar garagem' : 'Entrar na conta'}
              </Link>
            </div>
          </div>
          {user ? (
            <div className="mt-4 border-t border-fal-line/70 pt-3">
              <SavedVehiclesQuickPick />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
