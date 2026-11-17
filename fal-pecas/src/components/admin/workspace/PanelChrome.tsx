import type { WorkspaceMode } from '@/lib/adminWorkspacePrefs'
import type { ReactNode } from 'react'

export type PanelChromeProps = {
  title: string
  mode: WorkspaceMode
  onModeChange: (m: WorkspaceMode) => void
  onClose: () => void
  extraActions?: ReactNode
  /** Badge de status ao lado do título (ex.: etapa do pedido). */
  statusBadge?: ReactNode
}

export function PanelChrome({
  title,
  mode,
  onModeChange,
  onClose,
  extraActions,
  statusBadge,
}: PanelChromeProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-fal-line pb-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 truncate text-base font-extrabold text-fal-fg">{title}</h2>
          {statusBadge}
        </div>
        {mode === 'fullscreen' ? (
          <p className="mb-0 mt-1 text-xs text-fal-muted">Modo tela cheia do painel</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {extraActions}
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-2.5 text-xs font-bold text-fal-fg hover:bg-fal-bg"
          onClick={() => onModeChange(mode === 'expanded' ? 'split' : 'expanded')}
        >
          {mode === 'expanded' ? 'Dividir' : 'Expandir'}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-2.5 text-xs font-bold text-fal-fg hover:bg-fal-bg"
          onClick={() => onModeChange(mode === 'fullscreen' ? 'split' : 'fullscreen')}
        >
          {mode === 'fullscreen' ? 'Composição' : 'Tela cheia'}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-2.5 text-xs font-bold text-fal-fg hover:bg-fal-bg"
          onClick={() => onModeChange('collapsed')}
        >
          Recolher
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-fal-line bg-fal-surface text-sm font-bold text-fal-fg hover:bg-fal-bg"
          aria-label="Fechar painel"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </header>
  )
}
