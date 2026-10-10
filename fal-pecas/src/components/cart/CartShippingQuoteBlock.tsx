import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatMoney } from '@/lib/money'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { quoteShippingEnvelope } from '@/services/shipping/quoteShippingEnvelope'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import { saveShippingQuoteHandoff } from '@/services/shipping/shippingQuoteSession'
import type { CartItem } from '@/types'
import { useEffect, useMemo, useState } from 'react'

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
 * Invalida ao mudar itens/qty (fingerprint no envelope).
 */
export function CartShippingQuoteBlock({ items, subtotal, onShippingAmountChange }: Props) {
  const [cep, setCep] = useState('')
  const [loading, setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<ShippingQuoteEnvelope | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [originPostalCode, setOriginPostalCode] = useState<string | undefined>()

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

  // Mudança de carrinho invalida cotação anterior
  useEffect(() => {
    setEnvelope(null)
    setSelectedId('')
    onShippingAmountChange?.(null, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
  }, [envelope, selectedId, onShippingAmountChange, cep])

  async function onConsultar() {
    setLoading(true)
    setEnvelope(null)
    try {
      const digits = cep.replace(/\D/g, '')
      if (digits.length !== 8) {
        setEnvelope({
          status: 'invalid_cep',
          providerId: 'local',
          mode: 'sandbox',
          options: [],
          quotedAt: new Date().toISOString(),
          requestFingerprint: digits,
          message: 'Informe um CEP válido com 8 dígitos.',
        })
        return
      }
      const addr = await viaCepProvider.lookupByCep(digits)
      const env = await quoteShippingEnvelope({
        postalCode: addr.cep,
        state: addr.state,
        city: addr.city,
        subtotal,
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        originPostalCode,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      })
      setEnvelope(env)
      if (env.status === 'ok' && env.options[0]) {
        setSelectedId(env.options[0].id)
      }
    } catch (e) {
      setEnvelope({
        status: 'provider_error',
        providerId: 'local',
        mode: 'sandbox',
        options: [],
        quotedAt: new Date().toISOString(),
        requestFingerprint: cep,
        message: e instanceof Error ? e.message : 'Não foi possível consultar a entrega.',
      })
    } finally {
      setLoading(false)
    }
  }

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
              void onConsultar()
            }
          }}
        />
        <Button type="button" variant="light" size="sm" disabled={loading} onClick={() => void onConsultar()}>
          {loading ? 'Consultando…' : 'Consultar frete'}
        </Button>
      </div>

      {envelope?.disclaimer ? (
        <p className="mb-0 mt-2 text-[11px] font-semibold text-fal-muted">{envelope.disclaimer}</p>
      ) : null}

      {envelope && envelope.status !== 'ok' ? (
        <p className="mb-0 mt-2 text-xs text-fal-danger" role="alert">
          {envelope.message ?? 'Consulta indisponível.'}
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
              <span>
                <strong>{o.label}</strong>
                <br />
                {formatMoney(o.amount)}
                {o.etaDaysMin != null && o.etaDaysMax != null
                  ? ` · ${o.etaDaysMin}–${o.etaDaysMax} dias (est.)`
                  : ''}
              </span>
            </label>
          ))
        : null}
    </div>
  )
}
