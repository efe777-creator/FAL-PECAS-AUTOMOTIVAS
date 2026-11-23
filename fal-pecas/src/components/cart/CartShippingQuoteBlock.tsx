import { Button } from '@/components/common/Button'
import { SavedAddressQuoteSelect } from '@/components/shipping/SavedAddressQuoteSelect'
import { StorePickupNotice } from '@/components/shipping/StorePickupNotice'
import { formatCepMask } from '@/lib/cep'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { cartItemsQuoteFingerprint } from '@/services/shipping/cartQuoteFingerprint'
import { loadCartLogistics } from '@/services/shipping/loadCartLogistics'
import { resolveShippingMeEnvMode } from '@/services/shipping/carrierRegistry'
import { preferStorefrontShippingOption } from '@/services/shipping/preferStorefrontShippingOption'
import { quoteStorefrontShippingEnvelope } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import {
  loadShippingQuoteHandoff,
  saveShippingQuoteHandoff,
} from '@/services/shipping/shippingQuoteSession'
import { formatShippingEtaLabel } from '@/services/shipping/shippingEta'
import {
  createStorePickupOption,
  isStorePickupOption,
  STORE_PICKUP_OPTION_ID,
} from '@/services/shipping/storePickupOption'
import type { CartItem, CustomerAddress, StoreShippingOrigin } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  items: CartItem[]
  subtotal: number
  onShippingAmountChange?: (amount: number | null, optionLabel: string | null) => void
}

function formatCepInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/**
 * Cotação do **conjunto** do carrinho (SPEC D1 — não soma fretes unitários).
 * UI alinhada ao padrão PDP M5: “Calcular frete” + CEP + Consultar compacto.
 */
export function CartShippingQuoteBlock({ items, subtotal, onShippingAmountChange }: Props) {
  const [cep, setCep] = useState('')
  const [number, setNumber] = useState('')
  const [savedAddressId, setSavedAddressId] = useState('')
  const [loading, setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<ShippingQuoteEnvelope | null>(null)
  const [selectedId, setSelectedId] = useState(STORE_PICKUP_OPTION_ID)
  const [origin, setOrigin] = useState<StoreShippingOrigin | null>(null)
  const [hintNeedsNumber, setHintNeedsNumber] = useState(false)
  const [quoted, setQuoted] = useState(false)
  const quoteGen = useRef(0)

  const pickupOnly = useMemo(() => [createStorePickupOption()], [])

  const displayOptions = useMemo(() => {
    if (envelope?.status === 'ok' && envelope.options.length) return envelope.options
    return pickupOnly
  }, [envelope, pickupOnly])

  const cartKey = useMemo(
    () => cartItemsQuoteFingerprint(items, subtotal),
    [items, subtotal],
  )

  useEffect(() => {
    let active = true
    void getStoreShippingOrigin()
      .then((o) => {
        if (active) setOrigin(o)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const runQuote = useCallback(
    async (opts?: {
      silentClear?: boolean
      postalCode?: string
      number?: string
      street?: string
      district?: string | null
      city?: string
      state?: string
    }) => {
      const digits = (opts?.postalCode ?? cep).replace(/\D/g, '')
      const numberUse = (opts?.number ?? number).trim()
      const gen = ++quoteGen.current
      setLoading(true)
      if (!opts?.silentClear) {
        setEnvelope(null)
        setHintNeedsNumber(false)
      }
      try {
        if (digits.length !== 8) {
          if (gen !== quoteGen.current) return
          setQuoted(true)
          setEnvelope({
            status: 'invalid_cep',
            providerId: 'melhorenvio',
            mode: resolveShippingMeEnvMode(),
            options: [],
            quotedAt: new Date().toISOString(),
            requestFingerprint: digits,
            message: 'Informe um CEP válido com 8 dígitos.',
          })
          return
        }
        const addr =
          opts?.city && opts?.state
            ? {
                cep: digits,
                state: opts.state,
                city: opts.city,
                street: opts.street ?? '',
                district: opts.district ?? undefined,
              }
            : await viaCepProvider.lookupByCep(digits)
        const logistics = await loadCartLogistics(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        )
        const { envelope: env, needsAddressNumber } = await quoteStorefrontShippingEnvelope({
          postalCode: addr.cep,
          state: addr.state,
          city: addr.city,
          street: addr.street || opts?.street,
          district: addr.district ?? opts?.district ?? undefined,
          number: numberUse || undefined,
          subtotal,
          itemCount: items.reduce((n, i) => n + i.quantity, 0),
          originPostalCode: origin?.postalCode,
          items: logistics,
          totalWeightKg:
            logistics.reduce((acc, it) => acc + (it.weightKg ?? 0) * (it.quantity || 1), 0) ||
            undefined,
        })
        if (gen !== quoteGen.current) return
        setHintNeedsNumber(needsAddressNumber)
        setEnvelope(env)
        setQuoted(true)
        if (env.status === 'ok' && env.options.length) {
          const prev = loadShippingQuoteHandoff()
          const preferred = preferStorefrontShippingOption(env.options, {
            postalCode: digits,
            preferredAddressId: savedAddressId || prev?.preferredAddressId,
            preferredOptionId: prev?.preferredOptionId ?? selectedId,
            preferredKind: prev?.preferredKind,
            preferredServiceCode: prev?.preferredServiceCode,
            preferredLabel: prev?.preferredLabel,
            savedAt: prev?.savedAt ?? new Date().toISOString(),
          })
          if (preferred) setSelectedId(preferred.id)
        }
      } catch (e) {
        if (gen !== quoteGen.current) return
        setQuoted(true)
        setEnvelope({
          status: 'provider_error',
          providerId: 'melhorenvio',
          mode: resolveShippingMeEnvMode(),
          options: [],
          quotedAt: new Date().toISOString(),
          requestFingerprint: digits,
          message: toUserMessage(e, 'Não foi possível consultar a entrega.'),
        })
      } finally {
        if (gen === quoteGen.current) setLoading(false)
      }
    },
    [cep, number, items, subtotal, origin?.postalCode, selectedId, savedAddressId],
  )

  useEffect(() => {
    setEnvelope(null)
    setQuoted(false)
    onShippingAmountChange?.(null, null)
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8 || items.length === 0) return
    void runQuote({ silentClear: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a cartKey; CEP/nº já no runQuote
  }, [cartKey])

  /** CEP completo → cotar o conjunto atual (pré-seleção / handoff para o checkout). */
  useEffect(() => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8 || items.length === 0) return
    void runQuote({ silentClear: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- CEP dispara; nº entra no runQuote
  }, [cep])

  useEffect(() => {
    const opt = displayOptions.find((o) => o.id === selectedId) ?? displayOptions[0]
    if (!opt) {
      onShippingAmountChange?.(null, null)
      return
    }
    onShippingAmountChange?.(opt.amount, opt.label)
    const digits = cep.replace(/\D/g, '')
    saveShippingQuoteHandoff({
      postalCode: digits.length === 8 ? digits : undefined,
      preferredAddressId: savedAddressId || undefined,
      option: opt,
    })
  }, [displayOptions, selectedId, onShippingAmountChange, cep, savedAddressId])

  function onSavedAddress(address: CustomerAddress | null) {
    if (!address) {
      setSavedAddressId('')
      return
    }
    setSavedAddressId(address.id)
    const digits = address.postalCode.replace(/\D/g, '')
    setCep(formatCepMask(digits))
    setNumber(address.number)
    void runQuote({
      postalCode: digits,
      number: address.number,
      street: address.street,
      district: address.district,
      city: address.city,
      state: address.state,
    })
  }

  function onConsultar() {
    void runQuote()
  }

  const selected = displayOptions.find((o) => o.id === selectedId)
  const showPickupNotice = selected ? isStorePickupOption(selected) : false
  const showNumberField = hintNeedsNumber || number.trim().length > 0

  return (
    <section
      className="mb-3 border-b border-fal-line pb-3"
      aria-labelledby="cart-entrega-frete-title"
    >
      <h2
        id="cart-entrega-frete-title"
        className="m-0 text-[13px] font-extrabold text-fal-navy dark:text-fal-fg"
      >
        Calcular frete
      </h2>

      <div className="mt-1.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="cart-shipping-cep">
            CEP
          </label>
          <input
            id="cart-shipping-cep"
            name="cart-shipping-cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Digite seu CEP"
            aria-label="CEP"
            className="fal-field min-w-0 flex-1 rounded-[9px] border border-fal-line bg-fal-bg px-2.5 py-1.5 text-sm text-fal-fg outline-none placeholder:text-fal-muted focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]"
            value={cep}
            onChange={(e) => {
              setSavedAddressId('')
              setCep(formatCepInput(e.target.value))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onConsultar()
              }
            }}
          />
          <Button
            type="button"
            variant="dark"
            size="sm"
            disabled={loading}
            onClick={onConsultar}
            className="h-9 shrink-0"
          >
            {loading ? '…' : 'Consultar'}
          </Button>
        </div>

        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-semibold text-fal-navy hover:underline dark:text-fal-fg [&::-webkit-details-marker]:hidden">
            Usar endereço salvo
          </summary>
          <div className="mt-1.5">
            <SavedAddressQuoteSelect
              valueId={savedAddressId}
              name="cart-saved-address"
              onSelect={onSavedAddress}
            />
          </div>
        </details>

        {showNumberField ? (
          <div>
            <label className="sr-only" htmlFor="cart-shipping-number">
              Número (entrega FAL)
            </label>
            <input
              id="cart-shipping-number"
              name="cart-shipping-number"
              inputMode="text"
              autoComplete="address-line2"
              placeholder="Nº do endereço"
              aria-label="Número do endereço"
              className="fal-field w-full rounded-[9px] border border-fal-line bg-fal-bg px-2.5 py-1.5 text-sm text-fal-fg outline-none placeholder:text-fal-muted focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]"
              value={number}
              onChange={(e) => {
                setSavedAddressId('')
                setNumber(e.target.value.slice(0, 20))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onConsultar()
                }
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-1.5 space-y-1.5">
        {displayOptions.map((o) => {
          const active = selectedId === o.id
          const eta = formatShippingEtaLabel(o)
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start justify-between gap-2 rounded-fal border px-2 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-fal-navy bg-fal-bg ring-1 ring-fal-navy dark:border-fal-yellow'
                  : 'border-fal-line bg-fal-bg hover:border-fal-navy/40'
              }`}
            >
              <span className="flex min-w-0 items-start gap-2">
                <input
                  type="radio"
                  name="cart-ship-opt"
                  className="mt-0.5 shrink-0"
                  checked={active}
                  onChange={() => setSelectedId(o.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-fal-navy dark:text-fal-fg">
                    {o.label}
                  </span>
                  {eta && !isStorePickupOption(o) ? (
                    <span className="mt-0.5 block text-xs text-fal-muted">{eta}</span>
                  ) : null}
                </span>
              </span>
              <strong className="shrink-0 text-fal-navy dark:text-fal-fg">
                {formatMoney(o.amount)}
              </strong>
            </label>
          )
        })}
      </div>

      {showPickupNotice ? <StorePickupNotice origin={origin} compact /> : null}

      {envelope?.disclaimer && !/D-FRETE|VITE_|mock|sandbox|webhook/i.test(envelope.disclaimer) ? (
        <p className="mb-0 mt-2 text-[11px] font-semibold text-fal-muted">{envelope.disclaimer}</p>
      ) : null}

      {hintNeedsNumber ? (
        <p className="mb-0 mt-2 text-[11px] text-amber-800">
          Preencha o número para incluir entrega FAL nesta região.
        </p>
      ) : null}

      {envelope && envelope.status !== 'ok' && quoted ? (
        <p className="mb-0 mt-2 text-xs text-fal-danger" role="alert">
          {envelope.message ?? 'Consulta de entrega indisponível no momento.'}
        </p>
      ) : null}

      {envelope?.status === 'ok' && envelope.options.length === 0 ? (
        <p className="mb-0 mt-2 text-xs text-fal-muted">
          Nenhuma opção de frete para este CEP. Use a retirada ou confirme no checkout.
        </p>
      ) : null}
    </section>
  )
}
