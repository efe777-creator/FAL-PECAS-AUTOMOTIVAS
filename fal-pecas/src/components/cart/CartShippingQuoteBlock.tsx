import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ShippingOptionBrand } from '@/components/shipping/ShippingOptionBrand'
import { formatMoney } from '@/lib/money'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { loadCartLogistics } from '@/services/shipping/loadCartLogistics'
import { quoteStorefrontShippingEnvelope } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import { saveShippingQuoteHandoff } from '@/services/shipping/shippingQuoteSession'
import type { CartItem } from '@/types'
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
 * Invalida e recota ao mudar itens/qty quando o CEP já está completo.
 */
export function CartShippingQuoteBlock({ items, subtotal, onShippingAmountChange }: Props) {
  const [cep, setCep] = useState('')
  const [number, setNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<ShippingQuoteEnvelope | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [originPostalCode, setOriginPostalCode] = useState<string | undefined>()
  const [hintNeedsNumber, setHintNeedsNumber] = useState(false)
  const quoteGen = useRef(0)

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
        if (active) setOriginPostalCode(o?.postalCode)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const runQuote = useCallback(
    async (opts?: { silentClear?: boolean }) => {
      const digits = cep.replace(/\D/g, '')
      const gen = ++quoteGen.current
      setLoading(true)
      if (!opts?.silentClear) {
        setEnvelope(null)
        setSelectedId('')
        setHintNeedsNumber(false)
      }
      try {
        if (digits.length !== 8) {
          if (gen !== quoteGen.current) return
          setEnvelope({
            status: 'invalid_cep',
            providerId: 'melhorenvio',
            mode: 'sandbox',
            options: [],
            quotedAt: new Date().toISOString(),
            requestFingerprint: digits,
            message: 'Informe um CEP válido com 8 dígitos.',
          })
          return
        }
        const addr = await viaCepProvider.lookupByCep(digits)
        const logistics = await loadCartLogistics(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        )
        const { envelope: env, needsAddressNumber } = await quoteStorefrontShippingEnvelope({
          postalCode: addr.cep,
          state: addr.state,
          city: addr.city,
          street: addr.street,
          district: addr.district,
          number: number.trim() || undefined,
          subtotal,
          itemCount: items.reduce((n, i) => n + i.quantity, 0),
          originPostalCode,
          items: logistics,
          totalWeightKg:
            logistics.reduce((acc, it) => acc + (it.weightKg ?? 0) * (it.quantity || 1), 0) ||
            undefined,
        })
        if (gen !== quoteGen.current) return
        setHintNeedsNumber(needsAddressNumber)
        setEnvelope(env)
        if (env.status === 'ok' && env.options[0]) {
          setSelectedId(env.options[0].id)
        } else {
          setSelectedId('')
        }
      } catch (e) {
        if (gen !== quoteGen.current) return
        setEnvelope({
          status: 'provider_error',
          providerId: 'melhorenvio',
          mode: 'sandbox',
          options: [],
          quotedAt: new Date().toISOString(),
          requestFingerprint: cep,
          message: e instanceof Error ? e.message : 'Não foi possível consultar a entrega.',
        })
        setSelectedId('')
      } finally {
        if (gen === quoteGen.current) setLoading(false)
      }
    },
    [cep, number, items, subtotal, originPostalCode],
  )

  // Mudança de carrinho: limpa e recota se CEP completo (O1-D).
  useEffect(() => {
    setEnvelope(null)
    setSelectedId('')
    onShippingAmountChange?.(null, null)
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8 || items.length === 0) return
    void runQuote({ silentClear: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a cartKey; CEP/nº já no runQuote
  }, [cartKey])

  useEffect(() => {
    if (!envelope || envelope.status !== 'ok') {
      onShippingAmountChange?.(null, null)
      return
    }
    const opt = envelope.options.find((o) => o.id === selectedId) ?? envelope.options[0]
    if (opt) {
      onShippingAmountChange?.(opt.amount, opt.label)
      const digits = cep.replace(/\D/g, '')
      if (digits.length === 8) {
        saveShippingQuoteHandoff({ postalCode: digits, preferredOptionId: opt.id })
      }
    } else {
      onShippingAmountChange?.(null, null)
    }
  }, [envelope, selectedId, onShippingAmountChange, cep])

  return (
    <div className="mb-3 border-b border-fal-line pb-3">
      <p className="m-0 mb-2 text-sm font-extrabold text-fal-navy">Entrega e frete</p>
      <div className="flex flex-col gap-2">
        <Input
          label="CEP de destino"
          name="cart-shipping-cep"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => setCep(formatCepInput(e.target.value))}
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
          onChange={(e) => setNumber(e.target.value.slice(0, 20))}
        />
        <Button type="button" variant="light" size="sm" disabled={loading} onClick={() => void runQuote()}>
          {loading ? 'Consultando…' : 'Consultar frete'}
        </Button>
      </div>

      {envelope?.disclaimer ? (
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

      {envelope?.status === 'ok' && envelope.options.length === 0 ? (
        <p className="mb-0 mt-2 text-xs text-fal-muted" role="status">
          {envelope.message ??
            'Nenhuma opção de entrega para este CEP e itens. Confira medidas dos produtos ou tente outro CEP.'}
        </p>
      ) : null}

      {envelope?.status === 'ok'
        ? envelope.options.map((o) => (
            <label
              key={o.id}
              className="mt-2 flex cursor-pointer gap-2 rounded-[8px] border border-fal-line bg-fal-bg px-2 py-2 text-xs"
            >
              <input
                type="radio"
                name="cart-ship-opt"
                checked={selectedId === o.id}
                onChange={() => setSelectedId(o.id)}
              />
              <span className="min-w-0 flex-1">
                <ShippingOptionBrand option={o} />
                <span className="mt-0.5 block text-fal-ink">
                  {formatMoney(o.amount)}
                  {o.etaDaysMin != null && o.etaDaysMax != null
                    ? ` · ${o.etaDaysMin}–${o.etaDaysMax} dias (est.)`
                    : ''}
                </span>
              </span>
            </label>
          ))
        : null}
    </div>
  )
}
