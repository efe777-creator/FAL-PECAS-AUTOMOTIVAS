import { getMercadoPagoClient, type MpField } from '@/components/payments/mpInstance'
import { memo, useEffect, useId, useRef } from 'react'

type FieldName = 'cardNumber' | 'expirationDate' | 'securityCode'

const fieldStyle = {
  height: '48px',
  fontSize: '16px',
  color: '#1f2937',
  placeholderColor: '#94a3b8',
} as const

/** Shell igual ao HTML READY — sem overflow:hidden (corta caret/toque no PCI). */
const fieldShellClass =
  'fal-mp-field-shell w-full rounded-[10px] border border-fal-line bg-white'

type Props = {
  mountKey: number
  publicKey: string
  onFieldReady: (name: FieldName) => void
  onBinChange: (bin: string | null) => void
}

type HostIds = {
  cardNumberId: string
  expirationId: string
  securityId: string
}

/**
 * Hosts estáveis: React NÃO deve reconciliar estes divs após o mount.
 * Se o pai re-renderizar (BIN/parcelas), um `<div />` vazio no VDOM apaga o iframe PCI.
 */
const SecureFieldHosts = memo(
  function SecureFieldHosts({ cardNumberId, expirationId, securityId }: HostIds) {
    return (
      <div className="space-y-3">
        <div>
          <p className="mb-1 block text-sm font-semibold text-fal-ink">Número do cartão</p>
          <div id={cardNumberId} className={fieldShellClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 block text-sm font-semibold text-fal-ink">Validade</p>
            <div id={expirationId} className={fieldShellClass} />
          </div>
          <div>
            <p className="mb-1 block text-sm font-semibold text-fal-ink">CVV</p>
            <div id={securityId} className={fieldShellClass} />
          </div>
        </div>
      </div>
    )
  },
  () => true,
)

/**
 * Secure Fields via Core Methods imperativos (create → mount → on).
 * Callbacks só por ref — o inner não remonta quando o painel atualiza BIN/parcelas.
 */
export function MpCardSecureFields({
  mountKey,
  publicKey,
  onFieldReady,
  onBinChange,
}: Props) {
  return (
    <MpCardSecureFieldsMounted
      key={mountKey}
      publicKey={publicKey}
      onFieldReady={onFieldReady}
      onBinChange={onBinChange}
    />
  )
}

const MpCardSecureFieldsMounted = memo(function MpCardSecureFieldsMounted({
  publicKey,
  onFieldReady,
  onBinChange,
}: Omit<Props, 'mountKey'>) {
  const uid = useId().replace(/:/g, '')
  const ids: HostIds = {
    cardNumberId: `fal-mp-cardNumber-${uid}`,
    expirationId: `fal-mp-expiration-${uid}`,
    securityId: `fal-mp-security-${uid}`,
  }

  const readyRef = useRef(onFieldReady)
  const binRef = useRef(onBinChange)
  readyRef.current = onFieldReady
  binRef.current = onBinChange

  useEffect(() => {
    let cancelled = false
    const handles: MpField[] = []
    let fallbackTimer = 0

    function track(field: MpField) {
      handles.push(field)
      if (cancelled) {
        try {
          field.unmount()
        } catch {
          /* already gone */
        }
      }
    }

    async function mountFields() {
      const mp = await getMercadoPagoClient(publicKey)
      if (cancelled) return

      const cardNumber = mp.fields.create('cardNumber', {
        placeholder: 'Número do cartão',
        style: { ...fieldStyle },
      })
      cardNumber.mount(ids.cardNumberId)
      cardNumber.on('ready', () => {
        if (!cancelled) readyRef.current('cardNumber')
      })
      cardNumber.on('binChange', (arg) => {
        if (!cancelled) binRef.current(arg?.bin ?? null)
      })
      track(cardNumber)
      if (cancelled) return

      const expirationDate = mp.fields.create('expirationDate', {
        placeholder: 'MM/AA',
        style: { ...fieldStyle },
      })
      expirationDate.mount(ids.expirationId)
      expirationDate.on('ready', () => {
        if (!cancelled) readyRef.current('expirationDate')
      })
      track(expirationDate)
      if (cancelled) return

      const securityCode = mp.fields.create('securityCode', {
        placeholder: 'CVV',
        style: { ...fieldStyle },
      })
      securityCode.mount(ids.securityId)
      securityCode.on('ready', () => {
        if (!cancelled) readyRef.current('securityCode')
      })
      track(securityCode)

      fallbackTimer = window.setTimeout(() => {
        if (cancelled) return
        const pairs: [string, FieldName][] = [
          [ids.cardNumberId, 'cardNumber'],
          [ids.expirationId, 'expirationDate'],
          [ids.securityId, 'securityCode'],
        ]
        for (const [id, name] of pairs) {
          if (document.querySelector(`#${CSS.escape(id)} iframe`)) {
            readyRef.current(name)
          }
        }
      }, 800)
    }

    void mountFields().catch((err) => {
      console.error('[MpCardSecureFields] falha ao montar Secure Fields', err)
    })

    return () => {
      cancelled = true
      window.clearTimeout(fallbackTimer)
      for (const h of handles) {
        try {
          h.unmount()
        } catch {
          /* already gone */
        }
      }
    }
    // ids estáveis por mount (key=mountKey no wrapper); publicKey só.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  return <SecureFieldHosts {...ids} />
})
