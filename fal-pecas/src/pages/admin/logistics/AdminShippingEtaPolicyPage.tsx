import { LogisticsDeadlinePanel } from '@/components/admin/logistics/LogisticsDeadlinePanel'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  DEFAULT_SHIPPING_ETA_POLICY,
  type ShippingEtaPolicy,
} from '@/lib/shippingEtaPolicy'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  getShippingEtaPolicy,
  listRecentMeCarrierEtas,
  saveShippingEtaPolicy,
  type MeQuoteEtaSample,
} from '@/services/admin/adminShippingEtaPolicyService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminShippingEtaPolicyPage() {
  useDocumentTitle('Prazos de entrega | Logística FAL')
  const toast = useToast()
  const [policy, setPolicy] = useState<ShippingEtaPolicy>(DEFAULT_SHIPPING_ETA_POLICY)
  const [samples, setSamples] = useState<MeQuoteEtaSample[]>([])
  const [ownBaseMin, setOwnBaseMin] = useState(1)
  const [ownBaseMax, setOwnBaseMax] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [p, s] = await Promise.all([
          getShippingEtaPolicy(),
          listRecentMeCarrierEtas().catch(() => [] as MeQuoteEtaSample[]),
        ])
        setPolicy(p)
        setSamples(s)
        // Base own continua em Frete próprio; aqui só ecoamos defaults para preview do extra
        setOwnBaseMin(1)
        setOwnBaseMax(3)
      } catch (e) {
        setError(toUserMessage(e, 'Erro ao carregar política de prazos'))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function saveAll() {
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
          Regra única: <strong>prazo real da escolha</strong> + <strong>tempo a mais</strong> da
          FAL. Pedidos antigos mantêm o snapshot.
        </p>
      </div>

      {loading ? <Loading label="Carregando prazos…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <LogisticsDeadlinePanel
            mode="me"
            extraDays={policy.me.extraDays}
            dayCountMode={policy.dayCountMode}
            samples={samples}
            saving={saving}
            onExtraDays={(n) =>
              setPolicy((p) => ({
                ...p,
                me: {
                  ...p.me,
                  extraDays: n,
                  bufferDays: n,
                  prepDays: 0,
                  prepIncludedInCarrier: true,
                },
              }))
            }
            onDayCountMode={(m) => setPolicy((p) => ({ ...p, dayCountMode: m }))}
            onSave={() => void saveAll()}
          />

          <div className="space-y-2">
            <LogisticsDeadlinePanel
              mode="own"
              baseMin={ownBaseMin}
              baseMax={ownBaseMax}
              extraDays={policy.own.extraDays}
              dayCountMode={policy.own.dayCountMode}
              showSaveButton={false}
              onBaseMin={setOwnBaseMin}
              onBaseMax={setOwnBaseMax}
              onExtraDays={(n) =>
                setPolicy((p) => ({ ...p, own: { ...p.own, extraDays: n } }))
              }
              onDayCountMode={(m) =>
                setPolicy((p) => ({ ...p, own: { ...p.own, dayCountMode: m } }))
              }
            />
            <p className="m-0 text-xs text-fal-muted">
              O <strong>prazo base</strong> oficial do frete próprio é salvo em{' '}
              <Link to="/admin/logistica/frete-proprio" className="font-semibold text-fal-navy">
                Frete próprio → Gerais
              </Link>
              . Aqui você ajusta o <strong>tempo a mais</strong> (e a contagem). Os campos base
              acima são só para simular o total.
            </p>
            <Button type="button" disabled={saving} onClick={() => void saveAll()}>
              {saving ? 'Salvando…' : 'Salvar tempo a mais (own)'}
            </Button>
          </div>

          <section className="rounded-[14px] border border-fal-line bg-white p-4 space-y-3">
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Mock (sandbox)</h2>
            <p className="m-0 text-xs text-fal-muted">Não é caminho real de produção.</p>
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
            <p className="m-0 text-xs text-fal-muted">Não é entrega própria.</p>
            <div className="grid gap-3 sm:grid-cols-2 max-w-md">
              <Input
                label="Disponível em (min)"
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
                label="Disponível em (max)"
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

          <Button type="button" disabled={saving} onClick={() => void saveAll()}>
            {saving ? 'Salvando…' : 'Salvar todos os prazos'}
          </Button>
        </>
      ) : null}
    </div>
  )
}
