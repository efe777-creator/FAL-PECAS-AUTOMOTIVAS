import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { MercadoPagoCardBrickPanel } from '@/components/payments/MercadoPagoCardBrickPanel'
import { MercadoPagoPixPanel } from '@/components/payments/MercadoPagoPixPanel'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import {
  formatDocumentMask,
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from '@/lib/document'
import { AddressForm } from '@/components/address/AddressForm'
import { formatCepMask } from '@/lib/cep'
import { formatMoney } from '@/lib/money'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { listAddresses, upsertAddress } from '@/services/customers/addressService'
import { createMercadoPagoPayment } from '@/services/payments/mpCreatePaymentService'
import {
  confirmSimulatedPayment,
  isMercadoPagoCheckoutEnabled,
} from '@/services/payments/paymentService'
import { placeOrder } from '@/services/orders/placeOrderService'
import { getActiveCarrierDescriptor } from '@/services/shipping/shippingService'
import { loadCartLogistics } from '@/services/shipping/loadCartLogistics'
import { quoteShippingEnvelope } from '@/services/shipping/quoteShippingEnvelope'
import {
  loadShippingQuoteHandoff,
  clearShippingQuoteHandoff,
} from '@/services/shipping/shippingQuoteSession'
import type {
  CustomerAddress,
  ShippingQuoteOption,
  SimulatedPaymentMethod,
} from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const STEPS = ['Identificação', 'Endereço', 'Entrega', 'Pagamento', 'Revisão'] as const

function money(v: number) {
  return formatMoney(v)
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
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [originPostalCode, setOriginPostalCode] = useState<string | undefined>()
  const [shippingOptions, setShippingOptions] = useState<ShippingQuoteOption[]>([])
  const [shippingOptionId, setShippingOptionId] = useState('')
  const [shippingDisclaimer, setShippingDisclaimer] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<SimulatedPaymentMethod>('pix_simulated')
  const [loadingAddrs, setLoadingAddrs] = useState(true)
  const [quoting, setQuoting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState<string | null>(null)
  const quoteKeyRef = useRef('')
  const preferredShipOptRef = useRef<string | undefined>(undefined)
  const carrierDesc = useMemo(() => getActiveCarrierDescriptor(), [])
  const mpEnabled = isMercadoPagoCheckoutEnabled()
  const mpPublicKey = (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined)?.trim() ?? ''
  const [mpChannel, setMpChannel] = useState<'pix' | 'card'>('pix')
  const [mpAwaiting, setMpAwaiting] = useState<{
    channel: 'pix' | 'card'
    orderId: string
    paymentId?: string
    amount: number
  } | null>(null)

  const onMpApproved = useCallback(
    (oid: string) => {
      push('Pagamento confirmado — pedido em análise', 'success')
      navigate(`/conta/pedidos/${oid}`)
    },
    [navigate, push],
  )

  const onMpError = useCallback(
    (msg: string) => {
      setError(msg)
      push(msg, 'error')
    },
    [push],
  )

  useEffect(() => {
    if (user?.cpf) {
      setDocKind('cpf')
      setDocValue(formatDocumentMask('cpf', user.cpf))
    } else if (user?.cnpj) {
      setDocKind('cnpj')
      setDocValue(formatDocumentMask('cnpj', user.cnpj))
    }
  }, [user?.cpf, user?.cnpj])

  async function reloadAddresses(selectId?: string) {
    setLoadingAddrs(true)
    try {
      const list = await listAddresses()
      setAddresses(list)
      const preferred =
        (selectId ? list.find((a) => a.id === selectId) : null) ??
        list.find((a: CustomerAddress) => a.isDefault) ??
        list[0]
      if (preferred) setAddressId(preferred.id)
      else setAddressId('')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar endereços')
    } finally {
      setLoadingAddrs(false)
    }
  }

  useEffect(() => {
    void reloadAddresses()
    void getStoreShippingOrigin()
      .then((o) => setOriginPostalCode(o?.postalCode))
      .catch(() => setOriginPostalCode(undefined))
  }, [])

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === addressId) ?? null,
    [addresses, addressId],
  )

  const selectedShipping = useMemo(
    () => shippingOptions.find((o) => o.id === shippingOptionId) ?? null,
    [shippingOptions, shippingOptionId],
  )

  const itemCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const shippingAmount = selectedShipping?.amount ?? 0
  const total = subtotal + shippingAmount

  async function loadQuotes(force = false) {
    if (!selectedAddress) return
    const key = [
      originPostalCode ?? '',
      selectedAddress.postalCode,
      itemCount,
      subtotal.toFixed(2),
    ].join('|')
    if (!force && key === quoteKeyRef.current && shippingOptions.length) return
    setQuoting(true)
    setError(null)
    try {
      if (!preferredShipOptRef.current) {
        preferredShipOptRef.current = loadShippingQuoteHandoff()?.preferredOptionId
      }
      const logistics = await loadCartLogistics(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      )
      const env = await quoteShippingEnvelope({
        postalCode: selectedAddress.postalCode,
        state: selectedAddress.state,
        city: selectedAddress.city,
        subtotal,
        itemCount,
        originPostalCode,
        items: logistics,
      })
      setShippingDisclaimer(env.disclaimer ?? null)
      if (env.status !== 'ok') {
        quoteKeyRef.current = key
        setShippingOptions([])
        setShippingOptionId('')
        setError(env.message ?? 'Erro ao cotar frete')
        return
      }
      const opts = env.options
      quoteKeyRef.current = key
      setShippingOptions(opts)
      const preferred = preferredShipOptRef.current
      setShippingOptionId((prev) => {
        if (prev && opts.some((o) => o.id === prev)) return prev
        if (preferred && opts.some((o) => o.id === preferred)) return preferred
        return opts[0]?.id ?? ''
      })
    } catch (e) {
      setShippingOptions([])
      setShippingOptionId('')
      setShippingDisclaimer(null)
      setError(e instanceof Error ? e.message : 'Erro ao cotar frete')
    } finally {
      setQuoting(false)
    }
  }

  // Recota quando endereço/carrinho mudam no step de entrega
  useEffect(() => {
    if (step !== 2 || !selectedAddress) return
    const t = window.setTimeout(() => void loadQuotes(), 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, addressId, itemCount, subtotal, originPostalCode])

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
      await loadQuotes(true)
      return
    }
    if (step === 2) {
      if (!shippingOptionId) {
        setError('Selecione uma opção de entrega')
        return
      }
      if (!carrierDesc.placeOrderReady) {
        setError(
          `Provedor ${carrierDesc.label} ainda não fecha pedido (place_order). Use mock ou aguarde D-FRETE C + integração.`,
        )
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
    if (!carrierDesc.placeOrderReady) {
      setError(
        `Provedor ${carrierDesc.label} ainda não fecha pedido. Mantendo produção em mock até D-FRETE C.`,
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const placed = await placeOrder({
        idempotencyKey,
        addressId,
        shippingOptionId,
        // F9-F / FIND-015: com MP ativo, gravar meio real (não *_simulated)
        paymentMethod: mpEnabled
          ? mpChannel === 'card'
            ? 'credit_card'
            : 'pix'
          : paymentMethod,
        documentKind: docKind,
        documentValue: onlyDigits(docValue),
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      })

      const paymentId = placed.paymentId
      if (!paymentId) {
        push('Pedido já registrado', 'success')
        clear()
        clearShippingQuoteHandoff()
        navigate(`/conta/pedidos/${placed.orderId}`)
        return
      }

      if (mpEnabled) {
        if (mpChannel === 'card') {
          if (!mpPublicKey) {
            throw new Error('VITE_MP_PUBLIC_KEY não configurada')
          }
          clear()
          clearShippingQuoteHandoff()
          setMpAwaiting({
            channel: 'card',
            orderId: placed.orderId,
            amount: placed.total,
          })
          push('Pedido criado — informe o cartão', 'success')
          return
        }
        const mp = await createMercadoPagoPayment(placed.orderId)
        clear()
        clearShippingQuoteHandoff()
        setMpAwaiting({
          channel: 'pix',
          orderId: placed.orderId,
          paymentId: mp.paymentId,
          amount: placed.total,
        })
        push('Cobrança Pix criada — aguardando pagamento', 'success')
        return
      }

      const pay = await confirmSimulatedPayment(paymentId, outcome)
      clear()
      clearShippingQuoteHandoff()
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
        <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Finalizar compra</h1>
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
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Finalizar compra</h1>
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
                    onChange={() => {
                      setDocKind('cpf')
                      setDocValue((v) => formatDocumentMask('cpf', v))
                    }}
                  />
                  Pessoa física (CPF)
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="docKind"
                    checked={docKind === 'cnpj'}
                    onChange={() => {
                      setDocKind('cnpj')
                      setDocValue((v) => formatDocumentMask('cnpj', v))
                    }}
                  />
                  Pessoa jurídica (CNPJ)
                </label>
              </div>
              <Input
                label={docKind === 'cpf' ? 'CPF' : 'CNPJ'}
                name="document"
                inputMode="numeric"
                value={docValue}
                onChange={(e) => setDocValue(formatDocumentMask(docKind, e.target.value))}
                placeholder={docKind === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Endereço de entrega</h2>
              {loadingAddrs ? <Loading label="Carregando endereços…" /> : null}
              {!loadingAddrs && addresses.length > 0 ? (
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
                          {a.city}/{a.state} · CEP {formatCepMask(a.postalCode)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!loadingAddrs && addresses.length === 0 && !showNewAddress ? (
                <p className="text-sm text-fal-muted">
                  Nenhum endereço salvo. Cadastre um abaixo para continuar.
                </p>
              ) : null}

              {showNewAddress ? (
                <div className="rounded-fal border border-fal-line bg-fal-bg/40 p-4">
                  <h3 className="mt-0 text-base font-extrabold">Novo endereço</h3>
                  <p className="mt-0 mb-3 text-sm text-fal-muted">
                    Digite o CEP para preencher o endereço automaticamente.
                  </p>
                  <AddressForm
                    key="checkout-new-address"
                    initial={{
                      recipient: user?.fullName?.trim() || user?.email || '',
                      isDefault: addresses.length === 0,
                    }}
                    submitLabel="Salvar e continuar"
                    showCancel
                    onCancel={() => setShowNewAddress(false)}
                    onSubmit={async (values) => {
                      const saved = await upsertAddress({
                        ...values,
                        label: values.label || null,
                        complement: values.complement || null,
                        reference: values.reference || null,
                        district: values.district || null,
                        isDefault: values.isDefault || addresses.length === 0,
                      })
                      setShowNewAddress(false)
                      await reloadAddresses(saved.id)
                      push('Endereço salvo', 'success')
                    }}
                  />
                </div>
              ) : (
                <Button type="button" variant="light" onClick={() => setShowNewAddress(true)}>
                  + Adicionar novo endereço
                </Button>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Entrega</h2>
              <p className="m-0 text-sm text-fal-muted">
                {shippingDisclaimer ??
                  'Cotação do ambiente atual. Valores comerciais definitivos dependem da política D-FRETE.'}
              </p>
              {!carrierDesc.placeOrderReady ? (
                <p className="m-0 text-sm font-semibold text-fal-danger" role="status">
                  Provedor ativo ({carrierDesc.label}) não fecha pedido ainda — use{' '}
                  <code className="text-xs">VITE_SHIPPING_PROVIDER=mock</code> até D-FRETE C +
                  integração.
                </p>
              ) : null}
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
                onClick={() => void loadQuotes(true)}
              >
                Recalcular frete
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {mpEnabled ? (
                <>
                  <h2 className="mt-0 text-lg font-extrabold">Pagamento — Mercado Pago</h2>
                  <p className="text-sm text-fal-muted">
                    Pix ou cartão. A confirmação do pagamento é feita automaticamente pelo Mercado
                    Pago — esta tela pode levar alguns instantes para atualizar.
                  </p>
                  <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3">
                    <input
                      type="radio"
                      name="mpChannel"
                      checked={mpChannel === 'pix'}
                      onChange={() => setMpChannel('pix')}
                    />
                    <span className="text-sm font-semibold">Pix</span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3">
                    <input
                      type="radio"
                      name="mpChannel"
                      checked={mpChannel === 'card'}
                      onChange={() => setMpChannel('card')}
                    />
                    <span className="text-sm font-semibold">Cartão (crédito/débito)</span>
                  </label>
                </>
              ) : (
                <>
                  <h2 className="mt-0 text-lg font-extrabold">Pagamento (simulado)</h2>
                  <p className="text-sm text-fal-muted">
                    Pagamento em modo demonstração (sem cobrança real). Para Pix e cartão reais,
                    configure o provedor Mercado Pago no ambiente da loja.
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
                </>
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              {mpAwaiting ? (
                mpAwaiting.channel === 'card' ? (
                  <MercadoPagoCardBrickPanel
                    orderId={mpAwaiting.orderId}
                    amount={mpAwaiting.amount}
                    publicKey={mpPublicKey}
                    onApproved={onMpApproved}
                    onError={onMpError}
                  />
                ) : mpAwaiting.paymentId ? (
                  <MercadoPagoPixPanel
                    paymentId={mpAwaiting.paymentId}
                    orderId={mpAwaiting.orderId}
                    onApproved={onMpApproved}
                  />
                ) : (
                  <Loading label="Preparando Pix…" />
                )
              ) : (
                <>
                  <h2 className="mt-0 text-lg font-extrabold">Revisão</h2>
                  <div className="text-sm">
                    <p>
                      <strong>Documento:</strong> {docKind.toUpperCase()}{' '}
                      {formatDocumentMask(docKind, docValue)}
                    </p>
                    <p>
                      <strong>Endereço:</strong>{' '}
                      {selectedAddress
                        ? `${selectedAddress.street}, ${selectedAddress.number} — ${selectedAddress.city}/${selectedAddress.state}`
                        : '—'}
                    </p>
                    <p>
                      <strong>Entrega:</strong> {selectedShipping?.label ?? '—'} (
                      {money(shippingAmount)})
                    </p>
                    <p>
                      <strong>Pagamento:</strong>{' '}
                      {mpEnabled
                        ? mpChannel === 'card'
                          ? 'Cartão (Mercado Pago)'
                          : 'Pix (Mercado Pago)'
                        : paymentMethod === 'pix_simulated'
                          ? 'Pix simulado'
                          : 'Cartão simulado'}
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
                  {mpEnabled ? (
                    <Button
                      variant="primary"
                      disabled={submitting}
                      onClick={() => void finalize('approve')}
                    >
                      {submitting
                        ? 'Processando…'
                        : mpChannel === 'card'
                          ? 'Continuar para cartão'
                          : 'Gerar cobrança Pix'}
                    </Button>
                  ) : (
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
                  )}
                </>
              )}
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
