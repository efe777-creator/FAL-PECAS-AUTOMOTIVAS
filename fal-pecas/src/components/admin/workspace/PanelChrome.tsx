import type { ReactNode } from 'react'

export type PanelChromeProps = {
  title: string
  onClose: () => void
  extraActions?: ReactNode
  /** Badge de status ao lado do título (ex.: etapa do pedido). */
  statusBadge?: ReactNode
}

/**
 * Chrome da guia Adaptive: título + badge + extraActions + Fechar.
 * Largura = arraste na borda do painel (AdaptiveWorkspace). Modos wide via modeApiRef.
 */
export function PanelChrome({
  title,
  onClose,
  extraActions,
  statusBadge,
}: PanelChromeProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-1.5 border-b border-fal-line pb-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 truncate text-sm font-extrabold text-fal-fg lg:text-base">
            {title}
          </h2>
          {statusBadge}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {extraActions}
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-fal-line bg-fal-surface text-sm font-bold text-fal-fg hover:bg-fal-bg"
          aria-label="Fechar painel"
          title="Fechar todas as guias"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </header>
  )
}
