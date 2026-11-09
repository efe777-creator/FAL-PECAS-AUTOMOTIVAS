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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { showCheckoutEmptyCart } from './checkoutEmptyGuard'

const STEPS = ['Identificação', 'Endereço', 'Entrega', 'Pagamento', 'Revisão'] as const

function money(v: number) {
  return formatMoney(v)
}

export function CheckoutPage() {
  useDocumentTitle('Checkout | FAL Peças Automotivas')
  const { user } = useAuth()
  const { items, subtotal, clear } = useCart()
  const { push } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [maxReachedStep, setMaxReachedStep] = useState(0)
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
  const errorRef = useRef<HTMLParagraphElement>(null)
  const carrierDesc = useMemo(() => getActiveCarrierDescriptor(), [])
  const mpEnabled = isMercadoPagoCheckoutEnabled()
  const mpPublicKey = (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined)?.trim() ?? ''
  const [mpChannel, setMpChannel] = useState<'pix' | 'card'>('pix')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [mpAwaiting, setMpAwaiting] = useState<{
    channel: 'pix' | 'card'
    orderId: string
    paymentId?: string
    amount: number
    pixQrCode?: string | null
    pixQrCodeBase64?: string | null
    expiresAt?: string | null
  } | null>(null)

  function pushError(message: string) {
    setError(message)
    push(message, 'error')
  }

  function goToStepIndex(next: number) {
    setStep(next)
    setMaxReachedStep((m) => Math.max(m, next))
  }

  function stepPrereqError(target: number): string | null {
    // validateDoc já seta a mensagem específica
    if (target >= 1 && !validateDoc()) return '__doc__'
    if (target >= 2 && !addressId) return 'Selecione um endereço de entrega'
    if (target >= 3) {
      if (!shippingOptionId) return 'Selecione uma opção de entrega'
      if (!carrierDesc.placeOrderReady) {
        return 'Entrega indisponível no momento. Tente novamente mais tarde.'
      }
    }
    if (target >= 4 && mpEnabled && mpChannel === 'card' && !mpPublicKey) {
      return 'Pagamento com cartão indisponível no momento. Tente Pix ou volte mais tarde.'
    }
    return null
  }

  async function goToStep(target: number) {
    if (target === step || mpAwaiting) return
    setError(null)
    // Voltar: sempre permitido até maxReached
    if (target < step) {
      goToStepIndex(target)
      return
    }
    // Avançar: só até maxReached+1 e com pré-requisitos
    if (target > maxReachedStep + 1) {
      pushError('Conclua as etapas anteriores antes de avançar')
      return
    }
    const err = stepPrereqError(target)
    if (err) {
      if (err !== '__doc__') pushError(err)
      return
    }
    if (target === 2) await loadQuotes(true)
    goToStepIndex(target)
  }

  const onMpApproved = useCallback(
    (oid: string) => {
      push('Pagamento confirmado — pedido em análise', 'success')
      navigate(`/pedido/${oid}/confirmacao`)
    },
    [navigate, push],
  )

  const onMpError = useCallback((msg: string) => {
    setError(msg)
    push(msg, 'error')
  }, [push])

  /** Erro do checkout: scroll + foco no alerta (acessível). */
  useEffect(() => {
    if (!error) return
    const el = errorRef.current
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el.focus()
  }, [error])

  const profileDocReady = Boolean(
    (user?.cpf && isValidCpf(user.cpf)) || (user?.cnpj && isValidCnpj(user.cnpj)),
  )

  /** Documento válido no perfil → preenche e pula Identificação (modo leitura se voltar). */
  const skippedIdentRef = useRef(false)
  useEffect(() => {
    if (user?.cpf && isValidCpf(user.cpf)) {
      setDocKind('cpf')
      setDocValue(formatDocumentMask('cpf', user.cpf))
      if (!skippedIdentRef.current) {
        skippedIdentRef.current = true
        goToStepIndex(1)
      }
    } else if (user?.cnpj && isValidCnpj(user.cnpj)) {
      setDocKind('cnpj')
      setDocValue(formatDocumentMask('cnpj', user.cnpj))
      if (!skippedIdentRef.current) {
        skippedIdentRef.current = true
        goToStepIndex(1)
      }
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
      if (preferred) {
        setAddressId(preferred.id)
        setShowNewAddress(false)
      } else {
        setAddressId('')
        setShowNewAddress(true)
      }
      setError(null)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar endereços'))
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
      selectedAddress.number ?? '',
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
        street: selectedAddress.street,
        number: selectedAddress.number,
        district: selectedAddress.district ?? undefined,
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
        pushError(env.message ?? 'Erro ao cotar frete')
        return
      }
      const opts = env.options
      const selectable = opts.filter((o) => o.metadata?.selectable !== false)
      quoteKeyRef.current = key
      setShippingOptions(opts)
      const preferred = preferredShipOptRef.current
      setShippingOptionId((prev) => {
        if (prev && selectable.some((o) => o.id === prev)) return prev
        if (preferred && selectable.some((o) => o.id === preferred)) return preferred
        return selectable[0]?.id ?? ''
      })
    } catch (e) {
      setShippingOptions([])
      setShippingOptionId('')
      setShippingDisclaimer(null)
      pushError(toUserMessage(e, 'Erro ao cotar frete'))
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
        pushError('Informe um CPF válido para finalizar a compra')
        return false
      }
    } else if (!isValidCnpj(digits)) {
      pushError('Informe um CNPJ válido para finalizar a compra')
      return false
    }
    return true
  }

  async function goNext() {
    await goToStep(Math.min(step + 1, STEPS.length - 1))
  }

  async function finalize(outcome: 'approve' | 'fail') {
    if (!validateDoc() || !addressId || !shippingOptionId) return
    if (!termsAccepted) {
      pushError('Aceite os termos e a política de privacidade para finalizar.')
      return
    }
    if (!carrierDesc.placeOrderReady) {
      pushError('Entrega indisponível no momento. Tente novamente mais tarde.')
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
        navigate(`/pedido/${placed.orderId}/confirmacao`)
        return
      }

      if (mpEnabled) {
        if (mpChannel === 'card') {
          if (!mpPublicKey) {
            throw new Error('Pagamento com cartão indisponível no momento.')
          }
          // FIND-SMOKE-UI-001: setar awaiting ANTES de clear — senão empty-cart early-return esconde o Brick
          setMpAwaiting({
            channel: 'card',
            orderId: placed.orderId,
            amount: placed.total,
          })
          goToStepIndex(4)
          clear()
          clearShippingQuoteHandoff()
          push('Pedido criado — informe o cartão', 'success')
          return
        }
        const mp = await createMercadoPagoPayment(placed.orderId)
        if (!mp.pixQrCode && !mp.pixQrCodeBase64) {
          throw new Error(
            'Não foi possível gerar o Pix. Tente novamente ou escolha cartão.',
          )
        }
        // FIND-SMOKE-UI-001: awaiting antes do clear — senão empty-cart early-return esconde o Pix panel
        setMpAwaiting({
          channel: 'pix',
          orderId: placed.orderId,
          paymentId: mp.paymentId,
          amount: placed.total,
          pixQrCode: mp.pixQrCode,
          pixQrCodeBase64: mp.pixQrCodeBase64,
          expiresAt: mp.expiresAt ?? null,
        })
        goToStepIndex(4)
        clear()
        clearShippingQuoteHandoff()
        push('Cobrança Pix criada — aguardando pagamento', 'success')
        return
      }

      const pay = await confirmSimulatedPayment(paymentId, outcome)
      clear()
      clearShippingQuoteHandoff()
      if (outcome === 'approve') {
        push('Pagamento aprovado — pedido confirmado', 'success')
      } else {
        push('Pagamento não aprovado — pedido cancelado', 'error')
      }
      navigate(`/pedido/${pay.orderId ?? placed.orderId}/confirmacao`)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao finalizar pedido'))
    } finally {
      setSubmitting(false)
    }
  }

  // FIND-SMOKE-UI-001: com mpAwaiting, carrinho pode estar vazio após place_order — ainda assim mostrar Pix/Brick
  if (showCheckoutEmptyCart(items.length, Boolean(mpAwaiting))) {
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
      <div className="mt-4 flex flex-wrap gap-2" role="navigation" aria-label="Etapas do checkout">
        {STEPS.map((label, i) => {
          const reachable = !mpAwaiting && (i <= maxReachedStep || i === step || i === step + 1)
          const active = i === step
          const done = i < step
          return (
            <button
              key={label}
              type="button"
              disabled={!reachable}
              onClick={() => void goToStep(i)}
              aria-current={active ? 'step' : undefined}
              className={[
                'rounded-full px-3 py-2 text-xs font-extrabold transition',
                active
                  ? 'bg-fal-yellow text-fal-navy-dark'
                  : done
                    ? 'bg-fal-navy text-white hover:bg-fal-navy-dark'
                    : reachable
                      ? 'bg-[#e9edef] text-fal-navy hover:bg-fal-line'
                      : 'cursor-not-allowed bg-[#e9edef] text-fal-muted opacity-60',
              ].join(' ')}
            >
              {i + 1}. {label}
            </button>
          )
        })}
      </div>

      {error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-fal border border-fal-danger/30 bg-red-50 px-3 py-2 text-sm text-fal-danger outline-none"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-fal border border-fal-line bg-white p-5">
          {step === 0 ? (
            <div className="space-y-4">
              <h2 className="mt-0 text-lg font-extrabold">Identificação</h2>
              <p className="text-sm text-fal-muted">
                Logado como {user?.fullName || user?.email}.
              </p>
              {profileDocReady ? (
                <div className="rounded-fal border border-fal-line bg-fal-bg/50 p-4 text-sm">
                  <p className="m-0 font-semibold text-fal-navy">Documento do perfil</p>
                  <p className="mb-0 mt-2 text-base font-extrabold tracking-wide text-fal-ink">
                    {docKind.toUpperCase()}: {formatDocumentMask(docKind, docValue)}
                  </p>
                  <p className="mb-0 mt-3 text-xs text-fal-muted">
                    Modo leitura — usamos o documento já validado na sua conta. Para alterar,{' '}
                    <Link
                      to="/conta/perfil"
                      state={{ from: '/checkout' }}
                      className="font-bold text-fal-auth-link underline-offset-2 hover:underline"
                    >
                      edite no perfil
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
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
                          onChange={() => {
                            setAddressId(a.id)
                            setShippingOptions([])
                            setShippingOptionId('')
                            setMaxReachedStep((m) => Math.min(m, 1))
                            if (step > 1) setStep(1)
                          }}
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
                      setAddressId(saved.id)
                      setShippingOptions([])
                      setShippingOptionId('')
                      push('Endereço salvo', 'success')
                      // Avança para Entrega; cotação sobe no effect do step 2
                      goToStepIndex(2)
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
                {shippingDisclaimer && !/D-FRETE|VITE_|mock/i.test(shippingDisclaimer)
                  ? shippingDisclaimer
                  : 'Escolha a forma de entrega. O valor e o prazo são confirmados ao finalizar.'}
              </p>
              {!carrierDesc.placeOrderReady ? (
                <p className="m-0 text-sm font-semibold text-fal-danger" role="status">
                  Entrega indisponível no momento. Tente novamente mais tarde.
                </p>
              ) : null}
              {quoting ? (
                <Loading label="Cotando frete…" />
              ) : shippingOptions.length === 0 ? (
                <p className="text-sm text-fal-muted">Nenhuma opção disponível. Volte e confira o CEP.</p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {shippingOptions.map((o) => {
                    const locked = o.metadata?.selectable === false
                    return (
                    <li key={o.id}>
                      <label className={`flex items-center justify-between gap-3 rounded-fal border border-fal-line p-3 ${locked ? 'opacity-80' : 'cursor-pointer hover:border-fal-navy'}`}>
                        <span className="flex items-center gap-3 text-sm">
                          <input
                            type="radio"
                            disabled={locked}
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
                        <strong>{locked ? '—' : money(o.amount)}</strong>
                      </label>
                    </li>
                    )
                  })}
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
                  <h2 className="mt-0 text-lg font-extrabold">Pagamento</h2>
                  <p className="text-sm text-fal-muted">
                    Escolha Pix ou cartão. A confirmação pode levar alguns instantes para aparecer
                    nesta tela.
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
                  <h2 className="mt-0 text-lg font-extrabold">Pagamento</h2>
                  <p className="text-sm text-fal-muted">
                    Cobrança real indisponível no momento. Você pode concluir em modo demonstração
                    (sem cobrança) ou voltar mais tarde.
                  </p>
                  <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3">
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === 'pix_simulated'}
                      onChange={() => setPaymentMethod('pix_simulated')}
                    />
                    <span className="text-sm font-semibold">Pix (demonstração)</span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-fal border border-fal-line p-3">
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === 'card_simulated'}
                      onChange={() => setPaymentMethod('card_simulated')}
                    />
                    <span className="text-sm font-semibold">Cartão (demonstração)</span>
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
                    initialPixQrCode={mpAwaiting.pixQrCode}
                    initialPixQrCodeBase64={mpAwaiting.pixQrCodeBase64}
                    initialAmount={mpAwaiting.amount}
                    initialExpiresAt={mpAwaiting.expiresAt}
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
                          ? 'Pix (demonstração)'
                          : 'Cartão (demonstração)'}
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
                  <label className="mt-3 flex items-start gap-2 text-sm text-fal-ink">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span>
                      Li e aceito os{' '}
                      <Link to="/termos" className="font-semibold text-fal-navy hover:underline">
                        termos de uso
                      </Link>
                      , a{' '}
                      <Link
                        to="/privacidade"
                        className="font-semibold text-fal-navy hover:underline"
                      >
                        política de privacidade
                      </Link>{' '}
                      e a política de{' '}
                      <Link
                        to="/trocas-devolucoes"
                        className="font-semibold text-fal-navy hover:underline"
                      >
                        trocas e devoluções
                      </Link>
                      .
                    </span>
                  </label>
                  {mpEnabled ? (
                    <Button
                      variant="primary"
                      disabled={submitting || !termsAccepted}
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
                        disabled={submitting || !termsAccepted}
                        onClick={() => void finalize('approve')}
                      >
                        {submitting ? 'Processando…' : 'Simular pagamento aprovado'}
                      </Button>
                      <Button
                        variant="light"
                        disabled={submitting || !termsAccepted}
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

          <div className="mt-6 flex flex-wrap gap-2">
            {step > 0 ? (
              <Button type="button" variant="light" onClick={() => void goToStep(step - 1)}>
                Voltar
              </Button>
            ) : (
              <Link to="/carrinho">
                <Button type="button" variant="light">
                  Carrinho
                </Button>
              </Link>
            )}
            {step < 4 ? (
              <Button
                type="button"
                variant="primary"
                disabled={quoting || (step === 1 && addresses.length === 0 && !showNewAddress)}
                onClick={() => void goNext()}
              >
                Continuar
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="h-max rounded-fal border border-fal-line bg-white p-5">
          {mpAwaiting ? (
            <>
              <div className="mb-3 text-sm text-fal-muted">
                Pedido <span className="font-mono text-fal-ink">{mpAwaiting.orderId.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between border-t border-fal-line pt-3 text-xl font-black">
                <span>Total</span>
                <span>{money(mpAwaiting.amount)}</span>
              </div>
              <p className="mt-3 text-xs text-fal-muted">
                Aguardando confirmação do Mercado Pago. Se sair desta tela, retome o pagamento
                em Meus pedidos.
              </p>
              <Link
                to={`/conta/pedidos/${mpAwaiting.orderId}`}
                className="mt-3 inline-block text-sm font-bold text-fal-auth-link underline-offset-2 hover:underline"
              >
                Ver em Meus pedidos →
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-0 mb-3 text-sm font-extrabold text-fal-navy">Resumo do pedido</h2>
              <ul className="mb-3 m-0 max-h-48 list-none space-y-1.5 overflow-y-auto p-0">
                {items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-start justify-between gap-2 text-xs text-fal-ink"
                  >
                    <span className="min-w-0 leading-snug">
                      <span className="font-bold">{item.quantity}×</span> {item.name}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {money(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mb-3 flex justify-between border-t border-fal-line pt-3 text-sm">
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
            </>
          )}
        </aside>
      </div>
    </Container>
  )
}
