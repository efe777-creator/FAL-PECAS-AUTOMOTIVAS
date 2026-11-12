import { MercadoPagoCardBrickPanel } from '@/components/payments/MercadoPagoCardBrickPanel'
import { Container } from '@/components/layout/Container'
import { isUsableMpPublicKey } from '@/lib/mpAdminStatus'
import { useState } from 'react'

/** Só DEV — isola Secure Fields (Core Methods) sem checkout/login. */
export function DevMpBrickPage() {
  const raw = (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined)?.trim() ?? ''
  const pk = isUsableMpPublicKey(raw) ? raw.replace(/^=+/, '') : ''
  const [msg, setMsg] = useState<string | null>(null)

  if (!import.meta.env.DEV) {
    return <Container className="py-8">Indisponível.</Container>
  }

  return (
    <Container className="py-8">
      <h1 className="mt-0 text-xl font-extrabold">DEV · Card (Core Methods)</h1>
      <p className="text-sm text-fal-muted">
        PK: {pk ? `${pk.slice(0, 12)}…` : 'ausente/inválida'} · tokenizeOnly (sem Edge)
      </p>
      {msg ? <p className="text-sm text-fal-navy">{msg}</p> : null}
      {pk ? (
        <MercadoPagoCardBrickPanel
          orderId="00000000-0000-0000-0000-000000000000"
          amount={10.5}
          publicKey={pk}
          tokenizeOnly
          onApproved={() => setMsg('approved (inesperado em tokenizeOnly)')}
          onError={(m) => setMsg(`erro: ${m}`)}
          onTokenized={({ token, paymentMethodId, installments }) =>
            setMsg(
              `token OK · ${paymentMethodId} · ${installments}x · ${token.slice(0, 12)}…`,
            )
          }
        />
      ) : (
        <p className="text-fal-danger">Configure VITE_MP_PUBLIC_KEY=TEST-… ou APP_USR-…</p>
      )}
    </Container>
  )
}
