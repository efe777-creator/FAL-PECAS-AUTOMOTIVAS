import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { isValidCnpj, isValidCpf, onlyDigits } from '@/lib/document'
import { listAddresses } from '@/services/customers/addressService'
import { confirmSimulatedPayment } from '@/services/payments/paymentService'
import { placeOrder } from '@/services/orders/placeOrderService'
import { quoteShipping } from '@/services/shipping/shippingService'
import type {
  CustomerAddress,
  ShippingQuoteOption,
  SimulatedPaymentMethod,
} from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const STEPS = ['Identificação', 'Endereço', 'Entrega', 'Pagamento', 'Revisão'] as const

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CheckoutPage() {
  const { user } = useAuth()
  const { items, subtotal, clear } = useCart()
  const { push } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [docKind, setDocKind] = useState<'cpf' | 'cnpj'>('cpf')
  const [docValue, setDocValue] = useState('')
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressId, setAddressId] = useState<string>('')
  const [shippingOptions, setShippingOptions] = useState<ShippingQuoteOption[]>([])
  const [shippingOptionId, setShippingOptionId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<SimulatedPaymentMethod>('pix_simulated')
  const [loadingAddrs, setLoadingAddrs] = useState(true)
  const [quoting, setQuoting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.cpf) {
      setDocKind('cpf')
      setDocValue(user.cpf)
    } else if (user?.cnpj) {
      setDocKind('cnpj')
      setDocValue(user.cnpj)
    }
  }, [user?.cpf, user?.cnpj])

  useEffect(() => {
    void (async () => {
      setLoadingAddrs(true)
      try {
        const list = await listAddresses()
        setAddresses(list)
        const def = list.find((a: CustomerAddress) => a.isDefault) ?? list[0]
        if (def) setAddressId(def.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar endereços')
      } finally {
        setLoadingAddrs(false)
      }
    })()
  }, [])

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === addressId) ?? null,
    [addresses, addressId],
  )

  const selectedShipping = useMemo(
    () => shippingOptions.find((o) => o.id === shippingOptionId) ?? null,
    [shippingOptions, shippingOptionId],
  )

  const shippingAmount = selectedShipping?.amount ?? 0
  const total = subtotal + shippingAmount

  async function loadQuotes() {
    if (!selectedAddress) return
    setQuoting(true)
    setError(null)
    try {
      const opts = await quoteShipping({
        postalCode: selectedAddress.postalCode,
        state: selectedAddress.state,
        city: selectedAddress.city,
        subtotal,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
      })
      setShippingOptions(opts)
      setShippingOptionId((prev) => (opts.some((o) => o.id === prev) ? prev : opts[0]?.id ?? ''))
    } catch (e) {
      setShippingOptions([])
      setShippingOptionId('')
      setError(e instanceof Error ? e.message : 'Erro ao cotar frete')
    } finally {
      setQuoting(false)
    }
  }

  function validateDoc(): boolean {
    const digits = onlyDigits(docValue)
    if (docKind === 'cpf') {
      if (!isValidCpf(digits)) {
        setError('Informe um CPF válido para finalizar a compra')
        return false
      }
    } else if (!isValidCnpj(digits)) {
      setError('Informe um CNPJ válido para finalizar a compra')
      return false
    }
    return true
  }

  async function goNext() {
    setError(null)
    if (step === 0 && !validateDoc()) return
    if (step === 1) {
      if (!addressId) {
        setError('Selecione um endereço de entrega')
        return
      }
      setStep(2)
      await loadQuotes()
      return
    }
    if (step === 2) {
      if (!shippingOptionId) {
        setError('Selecione uma opção de entrega')
        return
      }
    }
    if (step === 3 && !paymentMethod) {
      setError('Selecione um método de pagamento')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  async function finalize(outcome: 'approve' | 'fail') {
    if (!validateDoc() || !addressId || !shippingOptionId) return
    setSubmitting(true)
    setError(null)
    try {
      const placed = await placeOrder({
        idempotencyKey,
        addressId,
        shippingOptionId,
        paymentMethod,
        documentKind: docKind,
        documentValue: onlyDigits(docValue),
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      })

      const paymentId = placed.paymentId
      if (!paymentId) {
        // pedido já existia — buscar payment via intent não necessário se approve path
        push('Pedido já registrado', 'success')
        clear()
        navigate(`/conta/pedidos/${placed.orderId}`)
        return
      }

      const pay = await confirmSimulatedPayment(paymentId, outcome)
      clear()
      if (outcome === 'approve') {
        push('Pagamento simulado aprovado — pedido confirmado', 'success')
      } else {
        push('Pagamento simulado recusado — pedido cancelado', 'error')
      }
      navigate(`/conta/pedidos/${pay.orderId ?? placed.orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao finalizar pedido')
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) {
    return (
      <Container className="py-8">
        <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Checkout</h1>
        <EmptyState
          title="Carrinho vazio"
          description="Adicione peças antes de finalizar a compra."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Checkout</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={[
              'rounded-full px-3 py-2 text-xs font-extrabold',
              i === step
                ? 'bg-fal-yellow text-fal-navy-dark'
                : i < step
                  ? 'bg-fal-navy text-white'
                  : 'bg-[#e9edef] text-fal-navy',
            ].join(' ')}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-fal border border-fal-danger/30 bg-red-50 px-3 py-2 text-sm text-fal-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-fal border border-fal-line bg-white p-5">
          {step === 0 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Identificação</h2>
              <p className="text-sm text-fal-muted">
                Logado como {user?.fullName || user?.email}. CPF/CNPJ é obrigatório para finalizar.
              </p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="docKind"
                    checked={docKind === 'cpf'}
                    onChange={() => setDocKind('cpf')}
                  />
                  Pessoa física (CPF)
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="docKind"
                    checked={docKind === 'cnpj'}
                    onChange={() => setDocKind('cnpj')}
                  />
                  Pessoa jurídica (CNPJ)
                </label>
              </div>
              <Input
                label={docKind === 'cpf' ? 'CPF' : 'CNPJ'}
                name="document"
                value={docValue}
                onChange={(e) => setDocValue(e.target.value)}
                placeholder={docKind === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Endereço de entrega</h2>
              {loadingAddrs ? (
                <Loading label="Carregando endereços…" />
              ) : addresses.length === 0 ? (
                <EmptyState
                  title="Nenhum endereço salvo"
                  description="Cadastre um endereço na sua conta para continuar."
                  actionLabel="Meus endereços"
                  actionTo="/conta/enderecos"
                />
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {addresses.map((a) => (
                    <li key={a.id}>
                      <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3 hover:border-fal-navy">
                        <input
                          type="radio"
                          name="address"
                          checked={addressId === a.id}
                          onChange={() => setAddressId(a.id)}
                        />
                        <span className="text-sm">
                          <strong>{a.label || a.recipient}</strong>
                          <br />
                          {a.street}, {a.number}
                          {a.complement ? ` — ${a.complement}` : ''}
                          <br />
                          {a.district ? `${a.district} · ` : ''}
                          {a.city}/{a.state} · CEP {a.postalCode}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/conta/enderecos" className="text-sm font-semibold text-fal-auth-link">
                Gerenciar endereços
              </Link>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Entrega</h2>
              {quoting ? (
                <Loading label="Cotando frete…" />
              ) : shippingOptions.length === 0 ? (
                <p className="text-sm text-fal-muted">Nenhuma opção disponível. Volte e confira o CEP.</p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {shippingOptions.map((o) => (
                    <li key={o.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-fal border border-fal-line p-3 hover:border-fal-navy">
                        <span className="flex items-center gap-3 text-sm">
                          <input
                            type="radio"
                            name="ship"
                            checked={shippingOptionId === o.id}
                            onChange={() => setShippingOptionId(o.id)}
                          />
                          <span>
                            <strong>{o.label}</strong>
                            {o.etaDaysMin != null ? (
                              <span className="block text-fal-muted">
                                {o.etaDaysMin === 0
                                  ? 'Disponível para retirada'
                                  : `${o.etaDaysMin}–${o.etaDaysMax} dias úteis`}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <strong>{money(o.amount)}</strong>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="text-sm font-semibold text-fal-navy underline"
                onClick={() => void loadQuotes()}
              >
                Recalcular frete
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Pagamento (simulado)</h2>
              <p className="text-sm text-fal-muted">
                Ambiente de teste — nenhum gateway real. Na F9 o adapter será trocado.
              </p>
              <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === 'pix_simulated'}
                  onChange={() => setPaymentMethod('pix_simulated')}
                />
                <span className="text-sm font-semibold">Pix simulado</span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === 'card_simulated'}
                  onChange={() => setPaymentMethod('card_simulated')}
                />
                <span className="text-sm font-semibold">Cartão simulado</span>
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Revisão</h2>
              <div className="text-sm">
                <p>
                  <strong>Documento:</strong> {docKind.toUpperCase()} {onlyDigits(docValue)}
                </p>
                <p>
                  <strong>Endereço:</strong>{' '}
                  {selectedAddress
                    ? `${selectedAddress.street}, ${selectedAddress.number} — ${selectedAddress.city}/${selectedAddress.state}`
                    : '—'}
                </p>
                <p>
                  <strong>Entrega:</strong> {selectedShipping?.label ?? '—'} ({money(shippingAmount)})
                </p>
                <p>
                  <strong>Pagamento:</strong>{' '}
                  {paymentMethod === 'pix_simulated' ? 'Pix simulado' : 'Cartão simulado'}
                </p>
              </div>
              <ul className="m-0 list-none space-y-2 border-t border-fal-line p-0 pt-3">
                {items.map((i) => (
                  <li key={i.productId} className="flex justify-between text-sm">
                    <span>
                      {i.quantity}× {i.name}
                    </span>
                    <span>{money(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={() => void finalize('approve')}
                >
                  {submitting ? 'Processando…' : 'Simular pagamento aprovado'}
                </Button>
                <Button
                  variant="light"
                  disabled={submitting}
                  onClick={() => void finalize('fail')}
                >
                  Simular pagamento recusado
                </Button>
              </div>
            </div>
          ) : null}

          {step < 4 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {step > 0 ? (
                <Button type="button" variant="light" onClick={() => setStep((s) => s - 1)}>
                  Voltar
                </Button>
              ) : (
                <Link to="/carrinho">
                  <Button type="button" variant="light">
                    Carrinho
                  </Button>
                </Link>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={quoting || (step === 1 && addresses.length === 0)}
                onClick={() => void goNext()}
              >
                Continuar
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="h-max rounded-fal border border-fal-line bg-white p-5">
          <div className="mb-3 flex justify-between text-sm">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="mb-3 flex justify-between text-sm text-fal-muted">
            <span>Frete</span>
            <span>{selectedShipping ? money(shippingAmount) : 'A calcular'}</span>
          </div>
          <div className="flex justify-between border-t border-fal-line pt-3 text-xl font-black">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <p className="mt-3 text-xs text-fal-muted">
            Totais definitivos são recalculados no servidor ao finalizar.
          </p>
        </aside>
      </div>
    </Container>
  )
}
