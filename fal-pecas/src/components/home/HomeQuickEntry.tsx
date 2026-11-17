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
  'inline-flex min-h-11 w-full items-center justify-center rounded-fal border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent'

function menuBtnClass(active: boolean) {
  return [
    shortcutBtn,
    active
      ? 'border-fal-accent bg-fal-accent/15 font-extrabold text-fal-accent ring-1 ring-fal-accent/35'
      : 'border-fal-line bg-fal-surface text-fal-fg hover:border-fal-yellow/50 hover:bg-fal-surface-2',
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
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-fal-yellow-dark dark:text-fal-yellow">
              Busca rápida
            </p>
            <h1
              id="home-entry-heading"
              className="m-0 mt-1 text-[22px] font-black leading-tight tracking-tight text-fal-navy dark:text-fal-fg sm:text-[26px]"
            >
              Encontre a peça certa
            </h1>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-fal-muted sm:text-[15px]">
              Comece pela placa do veículo — ou use os atalhos abaixo.
            </p>
          </header>

          <div className="w-full rounded-fal border border-fal-line bg-fal-surface p-3 shadow-fal sm:p-4">
            <VehiclePlateSearch returnPath="/" />
          </div>

          <nav
            aria-label="Atalhos de navegação"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3"
          >
            <ButtonLink to="/catalogo" variant="primary" className="w-full justify-center">
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
              Meus carros
            </button>
          </nav>
        </div>
      </Container>
    </section>
  )
}
