import type { ResolvedVehicleImage } from '@/types'

type Props = {
  image: ResolvedVehicleImage
  colorHex?: string | null
  title?: string
  className?: string
}

/** Moldura de imagem do veículo: pessoal/stock/placeholder + chip de nível. */
export function VehicleImageFrame({ image, colorHex, title, className = '' }: Props) {
  const showDisclaimer = image.source === 'stock' && image.level !== 'exact'

  return (
    <div
      className={[
        'relative flex min-h-[160px] items-end overflow-hidden rounded-fal bg-gradient-to-br from-fal-navy to-fal-navy-dark text-white',
        className,
      ].join(' ')}
      style={
        !image.url && colorHex
          ? { background: `linear-gradient(135deg, ${colorHex} 0%, #0b1f33 85%)` }
          : undefined
      }
    >
      {image.url ? (
        <img
          src={image.url}
          alt={title ? `Foto de ${title}` : 'Foto do veículo'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="relative z-[1] w-full bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4">
        {title ? <p className="m-0 text-xl font-extrabold leading-tight">{title}</p> : null}
        <p className="mb-0 mt-1 text-xs font-semibold text-white/85">{image.label}</p>
        {showDisclaimer ? (
          <p className="mb-0 mt-1 text-[11px] font-medium text-white/75">
            Não é foto do seu carro — ilustração de referência.
          </p>
        ) : null}
      </div>
    </div>
  )
}
