import type { ShippingQuoteOption } from '@/types'

type Props = {
  option: ShippingQuoteOption
  className?: string
}

function companyPicture(option: ShippingQuoteOption): string | null {
  const m = option.metadata
  if (!m) return null
  if (typeof m.company_picture === 'string' && m.company_picture) return m.company_picture
  const company = m.company
  if (company && typeof company === 'object' && company !== null) {
    const pic = (company as { picture?: unknown }).picture
    if (typeof pic === 'string' && pic) return pic
  }
  return null
}

function companyName(option: ShippingQuoteOption): string | null {
  const m = option.metadata
  if (!m) return null
  if (typeof m.company_name === 'string' && m.company_name.trim()) return m.company_name.trim()
  const company = m.company
  if (company && typeof company === 'object' && company !== null) {
    const n = (company as { name?: unknown }).name
    if (typeof n === 'string' && n.trim()) return n.trim()
  }
  return null
}

/** Logo + nome da opção de frete (ME / próprio). */
export function ShippingOptionBrand({ option, className }: Props) {
  const picture = companyPicture(option)
  const company = companyName(option)

  return (
    <div className={className ? `flex items-start gap-2 ${className}` : 'flex items-start gap-2'}>
      {picture ? (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-fal-line bg-white">
          <img src={picture} alt="" className="max-h-7 max-w-7 object-contain" loading="lazy" />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="font-extrabold text-fal-navy">{option.label}</div>
        {company && !option.label.includes(company) ? (
          <div className="text-xs text-fal-muted">{company}</div>
        ) : null}
      </div>
    </div>
  )
}
