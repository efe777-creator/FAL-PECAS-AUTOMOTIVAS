import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'outline' | 'outlineDark' | 'dark' | 'light' | 'danger'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: Size
  fullWidth?: boolean
  children: ReactNode
}

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-fal-yellow text-fal-navy-dark hover:bg-fal-yellow-hover border-transparent',
  /** Contorno para fundo claro (branco / cards). */
  outline:
    'bg-white text-fal-navy border border-fal-navy/30 hover:bg-fal-bg',
  /** Contorno para fundo escuro (hero Home). */
  outlineDark:
    'bg-transparent text-white border border-white/40 hover:bg-white/10',
  dark: 'bg-fal-navy text-white border-transparent hover:bg-fal-navy-dark',
  light: 'bg-white text-fal-navy border border-fal-line hover:bg-fal-bg',
  danger: 'bg-fal-bg text-fal-danger border-transparent hover:bg-red-50',
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
}: {
  variant?: ButtonVariant
  size?: Size
  fullWidth?: boolean
  className?: string
}): string {
  const sizeCls = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-[19px] py-[13px] text-sm'
  return [
    'inline-flex items-center justify-center gap-2 rounded-[10px] font-extrabold border transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    sizeCls,
    buttonVariantClasses[variant],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </button>
  )
}
