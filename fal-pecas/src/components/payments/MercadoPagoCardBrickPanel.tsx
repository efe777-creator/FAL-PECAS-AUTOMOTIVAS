import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import {
  assertCardInstallmentsAllowed,
  filterInstallmentOptions,
  type InstallmentOption,
} from '@/lib/paymentDisplay'
import { paymentStatusLabel } from '@/lib/paymentLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { createFalPayment } from '@/services/payments/engine'
import { syncCheckoutPayment } from '@/services/payments/paymentSyncService'
import { getOwnPayment } from '@/services/payments/ownPaymentService'
import {
  alignPaymentMethodIdForPreferred,
  pickPaymentMethodForPreferred,
  resolveCardChargeMethod,
} from '@/services/payments/resolveCardChargeMethod'
import { MpCardSecureFields } from '@/components/payments/MpCardSecureFields'
import {
  createCardToken,
  getInstallments,
  getIssuers,
  getPaymentMethods,
  initMercadoPago,
} from '@mercadopago/sdk-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

interface Props {
  orderId: string
  amount: number
  publicKey: string
  onApproved: (orderId: string) => void
  onError: (message: string) => void
  /**
   * Canal explícito do checkout/retomada (crédito ou débito).
   * Manda na cobrança; o BIN do MP só informa (catálogo BR costuma errar débito).
   */
  preferredPaymentType?: 'credit_card' | 'debit_card'
  /** DEV: só tokeniza, não chama Edge (pedido fake). */
  tokenizeOnly?: boolean
  onTokenized?: (info: { token: string; paymentMethodId: string; installments: number }) => void
}

type BinMethod = {
  id: string
  paymentTypeId: string
  issuerId?: string
}

type FieldName = 'cardNumber' | 'expirationDate' | 'securityCode'

let mpInitedKey: string | null = null

function ensureMpInit(publicKey: string) {
  if (mpInitedKey === publicKey) return
  initMercadoPago(publicKey, { locale: 'pt-BR' })
  mpInitedKey = publicKey
}

/**
 * Cartão via Core Methods (Secure Fields), não Card Payment Brick.
 * Brick ficou preso em loading dos PCI fields; mp.fields monta de forma estável.
 */
export function MercadoPagoCardBrickPanel({
  orderId,
  amount,
  publicKey,
  onApproved,
  onError,
  tokenizeOnly = false,
  onTokenized,
  preferredPaymentType = 'credit_card',
}: Props) {
  const paymentDisplay = usePaymentDisplay()
  const [sdkReady, setSdkReady] = useState(false)
  const [readyFields, setReadyFields] = useState<Partial<Record<FieldName, true>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [cardholderName, setCardholderName] = useState('')
  const [docType, setDocType] = useState<'CPF' | 'CNPJ'>('CPF')
  const [docNumber, setDocNumber] = useState('')
  const [binMethod, setBinMethod] = useState<BinMethod | null>(null)
  const [binHint, setBinHint] = useState<string | null>(null)
  const [installments, setInstallments] = useState(1)
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([])
  const [mountKey, setMountKey] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const installmentsRef = useRef(1)
  const binReqRef = useRef(0)
  const onApprovedRef = useRef(onApproved)
  const onErrorRef = useRef(onError)
  const onTokenizedRef = useRef(onTokenized)

  useEffect(() => {
    onApprovedRef.current = onApproved
  }, [onApproved])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    onTokenizedRef.current = onTokenized
  }, [onTokenized])

  useEffect(() => {
    installmentsRef.current = installments
  }, [installments])

  const amountNum = Math.round(Number(amount) * 100) / 100

  const displayInstallmentOptions = useMemo(() => {
    if (!installmentOptions.length) {
      return filterInstallmentOptions(amountNum, paymentDisplay, [])
    }
    return filterInstallmentOptions(amountNum, paymentDisplay, installmentOptions)
  }, [installmentOptions, amountNum, paymentDisplay])

  const canChooseInstallments = displayInstallmentOptions.length > 1

  useEffect(() => {
    const allowed = displayInstallmentOptions.some((o) => o.installments === installments)
    if (!allowed) setInstallments(displayInstallmentOptions[0]?.installments ?? 1)
  }, [displayInstallmentOptions, installments])

  useEffect(() => {
    try {
      ensureMpInit(publicKey)
      setSdkReady(true)
    } catch (e) {
      onErrorRef.current(toUserMessage(e, 'Falha ao iniciar o pagamento'))
    }
  }, [publicKey])

  const markFieldReady = useCallback((name: FieldName) => {
    setReadyFields((prev) => (prev[name] ? prev : { ...prev, [name]: true }))
  }, [])

  const fieldsOk = Boolean(
    readyFields.cardNumber && readyFields.expirationDate && readyFields.securityCode,
  )

  const resetInstallmentChoice = useCallback(() => {
    setBinMethod(null)
    setInstallmentOptions([])
    setInstallments(1)
  }, [])

  const handleBinChange = useCallback(
    async (bin: string | null) => {
      const req = ++binReqRef.current
      if (!bin || bin.length < 6) {
        resetInstallmentChoice()
        return
      }
      const sliced = bin.slice(0, 8)
      try {
        const pm = await getPaymentMethods({ bin: sliced })
        if (req !== binReqRef.current) return
        const first = pickPaymentMethodForPreferred(pm?.results, preferredPaymentType)
        if (!first?.id) {
          resetInstallmentChoice()
          setBinHint(null)
          return
        }
        let issuerId =
          first.issuer?.id != null ? String(first.issuer.id) : undefined
        if (!issuerId) {
          try {
            const issuers = await getIssuers({
              paymentMethodId: String(first.id),
              bin: sliced,
            })
            if (issuers?.[0]?.id != null) issuerId = String(issuers[0].id)
          } catch {
            /* issuer opcional */
          }
        }
        if (req !== binReqRef.current) return
        const method: BinMethod = {
          id: String(first.id),
          paymentTypeId: String(first.payment_type_id ?? 'credit_card'),
          issuerId,
        }
        setBinMethod(method)
        const resolved = resolveCardChargeMethod({
          preferred: preferredPaymentType,
          binPaymentTypeId: method.paymentTypeId,
        })
        setBinHint(
          resolved.binMismatch
            ? preferredPaymentType === 'debit_card'
              ? 'O catálogo do Mercado Pago marcou este BIN como crédito; seguiremos como débito (à vista), conforme sua escolha.'
              : 'O catálogo do Mercado Pago marcou este BIN como débito; seguiremos como crédito, conforme sua escolha.'
            : null,
        )

        const inst = await getInstallments({
          amount: String(amountNum),
          bin: sliced,
          paymentMethodId: method.id,
        })
        if (req !== binReqRef.current) return
        const costs = inst?.[0]?.payer_costs ?? []
        // Guarda bruto do MP (sem cap FAL). O filtro comercial roda no useMemo —
        // assim, se a config ainda estava carregando no BIN, as Nx liberam depois.
        const raw: InstallmentOption[] = costs
          .map((c) => {
            const n = Number(c.installments)
            const installmentAmount = Number(
              (c as { installment_amount?: number }).installment_amount ??
                amountNum / Math.max(n, 1),
            )
            const totalAmount = Number(
              (c as { total_amount?: number }).total_amount ?? installmentAmount * n,
            )
            return {
              installments: n,
              installmentAmount,
              totalAmount,
              interestFree: false,
              label: '',
            }
          })
          .filter(
            (o) =>
              Number.isFinite(o.installments) &&
              o.installments >= 1 &&
              o.installments <= 24,
          )
        setInstallmentOptions(raw)
        const filtered = filterInstallmentOptions(amountNum, paymentDisplay, raw)
        const current = installmentsRef.current
        const next = filtered.find((o) => o.installments === current) ?? filtered[0]
        setInstallments(next?.installments ?? 1)
      } catch {
        if (req !== binReqRef.current) return
        resetInstallmentChoice()
      }
    },
    [amountNum, paymentDisplay, preferredPaymentType, resetInstallmentChoice],
  )

  const syncTickRef = useRef(0)

  useEffect(() => {
    if (!paymentId) return
    syncTickRef.current = 0
    async function tick() {
      try {
        let p = await getOwnPayment(paymentId!)
        if (!p) return
        syncTickRef.current += 1
        if (p.status === 'pending' && syncTickRef.current % 2 === 0) {
          try {
            const sync = await syncCheckoutPayment(paymentId!)
            if (sync.status) p = { ...p, status: sync.status }
            else p = (await getOwnPayment(paymentId!)) ?? p
          } catch {
            /* sync best-effort */
          }
        }
        if (!p) return
        setStatus(p.status)
        if (p.status === 'approved') {
          if (pollRef.current) clearInterval(pollRef.current)
          onApprovedRef.current(p.orderId || orderId)
        }
        if (p.status === 'rejected' || p.status === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          const msg =
            p.status === 'rejected'
              ? 'Pagamento recusado. Verifique os dados do cartão ou use outro meio.'
              : 'Pagamento cancelado. Você pode tentar novamente.'
          setRejectReason(msg)
          onErrorRef.current(msg)
          setPaymentId(null)
        }
        if (
          (p.status === 'pending' || p.status === 'in_process') &&
          syncTickRef.current >= 45
        ) {
          if (pollRef.current) clearInterval(pollRef.current)
          const msg =
            'Ainda estamos aguardando a confirmação do banco. Você pode tentar novamente ou acompanhar em Meus pedidos.'
          setRejectReason(msg)
          onErrorRef.current(msg)
          setPaymentId(null)
        }
      } catch {
        /* poll best-effort */
      }
    }
    void tick()
    pollRef.current = setInterval(() => void tick(), 4000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [paymentId, orderId])

  const remountFields = useCallback(() => {
    setReadyFields({})
    setRejectReason(null)
    setBinHint(null)
    binReqRef.current += 1
    resetInstallmentChoice()
    setStatus('idle')
    setMountKey((k) => k + 1)
  }, [resetInstallmentChoice])

  // Troca crédito↔débito: só atualiza aviso BIN; NÃO remonta Secure Fields.
  useEffect(() => {
    if (!binMethod) {
      setBinHint(null)
      return
    }
    const resolved = resolveCardChargeMethod({
      preferred: preferredPaymentType,
      binPaymentTypeId: binMethod.paymentTypeId,
    })
    setBinHint(
      resolved.binMismatch
        ? preferredPaymentType === 'debit_card'
          ? 'O catálogo do Mercado Pago marcou este BIN como crédito; seguiremos como débito (à vista), conforme sua escolha.'
          : 'O catálogo do Mercado Pago marcou este BIN como débito; seguiremos como crédito, conforme sua escolha.'
        : null,
    )
  }, [preferredPaymentType, binMethod])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (submitting) return
      setSubmitting(true)
      setRejectReason(null)
      try {
        if (!binMethod?.id) {
          throw new Error('Informe o número do cartão completo para identificar a bandeira.')
        }
        const name = cardholderName.trim()
        if (name.length < 3) throw new Error('Informe o nome do titular como no cartão.')
        const doc = docNumber.replace(/\D/g, '')
        if (docType === 'CPF' && doc.length !== 11) throw new Error('CPF inválido.')
        if (docType === 'CNPJ' && doc.length !== 14) throw new Error('CNPJ inválido.')

        const tokenRes = await createCardToken({
          cardholderName: name,
          identificationType: docType,
          identificationNumber: doc,
        })
        const token = tokenRes?.id
        if (!token) throw new Error('Não foi possível tokenizar o cartão. Tente novamente.')

        // Canal do cliente manda; BIN do MP não bloqueia (catálogo BR costuma errar débito).
        const { method, binMismatch } = resolveCardChargeMethod({
          preferred: preferredPaymentType,
          binPaymentTypeId: binMethod.paymentTypeId,
        })
        // Docs MP: débito usa payment_method_id debvisa/debmaster — não visa/master.
        const aligned = alignPaymentMethodIdForPreferred(method, binMethod.id)
        const chargePaymentMethodId = aligned.paymentMethodId
        if (binMismatch || aligned.remapped) {
          setBinHint(
            method === 'debit_card'
              ? aligned.remapped
                ? 'Cartão identificado; cobrando como débito à vista (bandeira debitável do Mercado Pago).'
                : 'O catálogo do Mercado Pago marcou este BIN como crédito; seguiremos como débito (à vista), conforme sua escolha.'
              : 'O catálogo do Mercado Pago marcou este BIN como débito; seguiremos como crédito, conforme sua escolha.',
          )
        }
        const chargeInstallments = method === 'debit_card' ? 1 : installments
        if (method === 'credit_card') {
          const selected =
            displayInstallmentOptions.find((o) => o.installments === installments) ?? null
          assertCardInstallmentsAllowed(installments, amountNum, paymentDisplay, selected)
        }

        if (tokenizeOnly) {
          onTokenizedRef.current?.({
            token,
            paymentMethodId: chargePaymentMethodId,
            installments: chargeInstallments,
          })
          setStatus('tokenized')
          return
        }

        const res = await createFalPayment({
          orderId,
          method,
          card: {
            token,
            paymentMethodId: chargePaymentMethodId,
            installments: chargeInstallments,
            issuerId: binMethod.issuerId,
            paymentTypeId: method,
          },
        })
        setStatus(res.status)
        if (res.status === 'approved' || res.orderApproved) {
          onApprovedRef.current(res.orderId || orderId)
          return
        }
        if (res.status === 'rejected' || res.status === 'cancelled') {
          const msg =
            res.status === 'rejected'
              ? 'Pagamento recusado. Verifique os dados do cartão ou use outro meio.'
              : 'Pagamento cancelado. Você pode tentar novamente.'
          setRejectReason(msg)
          onErrorRef.current(msg)
          // Não remonta Secure Fields automaticamente — remount destrói digitação no mobile.
          return
        }
        setPaymentId(res.paymentId)
      } catch (err) {
        const msg = toUserMessage(err, 'Falha ao criar pagamento com cartão')
        setRejectReason(msg)
        onErrorRef.current(msg)
      } finally {
        setSubmitting(false)
      }
    },
    [
      submitting,
      binMethod,
      cardholderName,
      docType,
      docNumber,
      orderId,
      installments,
      displayInstallmentOptions,
      amountNum,
      paymentDisplay,
      remountFields,
      tokenizeOnly,
      preferredPaymentType,
    ],
  )

  const debitMode = preferredPaymentType === 'debit_card'
  const showInstallments = !debitMode

  if (!sdkReady) return <Loading label="Carregando formulário de cartão…" />

  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return (
      <p className="text-sm text-fal-danger">
        Valor inválido para cobrança. Recrie o pedido.
      </p>
    )
  }

  if (paymentId) {
    return (
      <div className="space-y-3">
        <h2 className="mt-0 text-lg font-extrabold">Cartão — aguardando confirmação</h2>
        <p className="text-sm text-fal-muted">
          Pagamento enviado. Estamos confirmando com o banco — isso pode levar alguns segundos.
        </p>
        <p className="text-xs text-fal-muted">Status: {paymentStatusLabel(status)}</p>
        <Loading label="Aguardando confirmação…" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="mt-0 text-lg font-extrabold">
        {debitMode ? 'Pagamento com cartão de débito' : 'Pagamento com cartão de crédito'}
      </h2>
      <p className="text-sm text-fal-muted">
        Os dados do cartão são protegidos pelo Mercado Pago. O valor cobrado é o total do pedido.
        {debitMode ? ' Débito é cobrado à vista.' : ''}
      </p>
      {rejectReason ? (
        <div className="rounded-[10px] border border-fal-danger/30 bg-red-50 p-3 text-sm text-fal-danger">
          <p className="m-0 font-semibold">{rejectReason}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={remountFields}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {binHint ? (
        <p className="m-0 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          {binHint}
        </p>
      ) : null}
      {submitting ? <Loading label="Processando cartão…" /> : null}
      {!fieldsOk ? (
        <p className="text-xs text-fal-muted">Montando campos seguros do Mercado Pago…</p>
      ) : null}

      <form className="space-y-3" onSubmit={(ev) => void handleSubmit(ev)}>
        <MpCardSecureFields
          mountKey={mountKey}
          publicKey={publicKey}
          onFieldReady={markFieldReady}
          onBinChange={handleBinChange}
        />

        <div>
          <label className="mb-1 block text-sm font-semibold text-fal-ink" htmlFor="mp-card-name">
            Nome do titular
          </label>
          <input
            id="mp-card-name"
            className="h-12 w-full rounded-[10px] border border-fal-line bg-fal-surface px-3 text-base"
            value={cardholderName}
            onChange={(ev) => setCardholderName(ev.target.value)}
            autoComplete="cc-name"
            required
          />
        </div>

        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-fal-ink" htmlFor="mp-doc-type">
              Doc.
            </label>
            <select
              id="mp-doc-type"
              className="h-12 w-full rounded-[10px] border border-fal-line bg-fal-surface px-2 text-sm"
              value={docType}
              onChange={(ev) => setDocType(ev.target.value as 'CPF' | 'CNPJ')}
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fal-ink" htmlFor="mp-doc-num">
              Documento
            </label>
            <input
              id="mp-doc-num"
              className="h-12 w-full rounded-[10px] border border-fal-line bg-fal-surface px-3 text-base"
              value={docNumber}
              onChange={(ev) => setDocNumber(ev.target.value)}
              inputMode="numeric"
              required
            />
          </div>
        </div>

        {showInstallments ? (
          <div>
            <label className="mb-1 block text-sm font-semibold text-fal-ink" htmlFor="mp-installments">
              {canChooseInstallments ? 'Parcelas no cartão' : 'Pagamento no cartão'}
            </label>
            <select
              id="mp-installments"
              className="h-12 w-full rounded-[10px] border border-fal-line bg-fal-surface px-3 text-sm"
              value={installments}
              onChange={(ev) => setInstallments(Number(ev.target.value))}
              disabled={!binMethod}
              aria-describedby="mp-installments-hint"
            >
              {displayInstallmentOptions.map((o) => (
                <option key={o.installments} value={o.installments}>
                  {o.label}
                </option>
              ))}
            </select>
            <p id="mp-installments-hint" className="mb-0 mt-1 text-xs text-fal-muted">
              {!binMethod
                ? 'Informe o número do cartão para liberar à vista e as parcelas disponíveis.'
                : canChooseInstallments
                  ? 'Escolha à vista ou o número de parcelas liberadas para este valor e cartão.'
                  : 'Neste valor só está disponível à vista no cartão.'}
            </p>
          </div>
        ) : (
          <p className="m-0 text-sm text-fal-muted">Débito: cobrança à vista (1x).</p>
        )}

        {binMethod ? (
          <p className="m-0 text-xs text-fal-muted">
            Bandeira: {binMethod.id}
            {binMethod.issuerId ? ` · emissor ${binMethod.issuerId}` : ''}
          </p>
        ) : null}

        <Button type="submit" disabled={submitting || !fieldsOk} className="w-full">
          {submitting ? 'Processando…' : tokenizeOnly ? 'Gerar token (DEV)' : 'Pagar'}
        </Button>
      </form>

      <p className="m-0 text-xs text-fal-muted">
        Parcelas = condições do Mercado Pago filtradas pela política da loja. O valor cobrado
        respeita a opção escolhida.
      </p>
      {!fieldsOk ? (
        <button
          type="button"
          className="text-sm font-semibold text-fal-ink underline"
          onClick={remountFields}
        >
          Formulário não carregou? Recarregar
        </button>
      ) : null}
    </div>
  )
}
