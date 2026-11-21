import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  hint?: string
  error?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, hint, error, id, className = '', disabled, ...props }, ref) {
    const autoId = useId()
    const inputId = id ?? props.name ?? autoId
    const [visible, setVisible] = useState(false)

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-xs font-extrabold text-fal-muted">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            disabled={disabled}
            className={[
              'fal-field w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-3 pr-[4.5rem] text-fal-fg outline-none sm:pr-24',
              'placeholder:text-fal-muted disabled:cursor-not-allowed disabled:opacity-60',
              'focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]',
              error ? 'border-fal-danger' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          <button
            type="button"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md px-1.5 py-1 text-[11px] font-extrabold text-fal-muted hover:bg-fal-surface-2 hover:text-fal-fg disabled:opacity-50 sm:right-2 sm:px-2 sm:text-[12px]"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            disabled={disabled}
          >
            <span className="sm:hidden">{visible ? 'Ocultar' : 'Ver'}</span>
            <span className="hidden sm:inline">{visible ? 'Ocultar' : 'Mostrar'}</span>
          </button>
        </div>
        {hint && !error ? <p className="text-[13px] text-fal-muted">{hint}</p> : null}
        {error ? <p className="text-[13px] text-fal-danger">{error}</p> : null}
      </div>
    )
  },
)
