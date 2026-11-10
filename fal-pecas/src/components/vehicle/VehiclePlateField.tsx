import { formatPlateMask } from '@/services/plates/plateNormalize'
import type { FormEvent, KeyboardEvent } from 'react'

export type VehiclePlateFieldProps = {
  value: string
  onChange: (masked: string) => void
  onSubmit: () => void
  loading?: boolean
  error?: string | null
  disabled?: boolean
  id?: string
}

/**
 * Campo no visual de placa BR (Mercosul).
 * Dispara consulta com Enter ou ícone — sem botão amarelo separado.
 */
export function VehiclePlateField({
  value,
  onChange,
  onSubmit,
  loading = false,
  error = null,
  disabled = false,
  id = 'plate',
}: VehiclePlateFieldProps) {
  function submit() {
    if (loading || disabled) return
    onSubmit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  function handleForm(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  return (
    <form className="w-full max-w-md" onSubmit={handleForm} noValidate>
      <label htmlFor={id} className="sr-only">
        Placa do veículo
      </label>

      <div
        className={[
          'group relative flex h-[3.35rem] overflow-hidden rounded-[10px] border-2 bg-[#f4f5f7]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_rgba(15,23,42,0.08)]',
          'transition-[border-color,box-shadow]',
          error
            ? 'border-fal-danger'
            : 'border-[#1a2330]/focus-within:border-fal-navy focus-within:shadow-[0_0_0_3px_rgba(242,200,75,0.28)]',
        ].join(' ')}
      >
        {/* Faixa Mercosul */}
        <div
          className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 bg-[#003399] text-white sm:w-12"
          aria-hidden
        >
          <span className="text-[9px] font-bold leading-none tracking-wide">BR</span>
          <span className="grid grid-cols-2 gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffcc00]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffcc00]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffcc00]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffcc00]" />
          </span>
        </div>

        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            name="plate"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={disabled || loading}
            placeholder="ABC1D23"
            value={value}
            maxLength={8}
            onChange={(e) => onChange(formatPlateMask(e.target.value))}
            onKeyDown={handleKeyDown}
            className={[
              'fal-plate-input h-full w-full border-0 bg-transparent px-3 pr-12 text-center',
              'text-[1.55rem] text-[#1a2330] outline-none placeholder:tracking-[0.18em]',
              'placeholder:text-[#9aa3ad] disabled:opacity-60 sm:text-[1.7rem]',
            ].join(' ')}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
          />

          <button
            type="submit"
            disabled={disabled || loading}
            title="Consultar placa (Enter)"
            aria-label={loading ? 'Consultando placa' : 'Consultar placa'}
            className={[
              'absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center',
              'rounded-full text-fal-navy transition',
              'hover:bg-fal-navy/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow',
              'disabled:cursor-wait disabled:opacity-60',
            ].join(' ')}
          >
            {loading ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-fal-navy/25 border-t-fal-navy"
                aria-hidden
              />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M5 12h12m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs font-semibold text-fal-danger" role="alert">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-2 text-xs text-fal-muted">
          Digite a placa e pressione Enter
        </p>
      )}
    </form>
  )
}
