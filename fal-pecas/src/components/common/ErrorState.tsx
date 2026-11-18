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
    <div className="rounded-fal border border-fal-line bg-white px-5 py-10 text-center">
      <h2 className="m-0 text-xl font-extrabold text-fal-navy-dark">{title}</h2>
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
