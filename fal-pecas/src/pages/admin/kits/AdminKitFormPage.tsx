import { AdminProductImagesSection } from '@/components/admin/AdminProductImagesSection'
import { AdminProductKitCompatBanner } from '@/components/admin/AdminProductKitCompatBanner'
import { AdminProductKitSection } from '@/components/admin/AdminProductKitSection'
import { CategoryCascadeSelects } from '@/components/admin/CategoryCascadeSelects'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useUnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import { adminSyncKitListPrices } from '@/services/admin/adminKitPricingService'
import {
  adminGetProduct,
  adminReleaseProductToStore,
  adminUpsertProduct,
} from '@/services/admin/adminProductService'
import type { Category, KitPriceMode, Product } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
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

  const categoryId = catSubgrupoId || catGrupoId || catCategoriaId || ''

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
            <Link to="/admin/kits" className="text-fal-muted hover:underline">
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
                className="min-h-[72px] w-full rounded-[10px] border border-fal-line px-3 py-2"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Descrição</span>
              <textarea
                className="min-h-[100px] w-full rounded-[10px] border border-fal-line px-3 py-2"
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
            <span className="mb-1 block font-semibold">Preço do kit</span>
            <select
              className="w-full rounded-[10px] border border-fal-line px-3 py-2"
              value={kitPriceMode}
              onChange={(e) =>
                setKitPriceMode(e.target.value === 'manual' ? 'manual' : 'auto')
              }
            >
              <option value="auto">Automático (soma dos itens → Lista Base)</option>
              <option value="manual">Manual (lista Preços dos kits + espelho na Base)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Status</span>
            <select
              className="w-full rounded-[10px] border border-fal-line px-3 py-2"
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
            Salve o kit uma vez para liberar o link dos itens, a capa e o preço da composição.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar kit'}
          </Button>
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
          <Link to="/admin/kits/precos">
            <Button type="button" variant="light">
              Preços dos kits
            </Button>
          </Link>
        </div>
        {available ? (
          <p className="m-0 text-sm text-fal-success">Disponível na loja</p>
        ) : productId ? (
          <p className="m-0 text-sm text-fal-muted">Indisponível na loja até Liberar</p>
        ) : null}
      </form>

      {productId ? (
        <div className="space-y-4">
          <AdminProductKitCompatBanner
            kitProductId={productId}
            reviewRequired={kitCompatReviewRequired}
            onCleared={() => setKitCompatReviewRequired(false)}
          />
          <AdminProductKitSection kitProductId={productId} kitPriceMode={kitPriceMode} />
          <AdminProductImagesSection productId={productId} kitMode />
        </div>
      ) : null}
    </div>
  )
}
