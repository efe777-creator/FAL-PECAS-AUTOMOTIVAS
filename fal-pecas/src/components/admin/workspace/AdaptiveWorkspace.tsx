import { PanelChrome } from '@/components/admin/workspace/PanelChrome'
import {
  clampSplitWidth,
  readModulePrefs,
  WORKSPACE_SPLIT_MAX,
  WORKSPACE_SPLIT_MIN,
  writeModulePrefs,
  type WorkspaceMode,
  type WorkspaceModuleKey,
} from '@/lib/adminWorkspacePrefs'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

const DESKTOP_MQ = '(min-width: 1024px)'
/** Altura do header admin sticky — painel fixo fica abaixo dele. */
const DESKTOP_PANEL_TOP = '4.25rem'

export type AdaptiveWorkspaceProps = {
  moduleKey: WorkspaceModuleKey
  primary: ReactNode
  contextual: ReactNode | null
  contextualOpen: boolean
  onContextualOpenChange: (open: boolean) => void
  contextualTitle?: string
  contextualExtraActions?: ReactNode
  /** Badge de status no chrome do painel (ex.: etapa do pedido). */
  contextualStatusBadge?: ReactNode
  /**
   * API para o conteúdo pedir só workspaceMode (expanded/fullscreen).
   * Não altera density do OrderOpsSurface.
   */
  modeApiRef?: MutableRefObject<AdaptiveWorkspaceModeApi | null>
}

export type AdaptiveWorkspaceModeApi = {
  requestWideMode: (mode: 'expanded' | 'fullscreen') => void
  setMode: (mode: WorkspaceMode) => void
}

export function AdaptiveWorkspace({
  moduleKey,
  primary,
  contextual,
  contextualOpen,
  onContextualOpenChange,
  contextualTitle = 'Detalhe',
  contextualExtraActions,
  contextualStatusBadge,
  modeApiRef,
}: AdaptiveWorkspaceProps) {
  const [prefs, setPrefs] = useState(() => readModulePrefs(moduleKey))
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )
  const dragging = useRef(false)
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setPrefs(readModulePrefs(moduleKey))
  }, [moduleKey])

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const persist = useCallback(
    (next: { mode?: WorkspaceMode; splitWidthPx?: number }) => {
      const merged = writeModulePrefs(moduleKey, {
        mode: next.mode ?? prefs.mode,
        splitWidthPx: next.splitWidthPx ?? prefs.splitWidthPx,
      })
      setPrefs(merged)
    },
    [moduleKey, prefs.mode, prefs.splitWidthPx],
  )

  const effectiveMode: WorkspaceMode =
    !contextualOpen || !contextual
      ? 'collapsed'
      : prefs.mode === 'collapsed'
        ? 'split'
        : prefs.mode

  useEffect(() => {
    if (contextualOpen && prefs.mode === 'collapsed') {
      persist({ mode: 'split' })
    }
  }, [contextualOpen, prefs.mode, persist])

  function handleModeChange(m: WorkspaceMode) {
    if (m === 'collapsed') {
      persist({ mode: 'collapsed' })
      onContextualOpenChange(false)
      return
    }
    persist({ mode: m })
    if (!contextualOpen) onContextualOpenChange(true)
  }

  useEffect(() => {
    if (!modeApiRef) return
    modeApiRef.current = {
      requestWideMode: (mode) => handleModeChange(mode),
      setMode: (mode) => handleModeChange(mode),
    }
    return () => {
      modeApiRef.current = null
    }
    // handleModeChange closes over prefs — refresh when prefs/module change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeApiRef, moduleKey, prefs.mode, prefs.splitWidthPx, contextualOpen])

  function handleClose() {
    persist({ mode: 'collapsed' })
    onContextualOpenChange(false)
  }

  function onSplitterPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isDesktop) return
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = prefs.splitWidthPx
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      if (!dragging.current) return
      const delta = startX - ev.clientX
      persist({ splitWidthPx: startW + delta })
    }
    function onUp(ev: PointerEvent) {
      dragging.current = false
      target.releasePointerCapture(ev.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const showContextual = contextualOpen && contextual != null && effectiveMode !== 'collapsed'
  const fullscreen = showContextual && effectiveMode === 'fullscreen'
  const expanded = showContextual && effectiveMode === 'expanded'
  const splitWidth = expanded ? Math.max(prefs.splitWidthPx, 560) : prefs.splitWidthPx

  function stepSplitWidth(deltaPx: number) {
    const next = clampSplitWidth(prefs.splitWidthPx + deltaPx)
    persist({ splitWidthPx: next })
  }

  // Painel desktop fica fixed na viewport — clique no meio/fim da página sempre vê o split.
  useEffect(() => {
    if (!showContextual || !isDesktop || fullscreen) return
    panelRef.current?.focus({ preventScroll: true })
  }, [showContextual, isDesktop, fullscreen, contextualTitle])

  const panel = showContextual ? (
    <aside
      ref={panelRef}
      tabIndex={-1}
      className={[
        'flex min-h-0 flex-col rounded-[14px] border border-fal-line bg-fal-surface p-2.5 shadow-sm outline-none',
        !isDesktop || fullscreen
          ? 'fixed inset-0 z-40 m-0 flex h-full max-h-[100dvh] rounded-none border-0 bg-fal-bg p-4'
          : 'fixed z-30 overflow-y-auto shadow-lg',
      ].join(' ')}
      style={
        isDesktop && !fullscreen
          ? {
              width: splitWidth,
              maxWidth: `min(100vw - 1.5rem, ${WORKSPACE_SPLIT_MAX}px)`,
              top: DESKTOP_PANEL_TOP,
              right: '0.75rem',
              bottom: '0.75rem',
            }
          : undefined
      }
      aria-label={contextualTitle}
    >
      <PanelChrome
        title={contextualTitle}
        mode={effectiveMode}
        onModeChange={handleModeChange}
        onClose={handleClose}
        extraActions={contextualExtraActions}
        statusBadge={contextualStatusBadge}
        onSplitWidthStep={isDesktop ? stepSplitWidth : undefined}
        splitWidthNarrowed={prefs.splitWidthPx <= WORKSPACE_SPLIT_MIN}
        splitWidthWidened={prefs.splitWidthPx >= WORKSPACE_SPLIT_MAX}
      />
      <div
        className={[
          'mt-1.5 flex min-h-0 flex-col',
          !isDesktop || fullscreen ? 'min-h-0 flex-1 overflow-y-auto' : '',
        ].join(' ')}
      >
        {contextual}
      </div>
    </aside>
  ) : null

  if (fullscreen) {
    return (
      <div className="relative min-h-[50vh]">
        <div className="pointer-events-none invisible" aria-hidden>
          {primary}
        </div>
        {panel}
      </div>
    )
  }

  const primaryCompact = showContextual && !fullscreen

  if (!isDesktop && showContextual) {
    return (
      <div className="relative">
        <div
          className="min-w-0"
          data-workspace-primary={primaryCompact ? 'compact' : 'full'}
        >
          {primary}
        </div>
        {panel}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 items-start gap-0">
      <div
        className="min-w-0 flex-1 overflow-x-hidden"
        data-workspace-primary={primaryCompact ? 'compact' : 'full'}
      >
        {primary}
      </div>
      {showContextual ? (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Arrastar para largura da guia"
            title="Arrastar para largura da guia"
            tabIndex={0}
            className="relative mx-0.5 hidden w-3 shrink-0 cursor-col-resize lg:block"
            onPointerDown={onSplitterPointerDown}
          >
            <span
              className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-fal-line hover:bg-fal-accent"
              aria-hidden
            />
          </div>
          {/* Reserva = largura do painel + margem right (0.75rem) do fixed */}
          <div
            className="hidden shrink-0 lg:block"
            style={{ width: `calc(${splitWidth}px + 0.75rem)` }}
            aria-hidden
          />
          {panel}
        </>
      ) : null}
    </div>
  )
}
