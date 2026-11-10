import { ButtonLink } from '@/components/common/ButtonLink'
import { Container } from '@/components/layout/Container'
import { VehiclePlateSearch } from '@/components/vehicle/VehiclePlateSearch'

export type HomeShelfPanel = 'featured' | 'categories' | 'vehicles'

type HomeQuickEntryProps = {
  activePanel: HomeShelfPanel
  onOpenCategories: () => void
  onOpenVehicles: () => void
}

const shortcutBtn =
  'inline-flex min-h-11 w-full items-center justify-center rounded-fal border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy'

function menuBtnClass(active: boolean) {
  return [
    shortcutBtn,
    active
      ? 'border-fal-navy bg-fal-navy text-white hover:brightness-110'
      : 'border-fal-navy/20 bg-white text-fal-navy hover:border-fal-navy/45 hover:bg-white',
  ].join(' ')
}

/**
 * Entrada unificada: placa + 3 atalhos. Categorias e Meus veículos trocam a vitrine (sem sair da Home).
 */
export function HomeQuickEntry({
  activePanel,
  onOpenCategories,
  onOpenVehicles,
}: HomeQuickEntryProps) {
  return (
    <section
      id="veiculo"
      className="scroll-mt-20 border-b border-fal-line bg-fal-bg"
      aria-labelledby="home-entry-heading"
    >
      <Container className="py-5 sm:py-7">
        <div className="mx-auto flex max-w-xl flex-col items-stretch gap-5">
          <header className="text-center">
            <h1
              id="home-entry-heading"
              className="m-0 text-[22px] font-extrabold leading-tight tracking-tight text-fal-navy sm:text-[26px]"
            >
              Encontre a peça certa
            </h1>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-fal-muted sm:text-[15px]">
              Comece pela placa do veículo — ou use os atalhos abaixo.
            </p>
          </header>

          <div className="w-full">
            <VehiclePlateSearch returnPath="/" />
          </div>

          <nav
            aria-label="Atalhos de navegação"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3"
          >
            <ButtonLink to="/catalogo" variant="outline" className="w-full justify-center">
              Buscar peça
            </ButtonLink>
            <button
              type="button"
              aria-pressed={activePanel === 'categories'}
              aria-controls="home-vitrine"
              className={menuBtnClass(activePanel === 'categories')}
              onClick={onOpenCategories}
            >
              Ver categorias
            </button>
            <button
              type="button"
              aria-pressed={activePanel === 'vehicles'}
              aria-controls="home-vitrine"
              className={menuBtnClass(activePanel === 'vehicles')}
              onClick={onOpenVehicles}
            >
              Meus veículos
            </button>
          </nav>
        </div>
      </Container>
    </section>
  )
}
