import type { StoreTheme } from '@/lib/storeTheme'

type Props = {
  theme: StoreTheme
  onToggle: () => void
  showLabel?: boolean
}

/** Toggle de tema da loja (wrapper separado do admin). */
export function StoreThemeToggle({ theme, onToggle, showLabel = false }: Props) {
  const isDark = theme === 'dark'
  const label = isDark ? 'Ativar modo claro' : 'Ativar modo escuro'
  const short = isDark ? 'Claro' : 'Escuro'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-fal-line',
        'bg-fal-surface text-fal-fg transition hover:bg-fal-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fal-surface',
        showLabel ? 'min-w-[6.5rem] px-3 text-sm font-bold' : 'h-11 w-11 min-w-11',
      ].join(' ')}
    >
      <span className="text-base leading-none" aria-hidden>
        {isDark ? '☀' : '☾'}
      </span>
      {showLabel ? <span>{short}</span> : null}
    </button>
  )
}
