import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SavedAddressQuoteSelect } from '@/components/shipping/SavedAddressQuoteSelect'
import { useAuth } from '@/contexts/AuthContext'
import { formatCepMask } from '@/lib/cep'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { listAddresses } from '@/services/customers/addressService'
import { resolveShippingMeEnvMode } from '@/services/shipping/carrierRegistry'
import { isOwnConfirmCheckoutOption } from '@/services/shipping/ownConfirmCheckoutOption'
import { preferStorefrontShippingOption } from '@/services/shipping/preferStorefrontShippingOption'
import { quoteStorefrontShippingEnvelope } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import { formatShippingEtaLabel } from '@/services/shipping/shippingEta'
import {
  loadShippingQuoteHandoff,
  saveShippingQuoteHandoff,
} from '@/services/shipping/shippingQuoteSession'
import {
  createStorePickupOption,
  isStorePickupOption,
  STORE_PICKUP_OPTION_ID,
} from '@/services/shipping/storePickupOption'
import type { CustomerAddress, Product, ShippingQuoteOption, StoreShippingOrigin } from '@/types'
import { useEffect, useMemo, useState } from 'react'

type QuoteAddrHint = {
  state?: string
  city?: string
  street?: string
  district?: string | null
  number?: string
  id?: string
}

type Props = {
  product: Product
  quantity?: number
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

function optionAmountLabel(o: ShippingQuoteOption): string {
  if (isOwnConfirmCheckoutOption(o)) return 'No checkout'
  return formatMoney(o.amount)
}

const PICKUP_OPTION = createStorePickupOption()

/**
 * PDP: retirada sempre disponível (sem CEP).
 * Frete em casa: CEP (+ nº do endereço salvo) → opções precificadas.
 */
export function ProductShippingQuoteBlock({ product, quantity = 1 }: Props) {
  const { user } = useAuth()
  const [cep, setCep] = useState('')
  const [savedAddressId, setSavedAddressId] = useState('')
  const [savedAddress, setSavedAddress] = useState<CustomerAddress | null>(null)
  const [loading, setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<ShippingQuoteEnvelope | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState<StoreShippingOrigin | null>(null)
  const [quoted, setQuoted] = useState(false)

  const ready = useMemo(() => productQuoteReady(product), [product])
  const qty = Math.max(1, Math.floor(quantity) || 1)

  const deliveryOptions = useMemo(() => {
    if (envelope?.status !== 'ok' || !envelope.options.length) return []
    return envelope.options.filter((o) => !isStorePickupOption(o))
  }, [envelope])

  const pickupSelected = selectedId === STORE_PICKUP_OPTION_ID
  const selectedDelivery = deliveryOptions.find((o) => o.id === selectedId) ?? null
  const selected =
    pickupSelected ? PICKUP_OPTION : selectedDelivery
  const selectedProvisional = selected ? isOwnConfirmCheckoutOption(selected) : false
  const itemsSubtotal = displayPrice(product) * qty
  const freightAmount = selected && !selectedProvisional ? selected.amount : 0
  const estimatedTotal = itemsSubtotal + freightAmount
  const selectedEta = selected ? formatShippingEtaLabel(selected) : ''

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
    if (!selected) return
    const digits = cep.replace(/\D/g, '')
    saveShippingQuoteHandoff({
      postalCode: digits.length === 8 ? digits : undefined,
      preferredAddressId: savedAddressId || undefined,
      option: selected,
    })
  }, [selected, cep, savedAddressId])

  function selectPickup() {
    setSelectedId(STORE_PICKUP_OPTION_ID)
  }

  function selectDeliveryOption(id: string) {
    setSelectedId(id)
  }

  function hintFromAddress(address: CustomerAddress): QuoteAddrHint {
    return {
      id: address.id,
      state: address.state,
      city: address.city,
      street: address.street,
      district: address.district,
      number: address.number,
    }
  }

  async function runQuoteFor(postalDigits: string, addrHint?: QuoteAddrHint) {
    if (!ready) return
    setLoading(true)
    setEnvelope(null)
    setQuoted(true)
    const keepPickup = selectedId === STORE_PICKUP_OPTION_ID
    if (!keepPickup) setSelectedId(null)
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
        if (!keepPickup) setSelectedId(null)
        return
      }

      const number = (addrHint?.number ?? '').trim()
      const via = addrHint?.city
        ? {
            cep: postalDigits,
            state: addrHint.state ?? '',
            city: addrHint.city,
            street: addrHint.street ?? '',
            district: addrHint.district ?? undefined,
          }
        : await viaCepProvider.lookupByCep(postalDigits)

      const unitPrice = displayPrice(product)
      const subtotal = unitPrice * qty
      const { envelope: env } = await quoteStorefrontShippingEnvelope(
        {
          postalCode: via.cep,
          state: via.state,
          city: via.city,
          street: via.street || addrHint?.street,
          number: number || undefined,
          district: via.district ?? addrHint?.district ?? undefined,
          subtotal,
          itemCount: qty,
          originPostalCode: origin?.postalCode,
          items: [
            {
              productId: product.id,
              quantity: qty,
              weightKg: product.weightKg ?? null,
              heightCm: product.heightCm ?? null,
              widthCm: product.widthCm ?? null,
              lengthCm: product.lengthCm ?? null,
            },
          ],
          totalWeightKg:
            product.weightKg != null ? product.weightKg * qty : undefined,
        },
        { cepOnlyQuickQuote: !number },
      )
      setEnvelope(env)
      if (keepPickup) {
        setSelectedId(STORE_PICKUP_OPTION_ID)
      } else if (env.status === 'ok' && env.options.length) {
        const carriers = env.options.filter((o) => !isStorePickupOption(o))
        const preferred = preferStorefrontShippingOption(
          carriers.length ? carriers : env.options,
          loadShippingQuoteHandoff(),
        )
        setSelectedId(preferred?.id ?? carriers[0]?.id ?? env.options[0]!.id)
      } else {
        setSelectedId(null)
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
      if (!keepPickup) setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }

  async function resolveHintForCep(postalDigits: string): Promise<QuoteAddrHint | undefined> {
    if (
      savedAddress &&
      savedAddress.postalCode.replace(/\D/g, '') === postalDigits &&
      savedAddress.number?.trim()
    ) {
      return hintFromAddress(savedAddress)
    }
    if (!user) return undefined
    try {
      const list = await listAddresses()
      const match = list.find((a) => a.postalCode.replace(/\D/g, '') === postalDigits)
      if (!match?.number?.trim()) return undefined
      setSavedAddressId(match.id)
      setSavedAddress(match)
      return hintFromAddress(match)
    } catch {
      return undefined
    }
  }

  function onConsultar() {
    const digits = cep.replace(/\D/g, '')
    void (async () => {
      const hint = await resolveHintForCep(digits)
      await runQuoteFor(digits, hint)
    })()
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
    void runQuoteFor(digits, hintFromAddress(address))
  }

  return (
    <section
      className="rounded-[10px] border border-fal-line bg-fal-bg p-3 sm:p-4"
      aria-labelledby="pdp-entrega-frete-title"
    >
      <h2 id="pdp-entrega-frete-title" className="m-0 text-base font-extrabold text-fal-navy">
        Entrega
      </h2>

      <ul className="m-0 mt-3 list-none p-0" aria-label="Retirada na loja">
        <li>
          <label
            className={`flex cursor-pointer items-start justify-between gap-3 rounded-[10px] border px-3 py-2.5 transition-colors ${
              pickupSelected
                ? 'border-fal-navy bg-white ring-1 ring-fal-navy'
                : 'border-fal-line bg-white hover:border-fal-navy/40'
            }`}
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <input
                type="radio"
                name="pdp-ship-opt"
                className="mt-1 shrink-0"
                checked={pickupSelected}
                onChange={selectPickup}
              />
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-fal-navy">
                  Retirada na loja
                </span>
                <span className="mt-0.5 block text-xs text-fal-muted">
                  {pickupSelected
                    ? 'Sem frete · endereço e horário no checkout'
                    : 'Sem frete · sem precisar de CEP'}
                </span>
              </span>
            </span>
            <strong className="shrink-0 text-sm text-fal-navy">{formatMoney(0)}</strong>
          </label>
        </li>
      </ul>

      <div className="mt-4 border-t border-fal-line pt-3">
        <h3 className="m-0 text-sm font-extrabold text-fal-navy">Receber em casa</h3>
        <p className="mb-0 mt-1 text-[11px] text-fal-muted">
          Informe o CEP para ver prazo e valor das entregas.
        </p>

        {ready ? (
          <div className="mt-3 space-y-3">
            <SavedAddressQuoteSelect
              valueId={savedAddressId}
              name="pdp-saved-address"
              onSelect={onSavedAddress}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="CEP de destino"
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
                variant="primary"
                size="sm"
                disabled={loading}
                onClick={onConsultar}
                className="sm:mb-0.5"
              >
                {loading ? 'Calculando…' : 'Calcular'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mb-0 mt-2 text-xs text-fal-muted">
            Frete por transportadora indisponível neste produto no momento. Use a retirada na
            loja ou confirme a entrega no checkout.
          </p>
        )}

        {deliveryOptions.length > 0 ? (
          <ul
            className="m-0 mt-3 list-none space-y-2 p-0"
            role="listbox"
            aria-label="Opções de frete"
          >
            {deliveryOptions.map((o) => {
              const eta = formatShippingEtaLabel(o)
              const active = selectedId === o.id
              return (
                <li key={o.id}>
                  <label
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-[10px] border px-3 py-2.5 transition-colors ${
                      active
                        ? 'border-fal-navy bg-white ring-1 ring-fal-navy'
                        : 'border-fal-line bg-white hover:border-fal-navy/40'
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-2.5">
                      <input
                        type="radio"
                        name="pdp-ship-opt"
                        className="mt-1 shrink-0"
                        checked={active}
                        onChange={() => selectDeliveryOption(o.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold text-fal-navy">
                          {o.label}
                        </span>
                        {eta ? (
                          <span className="mt-0.5 block text-xs text-fal-muted">{eta}</span>
                        ) : null}
                      </span>
                    </span>
                    <strong className="shrink-0 text-sm text-fal-navy">
                      {optionAmountLabel(o)}
                    </strong>
                  </label>
                </li>
              )
            })}
          </ul>
        ) : null}

        {selectedDelivery && !pickupSelected ? (
          <p className="mb-0 mt-3 rounded-[8px] border border-fal-line bg-white px-2.5 py-2 text-xs text-fal-ink">
            {selectedProvisional ? (
              <>
                <span className="font-semibold text-fal-navy">Entrega FAL</span>
                {selectedEta ? <span className="text-fal-muted"> · {selectedEta}</span> : null}
                <span className="text-fal-muted"> · confirme no checkout</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-fal-navy">
                  Frete {formatMoney(freightAmount)}
                </span>
                {selectedEta ? <span className="text-fal-muted"> · {selectedEta}</span> : null}
                <span className="text-fal-muted">
                  {' '}
                  · Total estimado {formatMoney(estimatedTotal)}
                </span>
              </>
            )}
          </p>
        ) : null}

        {envelope && envelope.status !== 'ok' && quoted ? (
          <p className="mb-0 mt-2 text-xs text-fal-danger" role="alert">
            {envelope.message ?? 'Consulta de entrega indisponível no momento.'}
          </p>
        ) : null}
      </div>
    </section>
  )
}
