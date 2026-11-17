import { PanelChrome } from '@/components/admin/workspace/PanelChrome'
import {
  readModulePrefs,
  writeModulePrefs,
  type WorkspaceMode,
  type WorkspaceModuleKey,
} from '@/lib/adminWorkspacePrefs'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

const DESKTOP_MQ = '(min-width: 1024px)'

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
}: AdaptiveWorkspaceProps) {
  const [prefs, setPrefs] = useState(() => readModulePrefs(moduleKey))
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )
  const dragging = useRef(false)

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

  const panel = showContextual ? (
    <aside
      className={[
        'flex min-h-0 flex-col rounded-[14px] border border-fal-line bg-fal-surface p-3 shadow-sm',
        !isDesktop || fullscreen
          ? 'fixed inset-0 z-40 m-0 rounded-none border-0 bg-fal-bg p-4'
          : '',
      ].join(' ')}
      style={
        isDesktop && !fullscreen
          ? { width: splitWidth, maxWidth: '100%', flexShrink: 0 }
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
      />
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{contextual}</div>
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

  if (!isDesktop && showContextual) {
    return (
      <div className="relative">
        {primary}
        {panel}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 items-stretch gap-0">
      <div className="min-w-0 flex-1">{primary}</div>
      {showContextual ? (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar painel"
            tabIndex={0}
            className="mx-1 hidden w-1.5 shrink-0 cursor-col-resize rounded-full bg-fal-line hover:bg-fal-accent lg:block"
            onPointerDown={onSplitterPointerDown}
          />
          {panel}
        </>
      ) : null}
    </div>
  )
}
