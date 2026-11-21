import { AdminProductApplicationsSection } from '@/components/admin/AdminProductApplicationsSection'
import { AdminProductImagesSection } from '@/components/admin/AdminProductImagesSection'
import { AdminProductKitCompatBanner } from '@/components/admin/AdminProductKitCompatBanner'
import { AdminProductKitSection } from '@/components/admin/AdminProductKitSection'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { CategoryCascadeSelects } from '@/components/admin/CategoryCascadeSelects'
import { Button, buttonClassName } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useUnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  adminSetKitPriceModeAndSync,
  adminSyncKitListPrices,
} from '@/services/admin/adminKitPricingService'
import {
  adminGetProduct,
  adminReleaseProductToStore,
  adminUpsertProduct,
} from '@/services/admin/adminProductService'
import type { Category, KitPriceMode, Product } from '@/types'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function AdminKitFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [dirty, setDirty] = useState(false)
  useUnsavedChangesBlocker(dirty, {
    message: 'Há alterações não salvas neste kit. Sair mesmo assim?',
  })

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(isNew ? null : id!)
  const [categories, setCategories] = useState<Category[]>([])

  const [name, setName] = useState('')
  const [commercialRef, setCommercialRef] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  const [kitPriceMode, setKitPriceMode] = useState<KitPriceMode>('auto')
  const [kitCompatReviewRequired, setKitCompatReviewRequired] = useState(false)
  const [catCategoriaId, setCatCategoriaId] = useState('')
  const [catGrupoId, setCatGrupoId] = useState('')
  const [catSubgrupoId, setCatSubgrupoId] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [available, setAvailable] = useState(false)
  const [formTab, setFormTab] = useState('geral')
  const [syncingPriceMode, setSyncingPriceMode] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [lengthCm, setLengthCm] = useState('')

  const categoryId = catSubgrupoId || catGrupoId || catCategoriaId || ''

  const formTabs = [
    { id: 'geral', label: 'Geral' },
    { id: 'precificacao', label: 'Precificação' },
    { id: 'composicao', label: 'Composição' },
    { id: 'midia', label: 'Mídia' },
    { id: 'aplicacoes', label: 'Aplicações' },
    { id: 'logistica', label: 'Logística' },
  ] as const

  useDocumentTitle(
    isNew
      ? 'Novo kit | Admin FAL'
      : name.trim()
        ? `${name.trim().slice(0, 48)} | Admin FAL`
        : 'Editar kit | Admin FAL',
  )

  useEffect(() => {
    void adminListCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const p = await adminGetProduct(id)
        if (cancelled) return
        if (!p) {
          setError('Kit não encontrado.')
          return
        }
        if (p.productKind !== 'kit') {
          navigate(`/admin/produtos/${p.id}`, { replace: true })
          return
        }
        setProductId(p.id)
        setName(p.name)
        setCommercialRef(p.commercialRef ?? '')
        setSku(p.sku ?? '')
        setStatus(p.status ?? 'draft')
        setKitPriceMode(p.kitPriceMode === 'manual' ? 'manual' : 'auto')
        setKitCompatReviewRequired(p.kitCompatReviewRequired === true)
        setShortDescription(p.shortDescription ?? '')
        setDescription(p.description ?? '')
        setAvailable(p.available === true)
        setWeightKg(p.weightKg != null ? String(p.weightKg) : '')
        setHeightCm(p.heightCm != null ? String(p.heightCm) : '')
        setWidthCm(p.widthCm != null ? String(p.widthCm) : '')
        setLengthCm(p.lengthCm != null ? String(p.lengthCm) : '')
        const leaf = p.categoryId ?? ''
        const path: string[] = []
        let cur: string | null = leaf || null
        const byId = new Map((await adminListCategories()).map((c) => [c.id, c]))
        while (cur) {
          path.unshift(cur)
          cur = byId.get(cur)?.parentId ?? null
        }
        setCatCategoriaId(path[0] ?? '')
        setCatGrupoId(path[1] ?? '')
        setCatSubgrupoId(path[2] ?? '')
        setCategories((prev) => {
          const ids = new Set(prev.map((c) => c.id))
          const extra = path
            .map((cid) => byId.get(cid))
            .filter((c): c is Category => Boolean(c) && !ids.has(c!.id))
          return extra.length ? [...prev, ...extra] : prev
        })
      } catch (e) {
        if (!cancelled) setError(toUserMessage(e, 'Falha ao carregar kit'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew, navigate])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (!name.trim()) throw new Error('Informe o nome do kit.')
      if (!commercialRef.trim() && !sku.trim()) {
        throw new Error('Informe o código referência (ou SKU).')
      }
      if (!categoryId) throw new Error('Informe a classificação (categoria).')

      const parseOptional = (v: string) => {
        const t = v.trim()
        if (!t) return null
        const n = Number(t.replace(',', '.'))
        return Number.isFinite(n) ? n : null
      }

      const saved = await adminUpsertProduct({
        id: productId ?? undefined,
        name: name.trim(),
        commercialRef: commercialRef.trim(),
        sku: sku.trim() || undefined,
        status,
        productKind: 'kit',
        kitPriceMode,
        categoryId,
        price: 0,
        promoPrice: null,
        isAvailable: available,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        weightKg: parseOptional(weightKg),
        heightCm: parseOptional(heightCm),
        widthCm: parseOptional(widthCm),
        lengthCm: parseOptional(lengthCm),
        weightOrigin: weightKg.trim() ? 'manual' : undefined,
        heightOrigin: heightCm.trim() ? 'manual' : undefined,
        widthOrigin: widthCm.trim() ? 'manual' : undefined,
        lengthOrigin: lengthCm.trim() ? 'manual' : undefined,
        syncBasePromoLists: isNew,
      })
      setProductId(saved.id)

      await adminSyncKitListPrices({
        kitProductId: saved.id,
        kitPriceMode,
        changedBy: user?.id ?? null,
      })

      setDirty(false)
      toast.push('Kit salvo.', 'success')
      if (isNew) navigate(`/admin/kits/${saved.id}`, { replace: true })
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao salvar kit')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function applyKitPriceMode() {
    if (!productId) {
      toast.push('Salve o kit antes de sincronizar o modo de preço.', 'error')
      return
    }
    setSyncingPriceMode(true)
    try {
      await adminSetKitPriceModeAndSync({
        kitProductId: productId,
        kitPriceMode,
        changedBy: user?.id ?? null,
      })
      setDirty(false)
      toast.push(
        kitPriceMode === 'manual'
          ? 'Modo manual aplicado — defina o preço na aba ou em Preços dos kits.'
          : 'Modo automático aplicado — preço = soma dos itens.',
        'success',
      )
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao sincronizar modo de preço'), 'error')
    } finally {
      setSyncingPriceMode(false)
    }
  }

  async function onRelease() {
    if (!productId) return
    const publishIfNeeded = status !== 'published'
    const confirmed = await confirmDialog({
      title: 'Liberar kit na loja?',
      message:
        'Exige composição válida, preço e checklist. Preferível revisar PVC se houver alerta.',
      confirmLabel: 'Liberar na loja',
    })
    if (!confirmed) return
    setReleasing(true)
    try {
      const result = await adminReleaseProductToStore({
        productId,
        publishIfNeeded,
      })
      if (!result.ok) {
        toast.push(result.reason, 'error')
        return
      }
      setAvailable(true)
      setStatus('published')
      toast.push(
        result.publishedNow ? 'Kit publicado e liberado.' : 'Kit liberado na loja.',
        'success',
      )
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao liberar'), 'error')
    } finally {
      setReleasing(false)
    }
  }

  if (loading) return <Loading label="Carregando kit…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm">
            <Link to="/admin/kits" className="font-semibold text-fal-fg hover:underline">
              ← Kits
            </Link>
          </p>
          <h1 className="mt-1 mb-0 text-2xl font-extrabold text-fal-fg">
            {isNew ? 'Novo kit' : 'Editar kit'}
          </h1>
          <p className="mt-1 mb-0 text-sm text-fal-muted">
            Automático: soma dos itens na Lista Base. Manual: grava na lista{' '}
            <Link to="/admin/kits/precos" className="font-semibold underline">
              Preços dos kits
            </Link>{' '}
            e espelha na Base.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}

      <AdminTabs
        aria-label="Abas do kit"
        items={formTabs.map((t) => ({ id: t.id, label: t.label, onSelect: () => setFormTab(t.id) }))}
        activeId={formTab}
      />

      {formTab === 'geral' ? (
        <form
          onSubmit={onSave}
          onChange={() => setDirty(true)}
          className="space-y-4 rounded-[14px] border border-fal-line bg-fal-surface p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Código referência"
              value={commercialRef}
              onChange={(e) => setCommercialRef(e.target.value)}
              required
            />
            <Input
              label="SKU interno (opcional)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              hint="Se vazio, usa o código referência."
            />
            <div className="md:col-span-2">
              <Input
                label="Nome do kit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Descrição curta</span>
                <textarea
                  className="fal-field min-h-[72px] w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-fal-fg outline-none focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Descrição</span>
                <textarea
                  className="fal-field min-h-[100px] w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-fal-fg outline-none focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
            <fieldset className="text-sm md:col-span-2">
              <legend className="mb-1 block font-semibold text-fal-fg">Classificação</legend>
              <CategoryCascadeSelects
                categories={categories}
                includeArchived
                value={{
                  categoriaId: catCategoriaId,
                  grupoId: catGrupoId,
                  subgrupoId: catSubgrupoId,
                }}
                onChange={(next) => {
                  setCatCategoriaId(next.categoriaId)
                  setCatGrupoId(next.grupoId)
                  setCatSubgrupoId(next.subgrupoId)
                }}
              />
            </fieldset>
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Status</span>
              <select
                className="w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-fal-fg"
                value={status}
                onChange={(e) => setStatus(e.target.value as Product['status'] & string)}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
              {status === 'published' ? (
                <p className="mt-1 m-0 text-xs text-fal-muted">
                  Publicar exige checklist (composição + revisão PVC). Preferível:{' '}
                  <strong>Liberar na loja</strong>.
                </p>
              ) : null}
            </label>
          </div>

          {!productId ? (
            <p className="m-0 rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-xs text-fal-muted">
              Salve o kit uma vez para liberar composição, mídia, aplicações PVC e precificação.
            </p>
          ) : null}

          <ActionBar
            saving={saving}
            releasing={releasing}
            available={available}
            productId={productId}
            onRelease={onRelease}
          />
        </form>
      ) : null}

      {formTab === 'precificacao' ? (
        <motionBottom className="space-y-4">
          <p className="m-0 text-sm text-fal-muted">
            Hub{' '}
            <Link to="/admin/kits/precos" className="font-semibold underline">
              Preços dos kits
            </Link>{' '}
            permanece para edição em massa. Aqui você define o modo e sincroniza listas com um clique
            explícito.
          </p>
          <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Modo de preço do kit</span>
              <select
                className="w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-fal-fg"
                value={kitPriceMode}
                disabled={saving || syncingPriceMode}
                onChange={(e) => {
                  setKitPriceMode(e.target.value === 'manual' ? 'manual' : 'auto')
                  setDirty(true)
                }}
              >
                <option value="auto">Automático (soma dos itens → Lista Base)</option>
                <option value="manual">Manual (lista Preços dos kits + espelho na Base)</option>
              </select>
            </label>
            <motionBottom className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                disabled={!productId || syncingPriceMode}
                onClick={() => void applyKitPriceMode()}
              >
                {syncingPriceMode ? 'Sincronizando…' : 'Aplicar modo e sincronizar listas'}
              </Button>
            </motionBottom>
          </div>
          {productId ? (
            <AdminProductKitSection
              kitProductId={productId}
              kitPriceMode={kitPriceMode}
              surfacePart="pricing"
            />
          ) : (
            <p className="text-sm text-fal-muted">Salve o kit na aba Geral primeiro.</p>
          )}
          <ActionBar
            saving={saving}
            releasing={releasing}
            available={available}
            productId={productId}
            onRelease={onRelease}
            showSave={false}
            showPricesLink
          />
        </motionBottom>
      ) : null}

      {formTab === 'composicao' && productId ? (
        <motionBottom className="space-y-4">
          <AdminProductKitCompatBanner
            kitProductId={productId}
            reviewRequired={kitCompatReviewRequired}
            onCleared={() => setKitCompatReviewRequired(false)}
          />
          <AdminProductKitSection
            kitProductId={productId}
            kitPriceMode={kitPriceMode}
            surfacePart="bom"
          />
          <ActionBar
            saving={saving}
            releasing={releasing}
            available={available}
            productId={productId}
            onRelease={onRelease}
            showSave={false}
          />
        </motionBottom>
      ) : null}
      {formTab === 'composicao' && !productId ? (
        <p className="text-sm text-fal-muted">Salve o kit na aba Geral para montar a composição.</p>
      ) : null}

      {formTab === 'midia' && productId ? (
        <motionBottom className="space-y-4">
          <AdminProductImagesSection productId={productId} kitMode />
          <ActionBar
            saving={saving}
            releasing={releasing}
            available={available}
            productId={productId}
            onRelease={onRelease}
            showSave={false}
          />
        </motionBottom>
      ) : null}
      {formTab === 'midia' && !productId ? (
        <p className="text-sm text-fal-muted">Salve o kit na aba Geral para enviar imagens.</p>
      ) : null}

      {formTab === 'aplicacoes' && productId ? (
        <motionBottom className="space-y-4">
          <AdminProductApplicationsSection productId={productId} />
          <ActionBar
            saving={saving}
            releasing={releasing}
            available={available}
            productId={productId}
            onRelease={onRelease}
            showSave={false}
          />
        </motionBottom>
      ) : null}
      {formTab === 'aplicacoes' && !productId ? (
        <p className="text-sm text-fal-muted">Salve o kit na aba Geral para vincular aplicações PVC.</p>
      ) : null}

      {formTab === 'logistica' ? (
        <form
          onSubmit={onSave}
          onChange={() => setDirty(true)}
          className="space-y-4 rounded-[14px] border border-fal-line bg-fal-surface p-4"
        >
          <p className="m-0 text-sm text-fal-muted">
            Medidas usadas em frete e logística (mesmo contrato do cadastro de produto).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Peso (kg)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            <Input label="Altura (cm)" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            <Input label="Largura (cm)" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
            <Input
              label="Comprimento (cm)"
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
            />
          </div>
          <ActionBar
            saving={saving}
            releasing={releasing}
            available={available}
            productId={productId}
            onRelease={onRelease}
          />
        </form>
      ) : null}
    </div>
  )
}

function motionBottom({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={className}>{children}</div>
}

function ActionBar({
  saving,
  releasing,
  available,
  productId,
  onRelease,
  showSave = true,
  showPricesLink = false,
}: {
  saving: boolean
  releasing: boolean
  available: boolean
  productId: string | null
  onRelease: () => void | Promise<void>
  showSave?: boolean
  /** Só na aba Precificação — evita repetir o mesmo CTA em todas as abas. */
  showPricesLink?: boolean
}) {
  return (
    <motionBottom>
      <div className="flex flex-wrap gap-2">
        {showSave ? (
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar kit'}
          </Button>
        ) : null}
        {productId ? (
          <Button
            type="button"
            variant="outline"
            disabled={releasing || available}
            onClick={() => void onRelease()}
          >
            {releasing ? 'Liberando…' : 'Liberar na loja'}
          </Button>
        ) : null}
        {showPricesLink ? (
          <Link to="/admin/kits/precos" className={buttonClassName({ variant: 'light' })}>
            Preços dos kits
          </Link>
        ) : null}
      </div>
      {available ? (
        <p className="m-0 text-sm text-fal-success">Disponível na loja</p>
      ) : productId ? (
        <p className="m-0 text-sm text-fal-muted">Indisponível na loja até Liberar</p>
      ) : null}
    </motionBottom>
  )
}
