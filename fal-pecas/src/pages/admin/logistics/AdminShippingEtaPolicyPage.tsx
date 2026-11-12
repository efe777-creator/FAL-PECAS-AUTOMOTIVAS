import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  DEFAULT_SHIPPING_ETA_POLICY,
  computeMeDisplayEta,
  type ShippingEtaPolicy,
} from '@/lib/shippingEtaPolicy'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  getShippingEtaPolicy,
  saveShippingEtaPolicy,
} from '@/services/admin/adminShippingEtaPolicyService'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminShippingEtaPolicyPage() {
  useDocumentTitle('Prazos de entrega | Logística FAL')
  const toast = useToast()
  const [policy, setPolicy] = useState<ShippingEtaPolicy>(DEFAULT_SHIPPING_ETA_POLICY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () =>
      computeMeDisplayEta(
        { min: 3, max: 5 },
        { dayCountMode: policy.dayCountMode, me: policy.me },
      ),
    [policy],
  )

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setPolicy(await getShippingEtaPolicy())
      } catch (e) {
        setError(toUserMessage(e, 'Erro ao carregar política de prazos'))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSave() {
    setSaving(true)
    try {
      const saved = await saveShippingEtaPolicy(policy)
      setPolicy(saved)
      toast.push('Prazos salvos. Valem para novas cotações.', 'success')
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao salvar prazos'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-fal-muted">
          <Link to="/admin/logistica" className="text-fal-navy no-underline">
            Logística
          </Link>{' '}
          · Prazos
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-fal-navy">Prazos dos meios disponíveis</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted">
          Controle central dos prazos. Pedidos antigos mantêm o snapshot contratado. Retirada não é
          entrega própria.
        </p>
      </div>

      {loading ? <Loading label="Carregando prazos…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Geral</h2>
            <label className="block text-sm font-semibold text-fal-navy">
              Contagem de dias (padrão ME)
              <select
                className="mt-1 w-full max-w-xs rounded-[10px] border border-fal-line px-3 py-2"
                value={policy.dayCountMode}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    dayCountMode: e.target.value as ShippingEtaPolicy['dayCountMode'],
                  }))
                }
              >
                <option value="business_days">Dias úteis</option>
                <option value="calendar_days">Dias corridos</option>
              </select>
            </label>
          </section>

          <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Melhor Envio</h2>
            <p className="m-0 text-xs text-fal-muted">
              O prazo do transportador é preservado. A FAL soma preparação e buffer só conforme a
              política abaixo.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Preparação FAL (dias)"
                type="number"
                min={0}
                value={String(policy.me.prepDays)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    me: { ...p.me, prepDays: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
              <Input
                label="Buffer operacional (dias)"
                type="number"
                min={0}
                value={String(policy.me.bufferDays)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    me: { ...p.me, bufferDays: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-fal-navy">
                <input
                  type="checkbox"
                  checked={policy.me.prepIncludedInCarrier}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      me: { ...p.me, prepIncludedInCarrier: e.target.checked },
                    }))
                  }
                />
                Prep já inclusa no prazo do carrier
              </label>
            </div>
            <p className="m-0 rounded-[10px] bg-fal-bg px-3 py-2 text-xs text-fal-muted">
              Exemplo carrier 3–5 dias → cliente vê{' '}
              <strong>
                {preview.displayEtaMin}–{preview.displayEtaMax}
              </strong>{' '}
              ({policy.dayCountMode === 'business_days' ? 'úteis' : 'corridos'}). Carrier original
              permanece {preview.carrierEtaMin}–{preview.carrierEtaMax}.
            </p>
          </section>

          <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Frete próprio</h2>
            <p className="m-0 text-xs text-fal-muted">
              Min/máx de dias continuam em Frete próprio (Gerais). Aqui só a semântica de contagem.
            </p>
            <label className="block text-sm font-semibold text-fal-navy">
              Contagem de dias (own)
              <select
                className="mt-1 w-full max-w-xs rounded-[10px] border border-fal-line px-3 py-2"
                value={policy.own.dayCountMode}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    own: {
                      dayCountMode: e.target.value as ShippingEtaPolicy['own']['dayCountMode'],
                    },
                  }))
                }
              >
                <option value="business_days">Dias úteis</option>
                <option value="calendar_days">Dias corridos</option>
              </select>
            </label>
            <Link
              to="/admin/logistica/frete-proprio"
              className="text-sm font-semibold text-fal-navy"
            >
              Abrir eta min/máx do frete próprio →
            </Link>
          </section>

          <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Mock (sandbox)</h2>
            <p className="m-0 text-xs text-fal-muted">
              Substitui hardcodes comerciais. Mock não é caminho real de produção.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input
                label="Econômico min"
                type="number"
                min={0}
                value={String(policy.mock.economicMin)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    mock: { ...p.mock, economicMin: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
              <Input
                label="Econômico max"
                type="number"
                min={0}
                value={String(policy.mock.economicMax)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    mock: { ...p.mock, economicMax: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
              <Input
                label="Expresso min"
                type="number"
                min={0}
                value={String(policy.mock.expressMin)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    mock: { ...p.mock, expressMin: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
              <Input
                label="Expresso max"
                type="number"
                min={0}
                value={String(policy.mock.expressMax)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    mock: { ...p.mock, expressMax: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
            </div>
          </section>

          <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Retirada na loja</h2>
            <p className="m-0 text-xs text-fal-muted">
              Jornada própria — não entra na fila de entregas próprias.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 max-w-md">
              <Input
                label="Disponível em (min dias)"
                type="number"
                min={0}
                value={String(policy.pickup.availableInDaysMin)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    pickup: {
                      ...p.pickup,
                      availableInDaysMin: Math.max(0, Number(e.target.value) || 0),
                    },
                  }))
                }
              />
              <Input
                label="Disponível em (max dias)"
                type="number"
                min={0}
                value={String(policy.pickup.availableInDaysMax)}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    pickup: {
                      ...p.pickup,
                      availableInDaysMax: Math.max(0, Number(e.target.value) || 0),
                    },
                  }))
                }
              />
            </div>
          </section>

          <Button type="button" disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Salvando…' : 'Salvar prazos'}
          </Button>
        </>
      ) : null}
    </div>
  )
}
