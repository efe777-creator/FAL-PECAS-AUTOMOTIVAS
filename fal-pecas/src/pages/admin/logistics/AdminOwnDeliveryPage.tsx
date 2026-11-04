import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  getOwnDeliverySettings,
  upsertOwnDeliverySettings,
  type OwnDeliveryCepRange,
  type OwnDeliveryRate,
} from '@/services/admin/adminOwnDeliveryService'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const DEFAULT_RANGES: OwnDeliveryCepRange[] = [{ from: '01000000', to: '05999999' }]
const DEFAULT_RATES: OwnDeliveryRate[] = [
  {
    id: 'own:fal',
    serviceCode: 'fal_sp',
    label: 'Entrega FAL (SP capital)',
    amount: 29.9,
    etaDaysMin: 1,
    etaDaysMax: 3,
  },
]

export function AdminOwnDeliveryPage() {
  const [id, setId] = useState<string | undefined>()
  const [enabled, setEnabled] = useState(false)
  const [coverageLabel, setCoverageLabel] = useState('São Paulo — capital')
  const [cepRanges, setCepRanges] = useState<OwnDeliveryCepRange[]>(DEFAULT_RANGES)
  const [rates, setRates] = useState<OwnDeliveryRate[]>(DEFAULT_RATES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const s = await getOwnDeliverySettings()
        if (s) {
          setId(s.id)
          setEnabled(s.enabled)
          setCoverageLabel(s.coverageLabel)
          setCepRanges(s.cepRanges.length ? s.cepRanges : DEFAULT_RANGES)
          setRates(s.rates.length ? s.rates : DEFAULT_RATES)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar frete próprio')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const saved = await upsertOwnDeliverySettings({
        id,
        enabled,
        coverageLabel,
        cepRanges,
        rates,
      })
      setId(saved.id)
      setOk(
        saved.enabled
          ? 'Frete próprio salvo e ativo (sandbox B — não é frete live).'
          : 'Frete próprio salvo (desativado na cotação).',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando frete próprio…" />

  return (
    <div className="space-y-4">
      <Link to="/admin/logistica" className="text-sm font-semibold text-fal-navy no-underline">
        ← Logística
      </Link>
      <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Frete próprio</h1>
      <p className="m-0 text-sm text-fal-muted">
        Entrega FAL em faixas de CEP (padrão SP capital). Tabela editável; critérios avançados de
        preço = pendência do plano. Sob D-FRETE <strong>B</strong> a cotação continua homologação.
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4"
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Ativar frete próprio na cotação (quando CEP na cobertura)
        </label>

        <Input
          label="Rótulo de cobertura"
          value={coverageLabel}
          onChange={(e) => setCoverageLabel(e.target.value)}
          required
        />

        <div className="space-y-2">
          <h2 className="m-0 text-sm font-extrabold text-fal-navy">Faixas de CEP</h2>
          {cepRanges.map((r, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Input
                label="De"
                inputMode="numeric"
                value={r.from}
                onChange={(e) => {
                  const next = [...cepRanges]
                  next[i] = { ...r, from: e.target.value }
                  setCepRanges(next)
                }}
              />
              <Input
                label="Até"
                inputMode="numeric"
                value={r.to}
                onChange={(e) => {
                  const next = [...cepRanges]
                  next[i] = { ...r, to: e.target.value }
                  setCepRanges(next)
                }}
              />
              <Button
                type="button"
                variant="light"
                disabled={cepRanges.length <= 1}
                onClick={() => setCepRanges(cepRanges.filter((_, j) => j !== i))}
              >
                Remover
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="light"
            onClick={() => setCepRanges([...cepRanges, { from: '', to: '' }])}
          >
            + Faixa
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="m-0 text-sm font-extrabold text-fal-navy">Tabela de modalidades</h2>
          {rates.map((rate, i) => (
            <div
              key={rate.id + i}
              className="grid gap-2 rounded-[10px] border border-fal-line/80 p-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Input
                label="ID (own:…)"
                value={rate.id}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...rate, id: e.target.value }
                  setRates(next)
                }}
              />
              <Input
                label="Código serviço"
                value={rate.serviceCode}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...rate, serviceCode: e.target.value }
                  setRates(next)
                }}
              />
              <Input
                label="Label"
                value={rate.label}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...rate, label: e.target.value }
                  setRates(next)
                }}
              />
              <Input
                label="Valor (R$)"
                type="number"
                step="0.01"
                min="0"
                value={String(rate.amount)}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...rate, amount: Number(e.target.value) }
                  setRates(next)
                }}
              />
              <Input
                label="Prazo mín. (dias)"
                type="number"
                min="0"
                value={String(rate.etaDaysMin)}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...rate, etaDaysMin: Number(e.target.value) }
                  setRates(next)
                }}
              />
              <Input
                label="Prazo máx. (dias)"
                type="number"
                min="0"
                value={String(rate.etaDaysMax)}
                onChange={(e) => {
                  const next = [...rates]
                  next[i] = { ...rate, etaDaysMax: Number(e.target.value) }
                  setRates(next)
                }}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Button
                  type="button"
                  variant="light"
                  disabled={rates.length <= 1}
                  onClick={() => setRates(rates.filter((_, j) => j !== i))}
                >
                  Remover modalidade
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="light"
            onClick={() =>
              setRates([
                ...rates,
                {
                  id: `own:fal-${rates.length + 1}`,
                  serviceCode: 'fal_sp',
                  label: 'Nova modalidade FAL',
                  amount: 0,
                  etaDaysMin: 1,
                  etaDaysMax: 3,
                },
              ])
            }
          >
            + Modalidade
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar frete próprio'}
        </Button>
      </form>
    </div>
  )
}
