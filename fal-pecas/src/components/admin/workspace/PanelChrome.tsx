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
  /** Largura da guia (desktop split) — − / + quando disponível. */
  onSplitWidthStep?: (deltaPx: number) => void
  splitWidthNarrowed?: boolean
  splitWidthWidened?: boolean
}

export function PanelChrome({
  title,
  mode,
  onModeChange,
  onClose,
  extraActions,
  statusBadge,
  onSplitWidthStep,
  splitWidthNarrowed = false,
  splitWidthWidened = false,
}: PanelChromeProps) {
  const showWidthControls =
    Boolean(onSplitWidthStep) && mode !== 'fullscreen' && mode !== 'collapsed'

  return (
    <header className="flex flex-wrap items-start justify-between gap-1.5 border-b border-fal-line pb-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 truncate text-sm font-extrabold text-fal-fg lg:text-base">
            {title}
          </h2>
          {statusBadge}
        </div>
        {mode === 'fullscreen' ? (
          <p className="mb-0 mt-0.5 text-[11px] text-fal-muted">Modo tela cheia do painel</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {extraActions}
        {showWidthControls ? (
          <div
            className="hidden items-center gap-0.5 lg:flex"
            role="group"
            aria-label="Largura da guia"
          >
            <button
              type="button"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-fal-line bg-fal-surface text-sm font-bold text-fal-fg hover:bg-fal-bg disabled:opacity-40 lg:min-h-10 lg:min-w-10"
              aria-label="Diminuir largura da guia"
              title="Diminuir largura"
              disabled={splitWidthNarrowed}
              onClick={() => onSplitWidthStep?.(-1)}
            >
              −
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-fal-line bg-fal-surface text-sm font-bold text-fal-fg hover:bg-fal-bg disabled:opacity-40 lg:min-h-10 lg:min-w-10"
              aria-label="Aumentar largura da guia"
              title="Aumentar largura"
              disabled={splitWidthWidened}
              onClick={() => onSplitWidthStep?.(1)}
            >
              +
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-[8px] border border-fal-line bg-fal-surface px-2 text-[11px] font-bold text-fal-fg hover:bg-fal-bg lg:min-h-10 lg:text-xs"
          aria-label={mode === 'expanded' ? 'Dividir painéis' : 'Expandir painel'}
          title={mode === 'expanded' ? 'Dividir' : 'Expandir'}
          onClick={() => onModeChange(mode === 'expanded' ? 'split' : 'expanded')}
        >
          {mode === 'expanded' ? 'Dividir' : 'Expandir'}
        </button>
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-[8px] border border-fal-line bg-fal-surface px-2 text-[11px] font-bold text-fal-fg hover:bg-fal-bg lg:min-h-10 lg:text-xs"
          aria-label={mode === 'fullscreen' ? 'Voltar à composição' : 'Tela cheia'}
          title={mode === 'fullscreen' ? 'Composição' : 'Tela cheia'}
          onClick={() => onModeChange(mode === 'fullscreen' ? 'split' : 'fullscreen')}
        >
          {mode === 'fullscreen' ? 'Composição' : 'Tela cheia'}
        </button>
        <button
          type="button"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-fal-line bg-fal-surface text-sm font-bold text-fal-fg hover:bg-fal-bg lg:min-h-10 lg:min-w-10"
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
