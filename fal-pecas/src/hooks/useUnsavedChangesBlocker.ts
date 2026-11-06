import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useEffect, useRef } from 'react'
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
  const prompting = useRef(false)

  const title = opts?.title ?? 'Alterações não salvas'
  const message =
    opts?.message ?? 'Há alterações que ainda não foram salvas. Sair mesmo assim?'
  const confirmLabel = opts?.confirmLabel ?? 'Sair sem salvar'
  const cancelLabel = opts?.cancelLabel ?? 'Continuar editando'

  useEffect(() => {
    if (blocker.state !== 'blocked' || prompting.current) return
    prompting.current = true
    void (async () => {
      try {
        const { confirmed } = await confirmDialog({
          title,
          message,
          confirmLabel,
          cancelLabel,
          danger: true,
        })
        if (blocker.state !== 'blocked') return
        if (confirmed) blocker.proceed()
        else blocker.reset()
      } finally {
        prompting.current = false
      }
    })()
  }, [blocker, title, message, confirmLabel, cancelLabel])
}
