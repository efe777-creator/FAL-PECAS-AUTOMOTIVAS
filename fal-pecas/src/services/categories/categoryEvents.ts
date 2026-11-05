type Listener = () => void

const listeners = new Set<Listener>()

/** Assina mudanças de classificação (CRUD admin). Retorna unsubscribe. */
export function subscribeCategoriesChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Dispara refetch nas telas que escutam (loja + admin). */
export function notifyCategoriesChanged() {
  for (const fn of [...listeners]) {
    try {
      fn()
    } catch {
      /* listener isolado */
    }
  }
}
