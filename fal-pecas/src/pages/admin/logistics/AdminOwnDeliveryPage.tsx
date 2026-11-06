import { OwnDeliveryAuditTab } from '@/components/admin/ownDelivery/OwnDeliveryAuditTab'
import { OwnDeliveryGeralTab } from '@/components/admin/ownDelivery/OwnDeliveryGeralTab'
import { OwnDeliveryManualTab } from '@/components/admin/ownDelivery/OwnDeliveryManualTab'
import { OwnDeliveryProductsTab } from '@/components/admin/ownDelivery/OwnDeliveryProductsTab'
import { OwnDeliveryRatesTab } from '@/components/admin/ownDelivery/OwnDeliveryRatesTab'
import { OwnDeliveryVehiclesTab } from '@/components/admin/ownDelivery/OwnDeliveryVehiclesTab'
import {
  normalizeFlatRates,
  pricingModeLabel,
} from '@/components/admin/ownDelivery/ownDeliveryHelpers'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  getOwnDeliverySettings,
  listOwnVehicleCategories,
  upsertOwnDeliverySettings,
  type OwnDeliveryCepRange,
  type OwnDeliveryRate,
  type OwnVehicleCategory,
} from '@/services/admin/adminOwnDeliveryService'
import type { OwnPricingMode } from '@/types'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

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

export function AdminOwnDeliveryPage() {
  useDocumentTitle('Frete próprio | Admin FAL')
  const toast = useToast()
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
  const [showTech, setShowTech] = useState(false)
  const [categories, setCategories] = useState<OwnVehicleCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const reportOk = useCallback(
    (msg: string) => {
      setError(null)
      setOk(msg)
      toast.push(msg, 'success')
    },
    [toast],
  )

  const reportError = useCallback(
    (msg: string) => {
      setOk(null)
      setError(msg)
      toast.push(msg, 'error')
    },
    [toast],
  )

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [s, cats] = await Promise.all([
          getOwnDeliverySettings(),
          listOwnVehicleCategories().catch(() => [] as OwnVehicleCategory[]),
        ])
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
        setCategories(cats)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar frete próprio'
        setOk(null)
        setError(msg)
        toast.push(msg, 'error')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, [])

  async function onSubmitGeral(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const normalizedRates = normalizeFlatRates(rates, etaDaysMin, etaDaysMax)
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
      reportOk(
        `Salvo. Frete ${saved.enabled ? 'ativo' : 'desligado'} · cálculo ${pricingModeLabel(saved.pricingMode)}.`,
      )
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando frete próprio…" />

  return (
    <div className="space-y-4">
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

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {ok}
        </p>
      ) : null}

      {tab === 'geral' ? (
        <OwnDeliveryGeralTab
          values={{
            enabled,
            coverageLabel,
            cepRanges,
            rates,
            pricingMode,
            maxDistanceKm,
            etaDaysMin,
            etaDaysMax,
            showTech,
          }}
          saving={saving}
          onChange={(patch) => {
            if (patch.enabled !== undefined) setEnabled(patch.enabled)
            if (patch.coverageLabel !== undefined) setCoverageLabel(patch.coverageLabel)
            if (patch.cepRanges !== undefined) setCepRanges(patch.cepRanges)
            if (patch.rates !== undefined) setRates(patch.rates)
            if (patch.pricingMode !== undefined) setPricingMode(patch.pricingMode)
            if (patch.maxDistanceKm !== undefined) setMaxDistanceKm(patch.maxDistanceKm)
            if (patch.etaDaysMin !== undefined) setEtaDaysMin(patch.etaDaysMin)
            if (patch.etaDaysMax !== undefined) setEtaDaysMax(patch.etaDaysMax)
            if (patch.showTech !== undefined) setShowTech(patch.showTech)
          }}
          onSubmit={(e) => void onSubmitGeral(e)}
        />
      ) : null}

      {tab === 'veiculos' ? (
        <OwnDeliveryVehiclesTab
          onOk={reportOk}
          onError={reportError}
          onCategoriesChange={setCategories}
        />
      ) : null}

      {tab === 'tarifas' ? (
        <OwnDeliveryRatesTab onOk={reportOk} onError={reportError} />
      ) : null}

      {tab === 'produtos' ? (
        <OwnDeliveryProductsTab
          categories={categories}
          onOk={reportOk}
          onError={reportError}
        />
      ) : null}

      {tab === 'manual' ? <OwnDeliveryManualTab onError={reportError} /> : null}

      {tab === 'historico' ? <OwnDeliveryAuditTab onError={reportError} /> : null}
    </div>
  )
}
