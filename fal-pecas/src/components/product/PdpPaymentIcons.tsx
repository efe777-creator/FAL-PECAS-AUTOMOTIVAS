/**
 * Faixa de ícones de meios (referência visual PDP) — sem segunda lógica de preço.
 */
export function PdpPaymentIcons({ className = '' }: { className?: string }) {
  return (
    <ul
      className={[
        'm-0 hidden list-none flex-wrap items-center gap-1.5 p-0 [@media(min-height:820px)]:flex',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Formas de pagamento aceitas"
    >
      <li>
        <span
          className="inline-flex h-7 items-center gap-1 rounded-fal border border-fal-line bg-fal-bg px-1.5 text-[10px] font-extrabold uppercase tracking-wide text-fal-navy dark:bg-fal-surface-2 dark:text-fal-fg"
          title="Pix"
        >
          Pix
        </span>
      </li>
      <li>
        <span
          className="inline-flex h-7 items-center gap-1 rounded-fal border border-fal-line bg-fal-bg px-1.5 text-[10px] font-extrabold uppercase tracking-wide text-fal-navy dark:bg-fal-surface-2 dark:text-fal-fg"
          title="Cartão"
        >
          Cartão
        </span>
      </li>
      <li>
        <span
          className="inline-flex h-7 items-center gap-1 rounded-fal border border-fal-line bg-fal-bg px-1.5 text-[10px] font-extrabold uppercase tracking-wide text-fal-navy dark:bg-fal-surface-2 dark:text-fal-fg"
          title="Boleto"
        >
          Boleto
        </span>
      </li>
    </ul>
  )
}
