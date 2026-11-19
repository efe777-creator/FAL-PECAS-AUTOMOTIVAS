import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message?: string
  /** Alias usado em telas da garagem. */
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  description,
  onRetry,
}: ErrorStateProps) {
  const body = message ?? description ?? ''
  return (
    <div className="rounded-fal border border-fal-line bg-fal-surface px-5 py-10 text-center text-fal-fg">
      <h2 className="m-0 text-xl font-extrabold text-fal-fg">{title}</h2>
      <p className="mt-2 text-fal-danger">{body}</p>
      {onRetry ? (
        <div className="mt-4 flex justify-center">
          <Button variant="dark" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  )
}
