import {
  garageLocationKey,
  resolveGarageBackTarget,
} from '@/lib/garageNavStack'
import { useLocation, useNavigate } from 'react-router-dom'

type Props = {
  /** Oculta na home da garagem quando não houver origem externa (opcional). */
  hidden?: boolean
}

/**
 * Voltar estratégico da Minha Garagem — mesmo padrão visual do AdminBackButton.
 * Destino: stack interna; ao sair, catálogo (com query) ou conta memorizados.
 */
export function GarageBackButton({ hidden }: Props) {
  const location = useLocation()
  const navigate = useNavigate()

  if (hidden) return null

  function onBack() {
    const target = resolveGarageBackTarget(location.pathname, location.search)
    const current = garageLocationKey(location.pathname, location.search)
    if (target === current) return
    navigate(target)
  }

  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-fal-line bg-fal-bg px-2.5 text-sm font-semibold text-fal-fg hover:border-fal-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent"
      aria-label="Voltar à tela anterior"
      title="Voltar para onde você estava"
    >
      <span aria-hidden>←</span>
      <span className="hidden sm:inline">Voltar</span>
    </button>
  )
}
