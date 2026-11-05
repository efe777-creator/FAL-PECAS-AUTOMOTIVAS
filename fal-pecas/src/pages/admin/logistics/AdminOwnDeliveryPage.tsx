import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  createOwnVehicleTariff,
  getOwnDeliverySettings,
  listOwnAdminAudit,
  listOwnManualReviews,
  listOwnVehicleCategories,
  listOwnVehicleTariffs,
  upsertOwnDeliverySettings,
  upsertOwnVehicleCategory,
  type OwnDeliveryCepRange,
  type OwnDeliveryRate,
  type OwnVehicleCategory,
  type OwnVehicleTariff,
} from '@/services/admin/adminOwnDeliveryService'
import type { OwnPricingMode } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type Tab = 'geral' | 'veiculos' | 'tarifas' | 'produtos' | 'manual' | 'historico'

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

const TABS: { id: Tab; label: string }[] = [
  { id: 'geral', label: '1. Gerais e cobertura' },
  { id: 'veiculos', label: '2. Veículos / POL' },
  { id: 'tarifas', label: '3. Tarifas' },
  { id: 'produtos', label: '4. Produtos' },
  { id: 'manual', label: '5. Análise manual' },
  { id: 'historico', label: '6. Histórico' },
]

export function AdminOwnDeliveryPage() {
  const [tab, setTab] = useState<Tab>('geral')
  const [id, setId] = useState<string | undefined>()
  const [enabled, setEnabled] = useState(false)
  const [coverageLabel, setCoverageLabel] = useState('São Paulo — capital')
  const [cepRanges, setCepRanges] = useState<OwnDeliveryCepRange[]>(DEFAULT_RANGES)
  const [rates, setRates] = useState<OwnDeliveryRate[]>(DEFAULT_RATES)
  const [pricingMode, setPricingMode] = useState<OwnPricingMode>('flat')
  const [maxDistanceKm, setMaxDistanceKm] = useState('')
  const [etaDaysMin, setEtaDaysMin] = useState(1)
  const [etaDaysMax, setEtaDaysMax] = useState(3)
  const [categories, setCategories] = useState<OwnVehicleCategory[]>([])
  const [tariffs, setTariffs] = useState<OwnVehicleTariff[]>([])
  const [manualRows, setManualRows] = useState<unknown[]>([])
  const [auditRows, setAuditRows] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function reloadExtras() {
    const [cats, tars, manuals, audits] = await Promise.all([
      listOwnVehicleCategories().catch(() => [] as OwnVehicleCategory[]),
      listOwnVehicleTariffs().catch(() => [] as OwnVehicleTariff[]),
      listOwnManualReviews().catch(() => []),
      listOwnAdminAudit().catch(() => []),
    ])
    setCategories(cats)
    setTariffs(tars)
    setManualRows(manuals)
    setAuditRows(audits)
  }

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
          setPricingMode(s.pricingMode)
          setMaxDistanceKm(s.maxDistanceKm != null ? String(s.maxDistanceKm) : '')
          setEtaDaysMin(s.etaDaysMin)
          setEtaDaysMax(s.etaDaysMax)
        }
        await reloadExtras()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar frete próprio')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSubmitGeral(e: FormEvent) {
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
        pricingMode,
        maxDistanceKm: maxDistanceKm.trim() ? Number(maxDistanceKm) : null,
        etaDaysMin,
        etaDaysMax,
      })
      setId(saved.id)
      setOk(
        saved.enabled
          ? `Salvo · modo ${saved.pricingMode} · ativo (D-FRETE B = homologação).`
          : `Salvo · modo ${saved.pricingMode} · desativado na cotação.`,
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
      <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Frete próprio / Entrega</h1>
      <p className="m-0 text-sm text-fal-muted">
        v1 flat + v2 distância/POL/veículo. Fórmula:{' '}
        <code>max(km_ida × R$/km, tarifa_mínima)</code>. Sob D-FRETE <strong>B</strong>.
      </p>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
              tab === t.id
                ? 'border-fal-navy bg-fal-navy text-white'
                : 'border-fal-line bg-white text-fal-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      {ok ? <p className="text-sm font-semibold text-emerald-700">{ok}</p> : null}

      {tab === 'geral' ? (
        <form
          onSubmit={(e) => void onSubmitGeral(e)}
          className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4"
        >
          <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Ativar frete próprio na cotação
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Modo de precificação</span>
            <select
              className="w-full rounded-lg border border-fal-line px-3 py-2"
              value={pricingMode}
              onChange={(e) => setPricingMode(e.target.value as OwnPricingMode)}
            >
              <option value="flat">Flat (v1 — tabela amount fixo)</option>
              <option value="distance_vehicle">Distância + veículo (v2)</option>
            </select>
          </label>
          <Input
            label="Rótulo de cobertura"
            value={coverageLabel}
            onChange={(e) => setCoverageLabel(e.target.value)}
            required
          />
          <Input
            label="Distância máxima (km, vazio = sem limite)"
            type="number"
            min="0"
            step="0.1"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Prazo mín. (dias)"
              type="number"
              min="0"
              value={String(etaDaysMin)}
              onChange={(e) => setEtaDaysMin(Number(e.target.value) || 1)}
            />
            <Input
              label="Prazo máx. (dias)"
              type="number"
              min="0"
              value={String(etaDaysMax)}
              onChange={(e) => setEtaDaysMax(Number(e.target.value) || 3)}
            />
          </div>

          <div className="space-y-2">
            <h2 className="m-0 text-sm font-extrabold text-fal-navy">Faixas de CEP</h2>
            {cepRanges.map((r, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Input
                  label="De"
                  value={r.from}
                  onChange={(e) => {
                    const next = [...cepRanges]
                    next[i] = { ...next[i], from: e.target.value }
                    setCepRanges(next)
                  }}
                />
                <Input
                  label="Até"
                  value={r.to}
                  onChange={(e) => {
                    const next = [...cepRanges]
                    next[i] = { ...next[i], to: e.target.value }
                    setCepRanges(next)
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCepRanges([...cepRanges, { from: '', to: '' }])}
            >
              + Faixa
            </Button>
          </div>

          {pricingMode === 'flat' ? (
            <div className="space-y-2">
              <h2 className="m-0 text-sm font-extrabold text-fal-navy">Tabela flat (v1)</h2>
              {rates.map((rate, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-fal-line p-3 sm:grid-cols-2">
                  <Input
                    label="ID (own:…)"
                    value={rate.id}
                    onChange={(e) => {
                      const next = [...rates]
                      next[i] = { ...next[i], id: e.target.value }
                      setRates(next)
                    }}
                  />
                  <Input
                    label="Label"
                    value={rate.label}
                    onChange={(e) => {
                      const next = [...rates]
                      next[i] = { ...next[i], label: e.target.value }
                      setRates(next)
                    }}
                  />
                  <Input
                    label="Valor (R$)"
                    type="number"
                    step="0.01"
                    value={String(rate.amount)}
                    onChange={(e) => {
                      const next = [...rates]
                      next[i] = { ...next[i], amount: Number(e.target.value) }
                      setRates(next)
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-sm text-fal-muted">
              Modo v2: configure veículos e tarifas nas abas 2 e 3. Cotação usa Edge{' '}
              <code>quote-own-delivery</code> + secret <code>GOOGLE_MAPS_API_KEY</code>.
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </Button>
        </form>
      ) : null}

      {tab === 'veiculos' ? (
        <div className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
          <p className="m-0 text-sm text-fal-muted">
            Moto: capacidade seed 12 POL (regra ≤12). Carro: editável.
          </p>
          {categories.map((c) => (
            <form
              key={c.id}
              className="grid gap-2 rounded-lg border border-fal-line p-3 sm:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                void (async () => {
                  try {
                    await upsertOwnVehicleCategory({
                      id: c.id,
                      code: c.code,
                      label: String(fd.get('label') || c.label),
                      capacityPol: Number(fd.get('capacity') || c.capacityPol),
                      sortOrder: Number(fd.get('sort') || c.sortOrder),
                      active: fd.get('active') === 'on',
                    })
                    setOk(`Veículo ${c.code} salvo.`)
                    await reloadExtras()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Falha')
                  }
                })()
              }}
            >
              <div className="text-sm font-bold text-fal-navy">{c.code}</div>
              <Input name="label" label="Label" defaultValue={c.label} />
              <Input name="capacity" label="Capacidade POL" type="number" defaultValue={String(c.capacityPol)} />
              <Input name="sort" label="Ordem" type="number" defaultValue={String(c.sortOrder)} />
              <label className="flex items-center gap-2 text-sm">
                <input name="active" type="checkbox" defaultChecked={c.active} /> Ativo
              </label>
              <Button type="submit">Salvar</Button>
            </form>
          ))}
          {!categories.length ? (
            <p className="text-sm text-fal-muted">
              Nenhuma categoria — aplique a migration `20261105120000_own_delivery_v2_schema.sql`.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === 'tarifas' ? (
        <div className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
          <p className="m-0 text-sm text-fal-muted">
            Nova versão por categoria (não edita versão antiga). Valores comerciais = você preenche
            (seed inicial pode estar 0/inativo).
          </p>
          <ul className="m-0 list-disc pl-5 text-sm">
            {tariffs.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId)
              return (
                <li key={t.id}>
                  {cat?.code ?? t.categoryId} · v{t.version} · mín R$ {t.tarifaMinima} · R$/km{' '}
                  {t.valorPorKm} · {t.active ? 'ATIVA' : 'inativa'}
                </li>
              )
            })}
          </ul>
          {categories.map((c) => (
            <form
              key={c.id}
              className="grid gap-2 rounded-lg border border-fal-line p-3 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                void (async () => {
                  try {
                    await createOwnVehicleTariff({
                      categoryId: c.id,
                      tarifaMinima: Number(fd.get('min')),
                      valorPorKm: Number(fd.get('km')),
                      active: fd.get('active') === 'on',
                    })
                    setOk(`Tarifa ${c.code} criada.`)
                    await reloadExtras()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Falha')
                  }
                })()
              }}
            >
              <div className="sm:col-span-3 text-sm font-bold text-fal-navy">Nova tarifa — {c.label}</div>
              <Input name="min" label="Tarifa mínima (piso)" type="number" step="0.01" required />
              <Input name="km" label="Valor por km (ida)" type="number" step="0.0001" required />
              <label className="flex items-center gap-2 text-sm">
                <input name="active" type="checkbox" defaultChecked /> Ativar (desativa anterior)
              </label>
              <Button type="submit">Criar versão</Button>
            </form>
          ))}
        </div>
      ) : null}

      {tab === 'produtos' ? (
        <div className="space-y-2 rounded-[14px] border border-fal-line bg-white p-4 text-sm">
          <p className="m-0">
            Classificação POL / porte / veículo fica no{' '}
            <Link to="/admin/produtos" className="font-semibold text-fal-navy">
              cadastro de produtos
            </Link>{' '}
            (seção Logística). Bulk com preserve = próxima fatia (atalho aqui).
          </p>
          <p className="m-0 text-fal-muted">
            Categoria comercial pode sugerir POL no futuro — nunca altera produtos automaticamente.
          </p>
        </div>
      ) : null}

      {tab === 'manual' ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-4 text-sm">
          <p className="mt-0">Fila de análise manual ({manualRows.length}).</p>
          {!manualRows.length ? (
            <p className="text-fal-muted">Vazia — gerada quando cotação retorna manual_review.</p>
          ) : (
            <pre className="overflow-auto text-xs">{JSON.stringify(manualRows, null, 2)}</pre>
          )}
        </div>
      ) : null}

      {tab === 'historico' ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-4 text-sm">
          <p className="mt-0">Audit log ({auditRows.length}).</p>
          {!auditRows.length ? (
            <p className="text-fal-muted">Sem eventos ainda.</p>
          ) : (
            <pre className="overflow-auto text-xs">{JSON.stringify(auditRows, null, 2)}</pre>
          )}
        </div>
      ) : null}
    </div>
  )
}
