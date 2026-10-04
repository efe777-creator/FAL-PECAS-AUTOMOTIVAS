import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { adminListBrands } from '@/services/admin/adminBrandService'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  adminDeleteImage,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddApplication,
  adminDeleteReference,
  adminGetProduct,
  adminListApplications,
  adminListReferences,
  adminRemoveApplication,
  adminUpsertProduct,
  adminUpsertReference,
} from '@/services/admin/adminProductService'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type {
  Category,
  Manufacturer,
  Product,
  ProductBrand,
  ProductImage,
  ProductReference,
  Supplier,
  VehicleModel,
  VehicleVersion,
} from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function AdminProductFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(isNew ? null : id)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [price, setPrice] = useState('0')
  const [promoPrice, setPromoPrice] = useState('')
  const [available, setAvailable] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [refs, setRefs] = useState<ProductReference[]>([])
  const [apps, setApps] = useState<unknown[]>([])
  const [images, setImages] = useState<ProductImage[]>([])

  const [refCode, setRefCode] = useState('')
  const [refType, setRefType] = useState('manufacturer')

  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [versionId, setVersionId] = useState('')

  useEffect(() => {
    void (async () => {
      const [cats, brs, sups, mfrs] = await Promise.all([
        adminListCategories(),
        adminListBrands(),
        adminListSuppliers(),
        adminListManufacturers(),
      ])
      setCategories(cats)
      setBrands(brs.filter((b) => b.status === 'active'))
      setSuppliers(sups.filter((s) => s.status === 'active'))
      setMakers(mfrs.filter((m) => m.status === 'active'))
    })()
  }, [])

  useEffect(() => {
    if (isNew || !id) return
    void (async () => {
      setLoading(true)
      try {
        const p = await adminGetProduct(id)
        if (!p) throw new Error('Produto não encontrado')
        setProductId(p.id)
        setName(p.name)
        setSku(p.sku)
        setStatus(p.status ?? 'draft')
        setCategoryId(p.categoryId ?? '')
        setBrandId(p.brandId ?? '')
        setSupplierId(p.supplierId ?? '')
        setPrice(String(p.price))
        setPromoPrice(p.promoPrice != null ? String(p.promoPrice) : '')
        setAvailable(Boolean(p.available))
        setWeightKg(p.weightKg != null ? String(p.weightKg) : '')
        setHeightCm(p.heightCm != null ? String(p.heightCm) : '')
        setWidthCm(p.widthCm != null ? String(p.widthCm) : '')
        setLengthCm(p.lengthCm != null ? String(p.lengthCm) : '')
        setShortDescription(p.shortDescription ?? '')
        setDescription(p.description ?? '')
        setRefs(await adminListReferences(p.id))
        setApps(await adminListApplications(p.id))
        setImages(await adminListImages(p.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isNew])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      return
    }
    void adminListModels(makerId).then(setModels)
  }, [makerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  async function saveGeneral(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = await adminUpsertProduct({
        id: productId ?? undefined,
        name,
        sku,
        status,
        categoryId: categoryId || null,
        brandId: brandId || null,
        supplierId: supplierId || null,
        price: Number(price),
        promoPrice: promoPrice.trim() ? Number(promoPrice) : null,
        isAvailable: available,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        widthCm: widthCm.trim() ? Number(widthCm) : null,
        lengthCm: lengthCm.trim() ? Number(lengthCm) : null,
        shortDescription,
        description,
      })
      setProductId(saved.id)
      if (isNew) navigate(`/admin/produtos/${saved.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando produto…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-fal-navy">
          {isNew ? 'Novo produto' : 'Editar produto'}
        </h1>
        <Link to="/admin/produtos" className="text-sm font-semibold text-fal-auth-link">
          Voltar à lista
        </Link>
      </div>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}

      <form onSubmit={saveGeneral} className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="font-extrabold text-fal-navy">Geral</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Categoria</span>
            <select className="w-full rounded-[10px] border border-fal-line px-3 py-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.parentId ? `↳ ${c.name}` : c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Fabricante</span>
            <select className="w-full rounded-[10px] border border-fal-line px-3 py-2" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Fornecedor</span>
            <select className="w-full rounded-[10px] border border-fal-line px-3 py-2" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Status</span>
            <select className="w-full rounded-[10px] border border-fal-line px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as Product['status'] & string)}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado (fora da loja)</option>
            </select>
          </label>
        </div>

        <h2 className="pt-2 font-extrabold text-fal-navy">Comercial</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Preço" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <Input label="Preço promocional" type="number" step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} />
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Disponível
          </label>
        </div>

        <h2 className="pt-2 font-extrabold text-fal-navy">Logística (opcional)</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Peso (kg)" type="number" step="0.001" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          <Input label="Altura (cm)" type="number" step="0.01" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          <Input label="Largura (cm)" type="number" step="0.01" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
          <Input label="Comprimento (cm)" type="number" step="0.01" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} />
        </div>

        <h2 className="pt-2 font-extrabold text-fal-navy">Descrição</h2>
        <Input label="Descrição curta" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Descrição completa</span>
          <textarea className="min-h-28 w-full rounded-[10px] border border-fal-line px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar produto'}</Button>
      </form>

      {productId ? (
        <>
          <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="font-extrabold text-fal-navy">Referências</h2>
            <div className="flex flex-wrap gap-2">
              <Input label="Código" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Tipo</span>
                <select className="rounded-[10px] border border-fal-line px-3 py-2" value={refType} onChange={(e) => setRefType(e.target.value)}>
                  <option value="manufacturer">manufacturer</option>
                  <option value="oem">oem</option>
                  <option value="internal">internal</option>
                  <option value="competitor">competitor</option>
                  <option value="other">other</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() =>
                    void adminUpsertReference({ productId, code: refCode, type: refType })
                      .then(async () => {
                        setRefCode('')
                        setRefs(await adminListReferences(productId))
                      })
                      .catch((e) => setError(String(e.message ?? e)))
                  }
                >
                  Adicionar
                </Button>
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {refs.map((r) => (
                <li key={r.id ?? r.code} className="flex justify-between border-b border-fal-line py-1">
                  <span>
                    <strong>{r.code}</strong> · {r.type} · {r.status}
                  </span>
                  {r.id ? (
                    <button type="button" className="text-fal-danger font-semibold" onClick={() => void adminDeleteReference(r.id!).then(async () => setRefs(await adminListReferences(productId)))}>
                      Remover
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="font-extrabold text-fal-navy">Aplicações</h2>
            <div className="grid gap-2 md:grid-cols-4">
              <select className="rounded-[10px] border border-fal-line px-3 py-2" value={makerId} onChange={(e) => setMakerId(e.target.value)}>
                <option value="">Montadora</option>
                {makers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="rounded-[10px] border border-fal-line px-3 py-2" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                <option value="">Modelo</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="rounded-[10px] border border-fal-line px-3 py-2" value={versionId} onChange={(e) => setVersionId(e.target.value)}>
                <option value="">Configuração</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {[v.year ?? 'ano?', v.engine ?? 'motor?', v.versionName ?? 'versão?'].join(' / ')}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={!versionId}
                onClick={() =>
                  void adminAddApplication(productId, versionId)
                    .then(async () => {
                      setVersionId('')
                      setApps(await adminListApplications(productId))
                    })
                    .catch((e) => setError(String(e.message ?? e)))
                }
              >
                Vincular
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {apps.map((a) => {
                const row = a as {
                  id: string
                  vehicle_versions?: {
                    year: number | null
                    engine: string | null
                    version_name: string | null
                    manufacturers?: { name: string } | { name: string }[]
                    models?: { name: string } | { name: string }[]
                  }
                }
                const vv = row.vehicle_versions
                const maker = Array.isArray(vv?.manufacturers) ? vv?.manufacturers[0]?.name : vv?.manufacturers?.name
                const model = Array.isArray(vv?.models) ? vv?.models[0]?.name : vv?.models?.name
                return (
                  <li key={row.id} className="flex justify-between border-b border-fal-line py-1">
                    <span>{[maker, model, vv?.year, vv?.engine, vv?.version_name].filter(Boolean).join(' ')}</span>
                    <button type="button" className="font-semibold text-fal-danger" onClick={() => void adminRemoveApplication(row.id).then(async () => setApps(await adminListApplications(productId)))}>
                      Remover
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="font-extrabold text-fal-navy">Imagens</h2>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void adminUploadImage(productId, file)
                  .then(async () => setImages(await adminListImages(productId)))
                  .catch((err) => setError(String(err.message ?? err)))
              }}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {images.map((img) => (
                <div key={img.id} className="rounded-[10px] border border-fal-line p-2">
                  <img src={img.publicUrl} alt={img.alt ?? ''} className="h-32 w-full object-contain" />
                  <div className="mt-2 flex gap-2 text-xs">
                    {img.isPrimary ? (
                      <span className="font-bold text-fal-success">Principal</span>
                    ) : (
                      <button type="button" className="font-semibold text-fal-auth-link" onClick={() => void adminSetPrimaryImage(productId, img.id).then(async () => setImages(await adminListImages(productId)))}>
                        Tornar principal
                      </button>
                    )}
                    <button type="button" className="font-semibold text-fal-danger" onClick={() => void adminDeleteImage(img).then(async () => setImages(await adminListImages(productId)))}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!images.length ? <p className="text-sm text-fal-muted">Sem imagem — produto marcado incompleto (cadastro permitido).</p> : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
