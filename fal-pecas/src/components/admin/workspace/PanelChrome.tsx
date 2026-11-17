import { DropdownMenu } from '@/components/common/DropdownMenu'
import type { WorkspaceMode } from '@/lib/adminWorkspacePrefs'
import type { ReactNode } from 'react'

export type PanelChromeProps = {
  title: string
  mode: WorkspaceMode
  onModeChange: (m: WorkspaceMode) => void
  onClose: () => void
  extraActions?: ReactNode
}

export function PanelChrome({
  title,
  mode,
  onModeChange,
  onClose,
  extraActions,
}: PanelChromeProps) {
  const rareItems = [
    {
      id: 'expand',
      label: mode === 'expanded' ? 'Dividir (50/50)' : 'Expandir painel',
      onSelect: () => onModeChange(mode === 'expanded' ? 'split' : 'expanded'),
    },
    {
      id: 'fullscreen',
      label: mode === 'fullscreen' ? 'Restaurar composição' : 'Tela cheia',
      onSelect: () => onModeChange(mode === 'fullscreen' ? 'split' : 'fullscreen'),
    },
  ]

  return (
    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-fal-line pb-3">
      <div className="min-w-0">
        <h2 className="m-0 truncate text-base font-extrabold text-fal-fg">{title}</h2>
        {mode === 'fullscreen' ? (
          <p className="mb-0 mt-1 text-xs text-fal-muted">Modo tela cheia do painel</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {extraActions}
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-2.5 text-xs font-bold text-fal-fg hover:bg-fal-bg"
          onClick={() => onModeChange('collapsed')}
        >
          Recolher
        </button>
        <DropdownMenu
          aria-label="Controles do painel"
          trigger={<span aria-hidden>⋯</span>}
          items={rareItems}
        />
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
