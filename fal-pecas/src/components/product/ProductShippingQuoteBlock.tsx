import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SavedAddressQuoteSelect } from '@/components/shipping/SavedAddressQuoteSelect'
import { StorePickupNotice } from '@/components/shipping/StorePickupNotice'
import { formatCepMask } from '@/lib/cep'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { resolveShippingMeEnvMode } from '@/services/shipping/carrierRegistry'
import { quoteStorefrontShippingEnvelope } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import { saveShippingQuoteHandoff } from '@/services/shipping/shippingQuoteSession'
import {
  createStorePickupOption,
  isStorePickupOption,
  STORE_PICKUP_OPTION_ID,
} from '@/services/shipping/storePickupOption'
import type { CustomerAddress, Product, ShippingQuoteOption, StoreShippingOrigin } from '@/types'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  product: Product
}

function formatCepInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function productQuoteReady(product: Product): boolean {
  return (
    product.weightKg != null &&
    product.weightKg > 0 &&
    product.heightCm != null &&
    product.heightCm > 0 &&
    product.widthCm != null &&
    product.widthCm > 0 &&
    product.lengthCm != null &&
    product.lengthCm > 0
  )
}

function etaLabel(o: ShippingQuoteOption): string {
  if (isStorePickupOption(o)) return 'Retirada'
  if (o.etaDaysMin != null && o.etaDaysMax != null) {
    return `${o.etaDaysMin}–${o.etaDaysMax} d`
  }
  if (o.etaDaysMin != null || o.etaDaysMax != null) {
    return `${o.etaDaysMin ?? o.etaDaysMax} d`
  }
  return ''
}

/**
 * Cotação leve na PDP: CEP manual ou endereço salvo no perfil.
 * Número/complemento extras confirmam no checkout (endereço salvo já traz o nº para cotar).
 */
export function ProductShippingQuoteBlock({ product }: Props) {
  const [cep, setCep] = useState('')
  const [savedAddressId, setSavedAddressId] = useState('')
  const [savedAddress, setSavedAddress] = useState<CustomerAddress | null>(null)
  const [loading, setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<ShippingQuoteEnvelope | null>(null)
  const [selectedId, setSelectedId] = useState(STORE_PICKUP_OPTION_ID)
  const [origin, setOrigin] = useState<StoreShippingOrigin | null>(null)
  const [ownConfirmLater, setOwnConfirmLater] = useState(false)

  const ready = useMemo(() => productQuoteReady(product), [product])
  const pickupOnly = useMemo(() => [createStorePickupOption()], [])

  const displayOptions = useMemo(() => {
    if (envelope?.status === 'ok' && envelope.options.length) return envelope.options
    return pickupOnly
  }, [envelope, pickupOnly])

  useEffect(() => {
    let active = true
    void getStoreShippingOrigin()
      .then((o) => {
        if (active) setOrigin(o)
      })
      .catch(() => {
        /* origem opcional na PDP */
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const opt = displayOptions.find((o) => o.id === selectedId) ?? displayOptions[0]
    if (!opt) return
    if (opt.id !== selectedId) setSelectedId(opt.id)
    const digits = cep.replace(/\D/g, '')
    saveShippingQuoteHandoff({
      postalCode: digits.length === 8 ? digits : undefined,
      preferredAddressId: savedAddressId || undefined,
      option: opt,
    })
  }, [selectedId, displayOptions, cep, savedAddressId])

  async function runQuoteFor(
    postalDigits: string,
    addrHint?: {
      state?: string
      city?: string
      street?: string
      district?: string | null
      number?: string
    },
  ) {
    if (!ready) return
    setLoading(true)
    setEnvelope(null)
    setOwnConfirmLater(false)
    try {
      if (postalDigits.length !== 8) {
        setEnvelope({
          status: 'invalid_cep',
          providerId: 'melhorenvio',
          mode: resolveShippingMeEnvMode(),
          options: [],
          quotedAt: new Date().toISOString(),
          requestFingerprint: postalDigits,
          message: 'Informe um CEP válido com 8 dígitos.',
        })
        return
      }

      const via = addrHint?.city
        ? {
            cep: postalDigits,
            state: addrHint.state ?? '',
            city: addrHint.city,
            street: addrHint.street ?? '',
            district: addrHint.district ?? undefined,
          }
        : await viaCepProvider.lookupByCep(postalDigits)

      const price = product.price ?? 0
      const { envelope: env, needsAddressNumber } = await quoteStorefrontShippingEnvelope({
        postalCode: via.cep,
        state: via.state,
        city: via.city,
        street: via.street || addrHint?.street,
        district: via.district ?? addrHint?.district ?? undefined,
        // Nº só se veio de endereço salvo — CEP avulso confirma no checkout.
        number: addrHint?.number?.trim() || undefined,
        subtotal: price,
        itemCount: 1,
        originPostalCode: origin?.postalCode,
        items: [
          {
            productId: product.id,
            quantity: 1,
            weightKg: product.weightKg ?? null,
            heightCm: product.heightCm ?? null,
            widthCm: product.widthCm ?? null,
            lengthCm: product.lengthCm ?? null,
          },
        ],
        totalWeightKg: product.weightKg ?? undefined,
      })
      setOwnConfirmLater(needsAddressNumber)
      setEnvelope(env)
      if (env.status === 'ok' && env.options.length) {
        const keep = env.options.find((o) => o.id === selectedId) ?? env.options[0]
        if (keep) setSelectedId(keep.id)
      }
    } catch (e) {
      setEnvelope({
        status: 'provider_error',
        providerId: 'melhorenvio',
        mode: resolveShippingMeEnvMode(),
        options: [],
        quotedAt: new Date().toISOString(),
        requestFingerprint: postalDigits,
        message: toUserMessage(e, 'Não foi possível consultar a entrega.'),
      })
    } finally {
      setLoading(false)
    }
  }

  function onConsultar() {
    void runQuoteFor(cep.replace(/\D/g, ''), savedAddress
      ? {
          state: savedAddress.state,
          city: savedAddress.city,
          street: savedAddress.street,
          district: savedAddress.district,
          number: savedAddress.number,
        }
      : undefined)
  }

  function onSavedAddress(address: CustomerAddress | null) {
    if (!address) {
      setSavedAddressId('')
      setSavedAddress(null)
      return
    }
    setSavedAddressId(address.id)
    setSavedAddress(address)
    const digits = address.postalCode.replace(/\D/g, '')
    setCep(formatCepMask(digits))
    void runQuoteFor(digits, {
      state: address.state,
      city: address.city,
      street: address.street,
      district: address.district,
      number: address.number,
    })
  }

  const selected = displayOptions.find((o) => o.id === selectedId)
  const showPickupNotice = selected ? isStorePickupOption(selected) : false

  return (
    <section
      className="mt-5 rounded-[10px] border border-fal-line bg-fal-bg p-3 sm:p-4"
      aria-labelledby="pdp-entrega-frete-title"
    >
      <h2 id="pdp-entrega-frete-title" className="m-0 text-base font-extrabold text-fal-navy">
        Entrega e frete
      </h2>
      <p className="mb-2 mt-1 text-xs text-fal-muted">
        Use um endereço do perfil ou consulte por CEP. A modalidade segue no checkout com
        “Comprar agora”.
      </p>

      <SavedAddressQuoteSelect
        valueId={savedAddressId}
        name="pdp-saved-address"
        onSelect={onSavedAddress}
      />

      <ul className="m-0 mb-3 list-none space-y-1.5 p-0">
        {displayOptions.map((o) => (
          <li key={o.id}>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-fal-line bg-white px-2.5 py-1.5 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="radio"
                  name="pdp-ship-opt"
                  checked={selectedId === o.id}
                  onChange={() => setSelectedId(o.id)}
                />
                <span className="truncate font-semibold text-fal-ink">{o.label}</span>
                {etaLabel(o) ? (
                  <span className="shrink-0 text-fal-muted">{etaLabel(o)}</span>
                ) : null}
              </span>
              <strong className="shrink-0 text-fal-navy">{formatMoney(o.amount)}</strong>
            </label>
          </li>
        ))}
      </ul>

      {showPickupNotice ? <StorePickupNotice origin={origin} compact /> : null}

      {ready ? (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="CEP"
                name="pdp-shipping-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => {
                  setSavedAddressId('')
                  setSavedAddress(null)
                  setCep(formatCepInput(e.target.value))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onConsultar()
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="light"
              size="sm"
              disabled={loading}
              onClick={onConsultar}
              className="sm:mb-0.5"
            >
              {loading ? '…' : 'Consultar fretes'}
            </Button>
          </div>
          <p className="mb-0 mt-1 text-[11px] text-fal-muted">
            CEP avulso não pede número aqui — no checkout você confirma nº e complemento.
          </p>
        </>
      ) : (
        <p className="mb-0 mt-2 text-xs text-fal-muted">
          Frete por transportadora indisponível neste produto no momento. Você pode retirar na loja
          ou confirmar a entrega no checkout.
        </p>
      )}

      {ownConfirmLater ? (
        <p className="mb-0 mt-2 text-xs text-fal-muted">
          Entrega FAL (própria), se disponível, confirma no checkout com o número do endereço.
        </p>
      ) : null}

      {envelope && envelope.status !== 'ok' ? (
        <p className="mb-0 mt-2 text-xs text-fal-danger" role="alert">
          {envelope.message ?? 'Consulta de entrega indisponível no momento.'}
        </p>
      ) : null}
    </section>
  )
}
