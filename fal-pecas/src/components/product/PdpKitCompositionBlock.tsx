import { formatMoney } from '@/lib/money'
import type { StoreKitComposition } from '@/services/products/kitCompositionStoreService'
import { Link } from 'react-router-dom'

type Props = {
  composition: StoreKitComposition
  /** Preço efetivo do kit na loja. */
  kitPrice: number
}

/** Bloco de composição do kit na PDP (acordeão / buy-box auxiliar). */
export function PdpKitCompositionBlock({ composition, kitPrice }: Props) {
  const { lines, componentsSum } = composition
  if (!lines.length) {
    return (
      <p className="m-0 text-sm text-fal-muted">Composição do kit ainda não cadastrada.</p>
    )
  }

  const savings =
    componentsSum != null && componentsSum > kitPrice
      ? Math.round((componentsSum - kitPrice) * 100) / 100
      : null

  return (
    <div className="space-y-2">
      <ul className="m-0 list-none space-y-1.5 p-0">
        {lines.map((line) => (
          <li
            key={line.productId}
            className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm"
          >
            <span className="min-w-0">
              <span className="font-semibold text-fal-fg">{line.quantity}×</span>{' '}
              <Link to={line.href} className="text-fal-navy underline-offset-2 hover:underline dark:text-fal-fg">
                {line.name}
              </Link>
              <span className="ml-1 text-xs text-fal-muted">
                ({line.commercialRef || line.sku})
              </span>
              {!line.available ? (
                <span className="ml-1 text-xs font-semibold text-fal-danger">indisponível</span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-fal-muted">
              {line.unitPrice != null ? formatMoney(line.unitPrice) : '—'}
            </span>
          </li>
        ))}
      </ul>
      {componentsSum != null ? (
        <p className="m-0 text-xs text-fal-muted">
          Soma dos itens: <strong className="text-fal-fg">{formatMoney(componentsSum)}</strong>
          {savings != null && savings > 0 ? (
            <>
              {' '}
              · economia no kit:{' '}
              <strong className="text-fal-success">{formatMoney(savings)}</strong>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
