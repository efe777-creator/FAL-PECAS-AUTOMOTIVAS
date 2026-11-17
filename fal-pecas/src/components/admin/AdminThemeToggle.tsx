import type { AdminTheme } from '@/lib/adminTheme'

type Props = {
  theme: AdminTheme
  onToggle: () => void
  /** dark = ícone em sidebar navy; light = header claro */
  variant?: 'dark' | 'light'
  /** Com texto — mais fácil de achar no header/desktop */
  showLabel?: boolean
}

export function AdminThemeToggle({
  theme,
  onToggle,
  variant = 'light',
  showLabel = false,
}: Props) {
  const isDark = theme === 'dark'
  const label = isDark ? 'Ativar modo claro' : 'Ativar modo escuro'
  const short = isDark ? 'Claro' : 'Escuro'
  const base =
    variant === 'dark'
      ? 'border-white/20 text-white hover:bg-white/10 focus-visible:ring-white/80 focus-visible:ring-offset-fal-navy'
      : 'border-fal-line bg-fal-surface text-fal-fg hover:bg-fal-surface-2 focus-visible:ring-fal-accent focus-visible:ring-offset-fal-surface'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2.5 transition',
        showLabel ? 'min-w-[6.5rem] px-3 text-sm font-bold' : 'h-11 w-11 min-w-11',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        base,
      ].join(' ')}
    >
      <span className="text-base leading-none" aria-hidden>
        {isDark ? '☀' : '☾'}
      </span>
      {showLabel ? <span>{short}</span> : null}
    </button>
  )
}
