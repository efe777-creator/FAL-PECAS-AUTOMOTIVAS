import { OwnDeliveryAuditTab } from '@/components/admin/ownDelivery/OwnDeliveryAuditTab'
import { OwnDeliveryManualTab } from '@/components/admin/ownDelivery/OwnDeliveryManualTab'
import { OwnDeliveryProductsTab } from '@/components/admin/ownDelivery/OwnDeliveryProductsTab'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  OWN_VEHICLE_ICON_OPTIONS,
  createOwnVehicleTariff,
  deleteOwnVehicleCategory,
  deleteOwnVehicleTariff,
  getOwnDeliverySettings,
  listOwnVehicleCategories,
  listOwnVehicleTariffs,
  updateOwnVehicleTariff,
  upsertOwnDeliverySettings,
  upsertOwnVehicleCategory,
  type OwnDeliveryCepRange,
  type OwnDeliveryRate,
  type OwnVehicleCategory,
  type OwnVehicleTariff,
} from '@/services/admin/adminOwnDeliveryService'
import type { OwnPricingMode } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'geral', label: 'Gerais', hint: 'Ligar frete e cobertura' },
  { id: 'veiculos', label: 'Veículos', hint: 'Tipos de entrega' },
  { id: 'tarifas', label: 'Tarifas', hint: 'Preços por veículo' },
  { id: 'produtos', label: 'Produtos', hint: 'Capacidade POL' },
  { id: 'manual', label: 'Análise manual', hint: 'Casos especiais' },
  { id: 'historico', label: 'Histórico', hint: 'Alterações recentes' },
]

function iconLabel(icon: string): string {
  return OWN_VEHICLE_ICON_OPTIONS.find((o) => o.value === icon)?.label ?? icon
}

/** Gera ID interno da opção flat; operador não edita. */
function ensureOwnRateId(label: string, existing?: string): string {
  if (existing?.startsWith('own:') && existing.length > 4) return existing
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32)
  return `own:${slug || 'fal'}`
}

function pricingModeLabel(mode: OwnPricingMode): string {
  return mode === 'distance_vehicle' ? 'por distância e veículo' : 'preço fixo'
}

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Veículo novo
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('car')
  const [newPol, setNewPol] = useState('12')
  const [newMaxKm, setNewMaxKm] = useState('')
  const [showTech, setShowTech] = useState(false)

  async function reloadExtras() {
    const [cats, tars] = await Promise.all([
      listOwnVehicleCategories().catch(() => [] as OwnVehicleCategory[]),
      listOwnVehicleTariffs().catch(() => [] as OwnVehicleTariff[]),
    ])
    setCategories(cats)
    setTariffs(tars)
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

  const activeTariffByCat = useMemo(() => {
    const map = new Map<string, OwnVehicleTariff>()
    for (const t of tariffs) {
      if (!t.active) continue
      map.set(t.categoryId, t)
    }
    return map
  }, [tariffs])

  async function onSubmitGeral(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const normalizedRates = rates.map((r, i) => ({
        ...r,
        id: ensureOwnRateId(r.label, r.id),
        serviceCode: r.serviceCode?.trim() || 'fal_sp',
        etaDaysMin: r.etaDaysMin || etaDaysMin,
        etaDaysMax: r.etaDaysMax || etaDaysMax,
        label: r.label.trim() || `Opção ${i + 1}`,
      }))
      const saved = await upsertOwnDeliverySettings({
        id,
        enabled,
        coverageLabel,
        cepRanges,
        rates: normalizedRates,
        pricingMode,
        maxDistanceKm: maxDistanceKm.trim() ? Number(maxDistanceKm) : null,
        etaDaysMin,
        etaDaysMax,
      })
      setId(saved.id)
      setRates(saved.rates)
      setOk(
        `Salvo. Frete ${saved.enabled ? 'ativo' : 'desligado'} · cálculo ${pricingModeLabel(saved.pricingMode)}.`,
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
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Frete próprio</h1>
        <p className="m-0 text-sm text-fal-muted">
          Configure veículos, preços e capacidade dos produtos. O sistema calcula o frete na
          cotação da loja.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Menus frete próprio">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setOk(null)
              setError(null)
            }}
            className={`rounded-xl border px-3 py-2 text-left ${
              tab === t.id
                ? 'border-fal-navy bg-fal-navy text-white'
                : 'border-fal-line bg-white text-fal-navy hover:border-fal-navy/40'
            }`}
          >
            <span className="block text-sm font-extrabold">{t.label}</span>
            <span className={`block text-[11px] ${tab === t.id ? 'text-white/80' : 'text-fal-muted'}`}>
              {t.hint}
            </span>
          </button>
        ))}
      </nav>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{ok}</p> : null}

      {/* —— GERAIS —— */}
      {tab === 'geral' ? (
        <form
          onSubmit={(e) => void onSubmitGeral(e)}
          className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Configurações gerais</h2>
          <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Ativar frete próprio na cotação da loja
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Como calcular o frete</span>
            <select
              className="w-full rounded-lg border border-fal-line px-3 py-2"
              value={pricingMode}
              onChange={(e) => setPricingMode(e.target.value as OwnPricingMode)}
            >
              <option value="flat">Preço fixo (mesmo valor para a região)</option>
              <option value="distance_vehicle">
                Por distância e tipo de veículo (recomendado)
              </option>
            </select>
            <span className="mt-1 block text-xs text-fal-muted">
              {pricingMode === 'distance_vehicle'
                ? 'Usa os menus Veículos e Tarifas. Cobra o maior entre (km × valor/km) e a taxa mínima, depois soma o adicional.'
                : 'Um valor único por opção de entrega, sem calcular km.'}
            </span>
          </label>
          <Input
            label="Nome da cobertura"
            value={coverageLabel}
            onChange={(e) => setCoverageLabel(e.target.value)}
            required
          />
          <Input
            label="Km máximo global (opcional)"
            type="number"
            min="0"
            step="0.1"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
            hint="Limite geral. Cada veículo pode ter km próprio no menu Veículos."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Prazo mínimo (dias)"
              type="number"
              min="0"
              value={String(etaDaysMin)}
              onChange={(e) => setEtaDaysMin(Number(e.target.value) || 1)}
            />
            <Input
              label="Prazo máximo (dias)"
              type="number"
              min="0"
              value={String(etaDaysMax)}
              onChange={(e) => setEtaDaysMax(Number(e.target.value) || 3)}
            />
          </div>
          <div className="space-y-2">
            <h3 className="m-0 text-sm font-extrabold text-fal-navy">Faixas de CEP atendidas</h3>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCepRanges(cepRanges.filter((_, j) => j !== i))}
                >
                  Remover
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setCepRanges([...cepRanges, { from: '', to: '' }])}
            >
              + Faixa de CEP
            </Button>
          </div>
          {pricingMode === 'flat' ? (
            <div className="space-y-2 rounded-lg border border-dashed border-fal-line p-3">
              <h3 className="m-0 text-sm font-extrabold text-fal-navy">Opções de preço fixo</h3>
              <p className="m-0 text-xs text-fal-muted">
                Nome que o cliente vê na cotação e o valor cobrado. Identificadores internos são
                gerados automaticamente.
              </p>
              {rates.map((rate, i) => (
                <div key={rate.id || i} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Nome na loja"
                    value={rate.label}
                    onChange={(e) => {
                      const next = [...rates]
                      next[i] = { ...next[i], label: e.target.value }
                      setRates(next)
                    }}
                    required
                  />
                  <Input
                    label="Valor (R$)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={String(rate.amount)}
                    onChange={(e) => {
                      const next = [...rates]
                      next[i] = { ...next[i], amount: Number(e.target.value) }
                      setRates(next)
                    }}
                    required
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setRates([
                    ...rates,
                    {
                      id: ensureOwnRateId(`opcao_${rates.length + 1}`),
                      serviceCode: 'fal_sp',
                      label: '',
                      amount: 0,
                      etaDaysMin,
                      etaDaysMax,
                    },
                  ])
                }
              >
                + Opção de preço
              </Button>
              {showTech ? (
                <div className="rounded-lg bg-fal-line/30 p-2 text-xs text-fal-muted">
                  <p className="m-0 mb-1 font-semibold text-fal-navy">Identificadores (interno)</p>
                  {rates.map((r, i) => (
                    <p key={i} className="m-0 font-mono">
                      {ensureOwnRateId(r.label || `opcao_${i + 1}`, r.id)}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="m-0 rounded-lg bg-fal-line/40 px-3 py-2 text-sm text-fal-muted">
              Com cálculo por distância, defina os tipos em <strong>Veículos</strong> e os preços
              em <strong>Tarifas</strong>.
            </p>
          )}
          <label className="flex items-center gap-2 text-xs text-fal-muted">
            <input
              type="checkbox"
              checked={showTech}
              onChange={(e) => setShowTech(e.target.checked)}
            />
            Mostrar detalhes técnicos
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar gerais'}
          </Button>
        </form>
      ) : null}

      {/* —— VEÍCULOS —— */}
      {tab === 'veiculos' ? (
        <div className="space-y-4">
          <section className="rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Tipos de veículo</h2>
            <p className="m-0 mb-3 text-sm text-fal-muted">
              Cada tipo define quanto carrega (POL) e até quantos km atende. Inclua ou remova
              conforme a frota.
            </p>
            <div className="space-y-3">
              {categories.map((c) => (
                <form
                  key={c.id}
                  className="grid gap-2 rounded-xl border border-fal-line p-3 md:grid-cols-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget)
                    void (async () => {
                      try {
                        setError(null)
                        const newLabelSaved = String(fd.get('label') || c.label)
                        await upsertOwnVehicleCategory({
                          id: c.id,
                          code: c.code,
                          label: newLabelSaved,
                          icon: String(fd.get('icon') || c.icon),
                          capacityPol: Number(fd.get('capacity') || c.capacityPol),
                          maxDistanceKm: String(fd.get('maxKm') || '').trim()
                            ? Number(fd.get('maxKm'))
                            : null,
                          sortOrder: Number(fd.get('sort') || c.sortOrder),
                          active: fd.get('active') === 'on',
                        })
                        setOk(`“${newLabelSaved}” atualizado.`)
                        await reloadExtras()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Falha ao salvar veículo')
                      }
                    })()
                  }}
                >
                  <div className="md:col-span-5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-fal-navy">{iconLabel(c.icon)}</span>
                    {activeTariffByCat.has(c.id) ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">
                        Preço cadastrado
                      </span>
                    ) : (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                        Falta cadastrar preço em Tarifas
                      </span>
                    )}
                  </div>
                  <Input name="label" label="Nome" defaultValue={c.label} required />
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-extrabold text-fal-muted">Ícone</span>
                    <select
                      name="icon"
                      defaultValue={c.icon}
                      className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                    >
                      {OWN_VEHICLE_ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    name="capacity"
                    label="Capacidade (POL)"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={String(c.capacityPol)}
                    required
                    hint="Quanto esse veículo aguenta"
                  />
                  <Input
                    name="maxKm"
                    label="Atende até (km)"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={c.maxDistanceKm != null ? String(c.maxDistanceKm) : ''}
                    hint="Vazio = usa o limite geral"
                  />
                  <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                    <input name="active" type="checkbox" defaultChecked={c.active} /> Em uso
                  </label>
                  {showTech ? (
                    <div className="md:col-span-5 grid gap-2 sm:grid-cols-2">
                      <Input
                        name="sort"
                        label="Ordem na cotação"
                        type="number"
                        defaultValue={String(c.sortOrder)}
                      />
                      <p className="m-0 self-end pb-2 text-xs text-fal-muted">
                        Código interno: <span className="font-mono">{c.code}</span>
                      </p>
                    </div>
                  ) : (
                    <input type="hidden" name="sort" value={String(c.sortOrder)} />
                  )}
                  <div className="md:col-span-5 flex flex-wrap gap-2">
                    <Button type="submit">Salvar</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (
                          !confirm(
                            `Excluir “${c.label}”? Os preços desse veículo também serão removidos.`,
                          )
                        )
                          return
                        void (async () => {
                          try {
                            await deleteOwnVehicleCategory(c.id)
                            setOk(`“${c.label}” excluído.`)
                            await reloadExtras()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Falha ao excluir')
                          }
                        })()
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </form>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-fal-muted">
              <input
                type="checkbox"
                checked={showTech}
                onChange={(e) => setShowTech(e.target.checked)}
              />
              Mostrar detalhes técnicos
            </label>
          </section>

          <section className="rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Incluir novo veículo</h2>
            <form
              className="grid gap-2 md:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault()
                void (async () => {
                  try {
                    setError(null)
                    await upsertOwnVehicleCategory({
                      label: newLabel,
                      icon: newIcon,
                      capacityPol: Number(newPol),
                      maxDistanceKm: newMaxKm.trim() ? Number(newMaxKm) : null,
                      sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 10,
                      active: true,
                    })
                    setNewLabel('')
                    setNewPol('12')
                    setNewMaxKm('')
                    setOk('Nova modalidade criada.')
                    await reloadExtras()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Falha ao criar')
                  }
                })()
              }}
            >
              <Input
                label="Nome"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
              />
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">Ícone</span>
                <select
                  className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                >
                  {OWN_VEHICLE_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Capacidade (POL)"
                type="number"
                value={newPol}
                onChange={(e) => setNewPol(e.target.value)}
                required
              />
              <Input
                label="Atende até (km)"
                type="number"
                value={newMaxKm}
                onChange={(e) => setNewMaxKm(e.target.value)}
              />
              <Button type="submit">Incluir veículo</Button>
            </form>
          </section>
        </div>
      ) : null}

      {/* —— TARIFAS —— */}
      {tab === 'tarifas' ? (
        <div className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Preços por veículo</h2>
          <p className="m-0 text-sm text-fal-muted">
            Para cada tipo: taxa mínima (piso), valor por km de ida e um adicional fixo (opcional).
            O frete fica o maior entre (km × valor/km) e a mínima, mais o adicional.
          </p>
          {!categories.length ? (
            <p className="text-sm text-amber-800">
              Cadastre ao menos um veículo no menu <strong>Veículos</strong>.
            </p>
          ) : null}
          {categories.map((c) => {
            const active = activeTariffByCat.get(c.id)
            const history = tariffs.filter((t) => t.categoryId === c.id)
            return (
              <div key={c.id} className="rounded-xl border border-fal-line p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-base font-extrabold text-fal-navy">{c.label}</h3>
                  <span className="text-xs text-fal-muted">{iconLabel(c.icon)}</span>
                </div>
                {active ? (
                  <form
                    className="grid gap-2 md:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget)
                      void (async () => {
                        try {
                          await updateOwnVehicleTariff({
                            id: active.id,
                            tarifaMinima: Number(fd.get('min')),
                            valorPorKm: Number(fd.get('km')),
                            adicional: Number(fd.get('extra') || 0),
                            active: true,
                          })
                          setOk(`Preço de “${c.label}” atualizado.`)
                          await reloadExtras()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Falha ao salvar preço')
                        }
                      })()
                    }}
                  >
                    <Input
                      name="min"
                      label="Taxa mínima (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={String(active.tarifaMinima)}
                      required
                      hint="Piso — nunca cobramos menos que isso"
                    />
                    <Input
                      name="km"
                      label="Valor por km (R$)"
                      type="number"
                      step="0.0001"
                      min="0"
                      defaultValue={String(active.valorPorKm)}
                      required
                      hint="Só ida"
                    />
                    <Input
                      name="extra"
                      label="Adicional (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={String(active.adicional)}
                      hint="Soma fixa no final (0 se não usar)"
                    />
                    <div className="flex flex-wrap items-end gap-2">
                      <Button type="submit">Salvar preço</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!confirm(`Remover o preço de “${c.label}”?`)) return
                          void (async () => {
                            try {
                              await deleteOwnVehicleTariff(active.id)
                              setOk('Preço removido.')
                              await reloadExtras()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Falha')
                            }
                          })()
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                    {showTech ? (
                      <p className="md:col-span-4 m-0 text-xs text-fal-muted">
                        Versão interna {active.version} · {history.length} registro(s) no histórico
                      </p>
                    ) : null}
                  </form>
                ) : (
                  <form
                    className="grid gap-2 md:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget)
                      void (async () => {
                        try {
                          await createOwnVehicleTariff({
                            categoryId: c.id,
                            tarifaMinima: Number(fd.get('min')),
                            valorPorKm: Number(fd.get('km')),
                            adicional: Number(fd.get('extra') || 0),
                            active: true,
                          })
                          setOk(`Preço de “${c.label}” cadastrado.`)
                          await reloadExtras()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Falha')
                        }
                      })()
                    }}
                  >
                    <p className="md:col-span-4 m-0 text-sm text-amber-800">
                      Ainda sem preço — preencha para cotar este veículo na loja.
                    </p>
                    <Input
                      name="min"
                      label="Taxa mínima (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                    />
                    <Input
                      name="km"
                      label="Valor por km (R$)"
                      type="number"
                      step="0.0001"
                      min="0"
                      required
                    />
                    <Input
                      name="extra"
                      label="Adicional (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue="0"
                    />
                    <Button type="submit">Cadastrar preço</Button>
                  </form>
                )}
              </div>
            )
          })}
          <label className="flex items-center gap-2 text-xs text-fal-muted">
            <input
              type="checkbox"
              checked={showTech}
              onChange={(e) => setShowTech(e.target.checked)}
            />
            Mostrar detalhes técnicos
          </label>
        </div>
      ) : null}

      {tab === 'produtos' ? (
        <OwnDeliveryProductsTab
          categories={categories}
          onOk={(msg) => {
            setError(null)
            setOk(msg)
          }}
          onError={(msg) => {
            setOk(null)
            setError(msg)
          }}
        />
      ) : null}

      {tab === 'manual' ? <OwnDeliveryManualTab /> : null}

      {tab === 'historico' ? <OwnDeliveryAuditTab /> : null}
    </div>
  )
}
