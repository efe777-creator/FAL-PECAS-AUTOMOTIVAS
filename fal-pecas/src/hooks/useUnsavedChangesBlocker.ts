import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Bloqueia navegação SPA enquanto `when` for true; confirma com ConfirmDialog.
 * Pareia com `beforeunload` na página quando quiser cobrir fechar aba.
 */
export function useUnsavedChangesBlocker(
  when: boolean,
  opts?: {
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  },
) {
  const blocker = useBlocker(when)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let cancelled = false
    void (async () => {
      const { confirmed } = await confirmDialog({
        title: opts?.title ?? 'Alterações não salvas',
        message:
          opts?.message ??
          'Há alterações que ainda não foram salvas. Sair mesmo assim?',
        confirmLabel: opts?.confirmLabel ?? 'Sair sem salvar',
        cancelLabel: opts?.cancelLabel ?? 'Continuar editando',
        danger: true,
      })
      if (cancelled) return
      if (confirmed) blocker.proceed()
      else blocker.reset()
    })()
    return () => {
      cancelled = true
    }
  }, [blocker, opts?.title, opts?.message, opts?.confirmLabel, opts?.cancelLabel])
}
