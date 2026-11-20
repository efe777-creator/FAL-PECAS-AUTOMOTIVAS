import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

type Props = { children: ReactNode }
type State = { error: Error | null }

export function getRouteErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    const detail =
      typeof error.data === 'string'
        ? error.data
        : error.data &&
            typeof error.data === 'object' &&
            'message' in error.data &&
            typeof error.data.message === 'string'
          ? error.data.message
          : null
    return detail ?? `${error.status} ${error.statusText || 'Erro de rota'}`
  }
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return 'Falha inesperada ao carregar a página.'
}

export function isDynamicImportError(error: unknown): boolean {
  const message = getRouteErrorMessage(error).toLowerCase()
  return (
    message.includes('dynamically imported module') ||
    message.includes('failed to fetch dynamically') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror')
  )
}

/**
 * O React Router captura rejeições de lazy imports antes do ErrorBoundary global.
 * Sem errorElement, uma falha transitória de chunk pode resultar em tela vazia.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = getRouteErrorMessage(error)

  useEffect(() => {
    if (!isDynamicImportError(error)) return
    const key = `fal-route-reload:${window.location.pathname}`
    const lastAttempt = Number(window.sessionStorage.getItem(key) ?? 0)
    const now = Date.now()
    if (now - lastAttempt < 30_000) return
    window.sessionStorage.setItem(key, String(now))
    window.location.reload()
  }, [error])

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-fal-bg px-4 py-16 text-fal-fg">
      <div className="w-full max-w-lg rounded-[14px] border border-fal-line bg-fal-surface p-6 text-center shadow-sm">
        <h1 className="m-0 text-xl font-extrabold">Não foi possível abrir esta página</h1>
        <p className="mt-2 text-sm text-fal-muted">
          A aplicação encontrou uma falha ao carregar esta rota. Recarregue para
          tentar novamente.
        </p>
        <p className="mt-3 break-all rounded-[10px] border border-fal-line bg-fal-bg p-3 text-left text-xs text-fal-danger">
          {message}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded-[10px] bg-fal-yellow px-4 py-2.5 text-sm font-extrabold text-fal-navy-dark"
            onClick={() => window.location.reload()}
          >
            Recarregar aplicação
          </button>
          <a
            href="/"
            className="rounded-[10px] border border-fal-line px-4 py-2.5 text-sm font-bold text-fal-fg"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </main>
  )
}

/** Evita tela branca total quando um filho quebra no render. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FAL] UI crash', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-extrabold text-fal-fg">Algo deu errado</h1>
          <p className="mt-2 text-sm text-fal-muted">
            A página falhou ao carregar. Tente recarregar.
          </p>
          <p className="mt-3 break-all rounded-[10px] border border-fal-line bg-fal-bg p-3 text-left text-xs text-fal-danger">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="mt-4 rounded-[10px] bg-fal-yellow px-4 py-2.5 text-sm font-extrabold text-fal-navy-dark"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
