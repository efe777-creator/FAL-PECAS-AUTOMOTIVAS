import {
  buttonClassName,
  type ButtonVariant,
} from '@/components/common/Button'
import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Size = 'md' | 'sm'

interface ButtonLinkProps extends Omit<LinkProps, 'className'> {
  variant?: ButtonVariant
  size?: Size
  fullWidth?: boolean
  className?: string
  children: ReactNode
}

/** Link estilizado como botão — evita <Link><Button> aninhado. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={[
        buttonClassName({ variant, size, fullWidth, className }),
        'no-underline',
      ].join(' ')}
      {...props}
    >
      {children}
    </Link>
  )
}
