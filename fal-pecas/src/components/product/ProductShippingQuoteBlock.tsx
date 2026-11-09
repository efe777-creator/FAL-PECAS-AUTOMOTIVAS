import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ShippingOptionBrand } from '@/components/shipping/ShippingOptionBrand'
import { formatMoney } from '@/lib/money'
import { viaCepProvider } from '@/services/address/viaCepProvider'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { quoteStorefrontShippingEnvelope } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteEnvelope } from '@/services/shipping/shippingQuoteContract'
import type { Product } from '@/types'
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

export function ProductShippingQuoteBlock({ product }: Props) {
  const [cep, setCep] = useState('')
  const [number, setNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<ShippingQuoteEnvelope | null>(null)
  const [originPostalCode, setOriginPostalCode] = useState<string | undefined>()
  const [hintNeedsNumber, setHintNeedsNumber] = useState(false)

  const ready = useMemo(() => productQuoteReady(product), [product])

  useEffect(() => {
    let active = true
    void getStoreShippingOrigin()
      .then((o) => {
        if (active) setOriginPostalCode(o?.postalCode)
      })
      .catch(() => {
        /* origem opcional na PDP */
      })
    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return (
      <div className="mt-4 rounded-fal border border-fal-line bg-fal-bg/40 p-3 text-sm text-fal-muted">
        Frete indisponível para este produto no momento. Você ainda pode adicionar ao carrinho e
        finalizar a compra — o valor da entrega será confirmado no checkout ou pelo nosso
        atendimento.
      </div>
    )
  }

  async function onConsultar() {
    setLoading(true)
    setEnvelope(null)
    setHintNeedsNumber(false)
    try {
      const digits = cep.replace(/\D/g, '')
      if (digits.length !== 8) {
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
      const price = product.price ?? 0
      const { envelope: env, needsAddressNumber } = await quoteStorefrontShippingEnvelope({
        postalCode: addr.cep,
        state: addr.state,
        city: addr.city,
        street: addr.street,
        district: addr.district,
        number: number.trim() || undefined,
        subtotal: price,
        itemCount: 1,
        originPostalCode,
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
      setHintNeedsNumber(needsAddressNumber)
      setEnvelope(env)
    } catch (e) {
      setEnvelope({
        status: 'provider_error',
        providerId: 'melhorenvio',
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
    <section
      className="mt-5 rounded-[10px] border border-fal-line bg-fal-bg p-3 sm:p-4"
      aria-labelledby="pdp-entrega-frete-title"
    >
      <h2 id="pdp-entrega-frete-title" className="m-0 text-base font-extrabold text-fal-navy">
        Entrega e frete
      </h2>
      <p className="mb-3 mt-1 text-sm text-fal-muted">
        Informe o CEP para ver opções de entrega na sua região.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label="CEP"
            name="pdp-shipping-cep"
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
        </div>
        <div className="w-full sm:w-28">
          <Input
            label="Nº"
            name="pdp-shipping-number"
            inputMode="text"
            autoComplete="address-line2"
            placeholder="123"
            value={number}
            onChange={(e) => setNumber(e.target.value.slice(0, 20))}
          />
        </div>
        <Button
          type="button"
          variant="light"
          disabled={loading}
          onClick={() => void onConsultar()}
          className="sm:mb-0.5"
        >
          {loading ? 'Consultando…' : 'Consultar'}
        </Button>
      </div>
      <p className="mb-0 mt-1 text-xs text-fal-muted">
        Nº do endereço libera cotação de frete próprio (quando disponível na região).
      </p>

      {envelope?.disclaimer && !/D-FRETE|VITE_|mock|sandbox|webhook/i.test(envelope.disclaimer) ? (
        <p className="mb-0 mt-3 text-xs font-semibold text-fal-muted">{envelope.disclaimer}</p>
      ) : null}

      {hintNeedsNumber ? (
        <p className="mb-0 mt-2 text-xs text-amber-800">
          Preencha o número e consulte de novo para incluir entrega FAL nesta região.
        </p>
      ) : null}

      {envelope && envelope.status !== 'ok' ? (
        <p className="mb-0 mt-3 text-sm text-fal-danger" role="alert">
          {envelope.message ?? 'Consulta de entrega indisponível no momento.'}
        </p>
      ) : null}

      {envelope?.status === 'ok' && envelope.options.length === 0 ? (
        <p className="mb-0 mt-3 text-sm text-fal-muted" role="status">
          {envelope.message && !/medida|cadastro|packing|D-FRETE/i.test(envelope.message)
            ? envelope.message
            : 'Nenhuma opção de entrega para este CEP no momento. Tente outro CEP ou fale conosco.'}
        </p>
      ) : null}

      {envelope?.status === 'ok' && envelope.options.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="m-0 text-sm font-bold text-fal-ink">Opções disponíveis</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {envelope.options.map((o) => (
              <li
                key={o.id}
                className="rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm"
              >
                <ShippingOptionBrand option={o} />
                <div className="mt-0.5 text-fal-ink">
                  Frete: <strong>{formatMoney(o.amount)}</strong>
                </div>
                {o.etaDaysMin != null || o.etaDaysMax != null ? (
                  <div className="text-xs text-fal-muted">
                    Prazo estimado:{' '}
                    {o.etaDaysMin != null && o.etaDaysMax != null
                      ? `${o.etaDaysMin}–${o.etaDaysMax} dias úteis`
                      : `${o.etaDaysMin ?? o.etaDaysMax} dias úteis`}{' '}
                    (estimativa)
                  </div>
                ) : (
                  <div className="text-xs text-fal-muted">Prazo estimado: conforme cotação</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
