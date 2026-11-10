import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SavedAddressQuoteSelect } from '@/components/shipping/SavedAddressQuoteSelect'
import { StorePickupNotice } from '@/components/shipping/StorePickupNotice'
import { formatCepMask } from '@/lib/cep'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { loadCartLogistics } from '@/services/shipping/loadCartLogistics'
import { resolveShippingMeEnvMode } from '@/services/shipping/carrierRegistry'
import { quoteStorefrontShippingEnvelope } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import { saveShippingQuoteHandoff } from '@/services/shipping/shippingQuoteSession'
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
 * Cotação do **conjunto** do carrinho (não soma fretes unitários).
 * Sempre oferece retirada R$ 0; demais opções após consultar CEP.
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
  const quoteGen = useRef(0)

  const pickupOnly = useMemo(() => [createStorePickupOption()], [])

  const displayOptions = useMemo(() => {
    if (envelope?.status === 'ok' && envelope.options.length) return envelope.options
    return pickupOnly
  }, [envelope, pickupOnly])

  const cartKey = useMemo(
    () =>
      items
        .map((i) => `${i.productId}:${i.quantity}`)
        .sort()
        .join('|') + `::${subtotal.toFixed(2)}`,
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
        if (env.status === 'ok' && env.options.length) {
          const keep =
            env.options.find((o) => o.id === selectedId) ?? env.options[0]
          if (keep) setSelectedId(keep.id)
        }
      } catch (e) {
        if (gen !== quoteGen.current) return
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
    [cep, number, items, subtotal, origin?.postalCode, selectedId],
  )

  useEffect(() => {
    setEnvelope(null)
    onShippingAmountChange?.(null, null)
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8 || items.length === 0) return
    void runQuote({ silentClear: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a cartKey; CEP/nº já no runQuote
  }, [cartKey])

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

  const selected = displayOptions.find((o) => o.id === selectedId)
  const showPickupNotice = selected ? isStorePickupOption(selected) : false

  return (
    <div className="mb-3 border-b border-fal-line pb-3">
      <p className="m-0 mb-2 text-sm font-extrabold text-fal-navy">Entrega e frete</p>

      <SavedAddressQuoteSelect
        valueId={savedAddressId}
        name="cart-saved-address"
        onSelect={onSavedAddress}
      />

      <div className="mb-2 space-y-1.5">
        {displayOptions.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-fal-line bg-fal-bg px-2 py-1.5 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <input
                type="radio"
                name="cart-ship-opt"
                checked={selectedId === o.id}
                onChange={() => setSelectedId(o.id)}
              />
              <span className="truncate font-semibold text-fal-ink">{o.label}</span>
            </span>
            <span className="shrink-0 text-fal-ink">
              {formatMoney(o.amount)}
              {o.etaDaysMin != null && o.etaDaysMax != null && !isStorePickupOption(o)
                ? ` · ${o.etaDaysMin}–${o.etaDaysMax} d`
                : isStorePickupOption(o)
                  ? ' · Retirada'
                  : ''}
            </span>
          </label>
        ))}
      </div>

      {showPickupNotice ? <StorePickupNotice origin={origin} compact /> : null}

      <div className="mt-2 flex flex-col gap-2">
        <Input
          label="CEP de destino"
          name="cart-shipping-cep"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => {
            setSavedAddressId('')
            setCep(formatCepInput(e.target.value))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void runQuote()
            }
          }}
        />
        <Input
          label="Nº (frete próprio)"
          name="cart-shipping-number"
          inputMode="text"
          autoComplete="address-line2"
          placeholder="123"
          value={number}
          onChange={(e) => {
            setSavedAddressId('')
            setNumber(e.target.value.slice(0, 20))
          }}
        />
        <Button type="button" variant="light" size="sm" disabled={loading} onClick={() => void runQuote()}>
          {loading ? 'Consultando…' : 'Consultar fretes'}
        </Button>
      </div>

      {envelope?.disclaimer && !/D-FRETE|VITE_|mock|sandbox|webhook/i.test(envelope.disclaimer) ? (
        <p className="mb-0 mt-2 text-[11px] font-semibold text-fal-muted">{envelope.disclaimer}</p>
      ) : null}

      {hintNeedsNumber ? (
        <p className="mb-0 mt-2 text-[11px] text-amber-800">
          Preencha o número para incluir entrega FAL nesta região.
        </p>
      ) : null}

      {envelope && envelope.status !== 'ok' ? (
        <p className="mb-0 mt-2 text-xs text-fal-danger" role="alert">
          {envelope.message ?? 'Consulta indisponível.'}
        </p>
      ) : null}
    </div>
  )
}
