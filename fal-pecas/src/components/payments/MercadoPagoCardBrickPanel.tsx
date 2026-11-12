import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { resolveInstallmentCount } from '@/lib/paymentDisplay'
import { paymentStatusLabel } from '@/lib/paymentLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { createFalPayment } from '@/services/payments/engine'
import { syncMercadoPagoPayment } from '@/services/payments/mpSyncPaymentService'
import { getOwnPayment } from '@/services/payments/ownPaymentService'
import {
  CardNumber,
  ExpirationDate,
  SecurityCode,
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

const fieldStyle = {
  height: '48px',
  fontSize: '16px',
  placeholderColor: '#94a3b8',
} as const

const fieldShellClass =
  'h-12 overflow-hidden rounded-[10px] border border-fal-line bg-white px-3 [&_[id$=SecureField_container]]:h-12 [&_iframe]:!h-12'

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
  const [installments, setInstallments] = useState(1)
  const [installmentOptions, setInstallmentOptions] = useState<number[]>([1])
  const [mountKey, setMountKey] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const installmentsRef = useRef(1)
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
  const maxInstallments = useMemo(() => {
    if (!paymentDisplay?.enabled) return 12
    return Math.min(12, resolveInstallmentCount(amountNum, paymentDisplay))
  }, [paymentDisplay, amountNum])

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

  const handleBinChange = useCallback(
    async (bin: string | null) => {
      if (!bin || bin.length < 6) {
        setBinMethod(null)
        setInstallmentOptions([1])
        setInstallments(1)
        return
      }
      const sliced = bin.slice(0, 8)
      try {
        const pm = await getPaymentMethods({ bin: sliced })
        const first = pm?.results?.[0]
        if (!first?.id) {
          setBinMethod(null)
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
        const method: BinMethod = {
          id: String(first.id),
          paymentTypeId: String(first.payment_type_id ?? 'credit_card'),
          issuerId,
        }
        setBinMethod(method)

        const inst = await getInstallments({
          amount: String(amountNum),
          bin: sliced,
          paymentMethodId: method.id,
        })
        const costs = inst?.[0]?.payer_costs ?? []
        const opts = costs
          .map((c) => Number(c.installments))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxInstallments)
        const unique = [...new Set(opts.length ? opts : [1])].sort((a, b) => a - b)
        setInstallmentOptions(unique)
        const current = installmentsRef.current
        setInstallments(unique.includes(current) ? current : unique[0]!)
      } catch {
        /* bin lookup best-effort */
      }
    },
    [amountNum, maxInstallments],
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
            const sync = await syncMercadoPagoPayment(paymentId!)
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
    setBinMethod(null)
    setStatus('idle')
    setMountKey((k) => k + 1)
  }, [])

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

        if (tokenizeOnly) {
          onTokenizedRef.current?.({
            token,
            paymentMethodId: binMethod.id,
            installments,
          })
          setStatus('tokenized')
          return
        }

        const method = String(binMethod.paymentTypeId).toLowerCase().includes('debit')
          ? 'debit_card'
          : 'credit_card'

        const res = await createFalPayment({
          orderId,
          method,
          card: {
            token,
            paymentMethodId: binMethod.id,
            installments,
            issuerId: binMethod.issuerId,
            paymentTypeId: binMethod.paymentTypeId,
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
          remountFields()
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
      remountFields,
      tokenizeOnly,
    ],
  )

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
      <h2 className="mt-0 text-lg font-extrabold">Pagamento com cartão</h2>
      <p className="text-sm text-fal-muted">
        Os dados do cartão são protegidos pelo Mercado Pago. O valor cobrado é o total do pedido.
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
      {submitting ? <Loading label="Processando cartão…" /> : null}
      {!fieldsOk ? (
        <p className="text-xs text-fal-muted">Montando campos seguros do Mercado Pago…</p>
      ) : null}

      <form key={mountKey} className="space-y-3" onSubmit={(ev) => void handleSubmit(ev)}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-fal-ink">Número do cartão</label>
          <div className={fieldShellClass}>
            <CardNumber
              placeholder="Número do cartão"
              style={fieldStyle}
              onReady={() => markFieldReady('cardNumber')}
              onBinChange={(arg) => void handleBinChange(arg.bin ?? null)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-fal-ink">Validade</label>
            <div className={fieldShellClass}>
              <ExpirationDate
                placeholder="MM/AA"
                style={fieldStyle}
                onReady={() => markFieldReady('expirationDate')}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fal-ink">CVV</label>
            <div className={fieldShellClass}>
              <SecurityCode
                placeholder="CVV"
                style={fieldStyle}
                onReady={() => markFieldReady('securityCode')}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-fal-ink" htmlFor="mp-card-name">
            Nome do titular
          </label>
          <input
            id="mp-card-name"
            className="h-12 w-full rounded-[10px] border border-fal-line bg-white px-3 text-base"
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
              className="h-12 w-full rounded-[10px] border border-fal-line bg-white px-2 text-sm"
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
              className="h-12 w-full rounded-[10px] border border-fal-line bg-white px-3 text-base"
              value={docNumber}
              onChange={(ev) => setDocNumber(ev.target.value)}
              inputMode="numeric"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-fal-ink" htmlFor="mp-installments">
            Parcelas
          </label>
          <select
            id="mp-installments"
            className="h-12 w-full rounded-[10px] border border-fal-line bg-white px-3 text-sm"
            value={installments}
            onChange={(ev) => setInstallments(Number(ev.target.value))}
          >
            {installmentOptions.map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </select>
        </div>

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

      {paymentDisplay?.enabled && paymentDisplay.interestFree ? (
        <p className="m-0 text-xs text-fal-muted">
          Parcelas no cartão conforme regras do Mercado Pago e da conta FAL. A vitrine indica
          condições comerciais; o valor cobrado é o total do pedido.
        </p>
      ) : null}
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
