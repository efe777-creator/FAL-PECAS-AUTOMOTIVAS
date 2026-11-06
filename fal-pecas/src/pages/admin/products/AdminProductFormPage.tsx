import { AdminProductRelatedSection } from '@/components/admin/AdminProductRelatedSection'
import { CategoryCascadeSelects } from '@/components/admin/CategoryCascadeSelects'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
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
  adminAddApplicationsBulk,
  adminDeleteReference,
  adminEvaluateReleaseChecklist,
  adminGetProduct,
  adminListApplications,
  adminListReferences,
  adminReleaseProductToStore,
  adminRemoveApplication,
  adminUpdateApplicationYears,
  adminListProductMeasureHistory,
  adminUpsertProduct,
  adminUpsertReference,
  type ProductMeasureHistoryRow,
} from '@/services/admin/adminProductService'
import {
  adminClearPriceOverride,
  adminGetActivePriceOverride,
  adminUpsertPriceOverride,
} from '@/services/admin/adminPriceOverrideService'
import {
  PRICE_LIST_BASE_ID,
  PRICE_LIST_PROMO_ID,
  adminListPriceLists,
  adminListProductListPrices,
  type ProductListPriceRow,
} from '@/services/admin/adminPriceListService'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import {
  listOwnVehicleCategories,
  type OwnVehicleCategory,
} from '@/services/admin/adminOwnDeliveryService'
import { useAuth } from '@/contexts/AuthContext'
import { datetimeLocalToIso, isoToDatetimeLocal } from '@/lib/datetime'
import { entityStatusLabel, productReferenceTypeLabel } from '@/lib/adminLabels'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { formatVehicleAppYear } from '@/lib/vehicleAppYear'
import {
  POSICAO_ATOMS,
  composePosicao,
  parsePosicaoAtoms,
  type PosicaoAtom,
} from '@/lib/productPosicaoLado'
import type {
  Category,
  Manufacturer,
  MeasureOrigin,
  Product,
  ProductBrand,
  ProductImage,
  ProductReference,
  Supplier,
  VehicleModel,
  VehicleVersion,
} from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function AdminProductFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  /** Flag simples: qualquer edição no formulário "Geral" marca como não salvo. */
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(isNew ? null : id)

  const [name, setName] = useState('')
  const [commercialRef, setCommercialRef] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  /** Hierarquia = planilha: Categoria → Grupo → Subgrupo (folha em products.category_id). */
  const [catCategoriaId, setCatCategoriaId] = useState('')
  const [catGrupoId, setCatGrupoId] = useState('')
  const [catSubgrupoId, setCatSubgrupoId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [supplierId, setSupplierId] = useState('')

  const categoryId = catSubgrupoId || catGrupoId || catCategoriaId || ''
  /** Preços nas listas — somente leitura (exceto preço inicial Base no novo produto). */
  const [listRows, setListRows] = useState<ProductListPriceRow[]>([])
  /** Espelho products.price / promo_price (não editáveis na UI após criação). */
  const [mirrorPrice, setMirrorPrice] = useState(0)
  const [mirrorPromo, setMirrorPromo] = useState<number | null>(null)
  /** Só no cadastro novo: semente da Lista Base. */
  const [initialBasePrice, setInitialBasePrice] = useState('')
  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [overrideAmount, setOverrideAmount] = useState('')
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideValidFrom, setOverrideValidFrom] = useState('')
  const [overrideValidUntil, setOverrideValidUntil] = useState('')
  const [available, setAvailable] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [weightOrigin, setWeightOrigin] = useState<MeasureOrigin>('global')
  const [heightOrigin, setHeightOrigin] = useState<MeasureOrigin>('global')
  const [widthOrigin, setWidthOrigin] = useState<MeasureOrigin>('global')
  const [lengthOrigin, setLengthOrigin] = useState<MeasureOrigin>('global')
  const [polUnit, setPolUnit] = useState('')
  const [logisticPorte, setLogisticPorte] = useState<'' | 'pequeno' | 'medio' | 'grande'>('')
  const [vehicleMinCode, setVehicleMinCode] = useState('')
  const [compatibleCodes, setCompatibleCodes] = useState('motorcycle,car')
  const [ownDeliveryAllowed, setOwnDeliveryAllowed] = useState(true)
  const [polOrigin, setPolOrigin] = useState<MeasureOrigin>('global')
  const [measureHistory, setMeasureHistory] = useState<ProductMeasureHistoryRow[]>([])
  const [measureHistoryErr, setMeasureHistoryErr] = useState<string | null>(null)
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [posicaoAtoms, setPosicaoAtoms] = useState<PosicaoAtom[]>([])
  const [lado, setLado] = useState<Product['lado']>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [ownVehicles, setOwnVehicles] = useState<OwnVehicleCategory[]>([])
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
  /** Vazio = todas as motorizações */
  const [engineFilter, setEngineFilter] = useState('')
  /** Vazio = todas as versões (com o filtro de motor) */
  const [versionNameFilter, setVersionNameFilter] = useState('')
  const [appYearStart, setAppYearStart] = useState('')
  const [appYearEnd, setAppYearEnd] = useState('')
  const [appBusy, setAppBusy] = useState(false)
  const [editingAppId, setEditingAppId] = useState<string | null>(null)
  const [editYearStart, setEditYearStart] = useState('')
  const [editYearEnd, setEditYearEnd] = useState('')

  useEffect(() => {
    void (async () => {
      const [cats, brs, sups, mfrs, lists, vehicles] = await Promise.all([
        adminListCategories(),
        adminListBrands(),
        adminListSuppliers(),
        adminListManufacturers(),
        adminListPriceLists(),
        listOwnVehicleCategories().catch(() => [] as OwnVehicleCategory[]),
      ])
      // Só published na lista; preserva nós extras (ex. arquivados do produto em edição).
      setCategories((prev) => {
        const published = cats.filter((c) => c.status === 'published')
        const extras = prev.filter(
          (c) => c.status !== 'published' && !published.some((p) => p.id === c.id),
        )
        return [...published, ...extras]
      })
      setOwnVehicles(vehicles.filter((v) => v.active))
      setBrands(brs.filter((b) => b.status === 'active'))
      setSuppliers(sups.filter((s) => s.status === 'active'))
      setMakers(mfrs.filter((m) => m.status === 'active'))
      if (isNew) {
        setListRows(
          lists.map((l) => ({
            priceListId: l.id,
            listName: l.name,
            listSlug: l.slug,
            status: l.status,
            priority: l.priority,
            isDefault: l.isDefault,
            itemId: null,
            price: null,
          })),
        )
      }
    })()
  }, [isNew])

  useEffect(() => {
    if (!productId) {
      setMeasureHistory([])
      return
    }
    void (async () => {
      try {
        setMeasureHistory(await adminListProductMeasureHistory(productId))
        setMeasureHistoryErr(null)
      } catch (e) {
        setMeasureHistory([])
        setMeasureHistoryErr(e instanceof Error ? e.message : 'Falha ao carregar histórico')
      }
    })()
  }, [productId])

  useEffect(() => {
    if (isNew || !id) return
    void (async () => {
      setLoading(true)
      try {
        const p = await adminGetProduct(id)
        if (!p) throw new Error('Produto não encontrado')
        setProductId(p.id)
        setName(p.name)
        setCommercialRef(p.commercialRef ?? p.sku)
        setSku(p.sku)
        setStatus(p.status ?? 'draft')
        {
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
          // Garante nós do produto (mesmo arquivados) para edição não “perder” a seleção.
          setCategories((prev) => {
            const ids = new Set(prev.map((c) => c.id))
            const extra = path
              .map((id) => byId.get(id))
              .filter((c): c is Category => Boolean(c) && !ids.has(c!.id))
            return extra.length ? [...prev, ...extra] : prev
          })
        }
        setBrandId(p.brandId ?? '')
        setSupplierId(p.supplierId ?? '')
        setAvailable(Boolean(p.available))
        setMirrorPrice(p.price)
        setMirrorPromo(p.promoPrice ?? null)
        setWeightKg(p.weightKg != null ? String(p.weightKg) : '')
        setHeightCm(p.heightCm != null ? String(p.heightCm) : '')
        setWidthCm(p.widthCm != null ? String(p.widthCm) : '')
        setLengthCm(p.lengthCm != null ? String(p.lengthCm) : '')
        setWeightOrigin(p.weightOrigin ?? (p.weightKg != null ? 'manual' : 'global'))
        setHeightOrigin(p.heightOrigin ?? (p.heightCm != null ? 'manual' : 'global'))
        setWidthOrigin(p.widthOrigin ?? (p.widthCm != null ? 'manual' : 'global'))
        setLengthOrigin(p.lengthOrigin ?? (p.lengthCm != null ? 'manual' : 'global'))
        setPolUnit(p.polUnit != null ? String(p.polUnit) : '')
        setLogisticPorte((p.logisticPorte as '' | 'pequeno' | 'medio' | 'grande') || '')
        setVehicleMinCode(p.vehicleMinCode ?? '')
        setCompatibleCodes((p.compatibleVehicleCodes ?? ['motorcycle', 'car']).join(','))
        setOwnDeliveryAllowed(p.ownDeliveryAllowed !== false)
        setPolOrigin(p.polOrigin ?? (p.polUnit != null ? 'manual' : 'global'))
        setShortDescription(p.shortDescription ?? '')
        setDescription(p.description ?? '')
        setPosicaoAtoms(parsePosicaoAtoms(p.posicao))
        setLado(p.lado ?? null)

        const [rows, ov] = await Promise.all([
          adminListProductListPrices(p.id),
          adminGetActivePriceOverride(p.id),
        ])
        setListRows(rows)

        if (ov) {
          setOverrideEnabled(true)
          setOverrideAmount(formatMoneyInput(ov.amount))
          setOverrideNote(ov.note ?? '')
          setOverrideValidFrom(isoToDatetimeLocal(ov.validFrom))
          setOverrideValidUntil(isoToDatetimeLocal(ov.validUntil))
        } else {
          setOverrideEnabled(false)
          setOverrideAmount('')
          setOverrideNote('')
          setOverrideValidFrom('')
          setOverrideValidUntil('')
        }
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
      setModelId('')
      return
    }
    void adminListModels(makerId).then(setModels)
  }, [makerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      setEngineFilter('')
      setVersionNameFilter('')
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  const engineOptions = useMemo(() => {
    const set = new Set<string>()
    for (const v of versions) {
      const e = (v.engine ?? '').trim()
      if (e) set.add(e)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [versions])

  const versionNameOptions = useMemo(() => {
    const filtered = engineFilter
      ? versions.filter((v) => (v.engine ?? '').trim() === engineFilter)
      : versions
    const set = new Set<string>()
    for (const v of filtered) {
      const name = (v.versionName ?? '').trim()
      if (name) set.add(name)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [versions, engineFilter])

  const matchingVersions = useMemo(() => {
    return versions.filter((v) => {
      if (engineFilter && (v.engine ?? '').trim() !== engineFilter) return false
      if (versionNameFilter && (v.versionName ?? '').trim() !== versionNameFilter) return false
      return true
    })
  }, [versions, engineFilter, versionNameFilter])

  function parseAppYear(raw: string): number | null {
    const t = raw.trim()
    if (!t) return null
    const n = Number(t)
    if (!Number.isInteger(n) || n < 1950 || n > 2100) return null
    return n
  }

  async function onLinkApplications() {
    if (!productId || !modelId) return
    setError(null)
    setMessage(null)
    if (matchingVersions.length === 0) {
      setError('Nenhuma configuração de veículo bate com os filtros. Ajuste motorização/versão.')
      return
    }
    const ys = parseAppYear(appYearStart)
    const ye = parseAppYear(appYearEnd)
    if (appYearStart.trim() && ys == null) {
      setError('Ano início inválido')
      return
    }
    if (appYearEnd.trim() && ye == null) {
      setError('Ano fim inválido')
      return
    }
    if (ys != null && ye != null && ye < ys) {
      setError('Ano fim menor que ano início')
      return
    }
    setAppBusy(true)
    try {
      const n = await adminAddApplicationsBulk(
        productId,
        matchingVersions.map((v) => v.id),
        { yearStart: ys, yearEnd: ye },
      )
      setApps(await adminListApplications(productId))
      setMessage(
        n === 1
          ? '1 aplicação vinculada.'
          : `${n} aplicações vinculadas (motorização/versão conforme filtros).`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao vincular aplicações')
    } finally {
      setAppBusy(false)
    }
  }

  async function onLiberarNaLoja() {
    if (!productId) return
    const publishIfNeeded = status !== 'published'
    setReleasing(true)
    setError(null)
    setMessage(null)
    try {
      const pre = await adminEvaluateReleaseChecklist(productId, { publishIfNeeded })
      if (!pre) {
        setError('Produto não encontrado')
        return
      }
      const soft =
        pre.softWarnings.length > 0
          ? `\nAvisos: ${pre.softWarnings.map((w) => w.label).join(', ')}`
          : ''
      if (!pre.canRelease) {
        setError(`Checklist de liberação: ${pre.summary}`)
        return
      }
      const { confirmed } = await confirmDialog({
        title: 'Liberar na loja?',
        message:
          `• Hard: nome, código ref., categoria, preço resolvido > 0\n` +
          `• ${publishIfNeeded ? 'Publicar neste passo' : 'Já published'}\n` +
          `• Marcar is_available${soft}`,
        confirmLabel: 'Liberar na loja',
      })
      if (!confirmed) return
      const result = await adminReleaseProductToStore({
        productId,
        publishIfNeeded,
      })
      if (!result.ok) {
        setError(result.reason)
        return
      }
      setAvailable(true)
      setStatus('published')
      const warnMsg =
        result.checklist.softWarnings.length > 0
          ? ` Avisos: ${result.checklist.softWarnings.map((w) => w.label).join(', ')}.`
          : ''
      setMessage(
        (result.publishedNow
          ? 'Produto publicado e liberado na loja.'
          : 'Produto liberado na loja.') + warnMsg,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao liberar na loja')
    } finally {
      setReleasing(false)
    }
  }

  async function saveGeneral(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      let priceNum: number
      let promoNum: number | null = null

      if (isNew) {
        const baseParsed = parseMoneyBr(initialBasePrice)
        if (baseParsed == null || baseParsed < 0) {
          throw new Error('Informe o preço inicial da Lista Base.')
        }
        priceNum = baseParsed
        promoNum = null
      } else {
        const baseFromList = listRows.find((r) => r.priceListId === PRICE_LIST_BASE_ID)?.price
        const promoFromList = listRows.find((r) => r.priceListId === PRICE_LIST_PROMO_ID)?.price
        priceNum = baseFromList ?? mirrorPrice
        promoNum = promoFromList ?? mirrorPromo
      }

      if (overrideEnabled) {
        const overrideNum = parseMoneyBr(overrideAmount)
        if (overrideNum == null || overrideNum < 0) {
          throw new Error('Informe o valor do preço avulso.')
        }
      }

      const saved = await adminUpsertProduct({
        id: productId ?? undefined,
        name,
        commercialRef: commercialRef.trim(),
        sku: sku.trim() || undefined,
        status,
        categoryId: categoryId || null,
        brandId: brandId || null,
        supplierId: supplierId || null,
        price: priceNum,
        promoPrice: promoNum,
        isAvailable: available,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        widthCm: widthCm.trim() ? Number(widthCm) : null,
        lengthCm: lengthCm.trim() ? Number(lengthCm) : null,
        weightOrigin,
        heightOrigin,
        widthOrigin,
        lengthOrigin,
        polUnit: polUnit.trim() ? Number(polUnit) : null,
        logisticPorte: logisticPorte || null,
        vehicleMinCode: vehicleMinCode.trim() || null,
        compatibleVehicleCodes: compatibleCodes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        ownDeliveryAllowed,
        polOrigin,
        logisticProfileOrigin: 'manual',
        shortDescription,
        description,
        posicao: composePosicao(posicaoAtoms),
        lado: lado || null,
        // Novo: semente Base via ensure. Edição: não mexer nas listas aqui.
        syncBasePromoLists: isNew,
      })
      setProductId(saved.id)
      setMirrorPrice(saved.price)
      setMirrorPromo(saved.promoPrice ?? null)

      if (overrideEnabled) {
        const overrideNum = parseMoneyBr(overrideAmount)!
        await adminUpsertPriceOverride({
          productId: saved.id,
          amount: overrideNum,
          note: overrideNote,
          status: 'active',
          validFrom: datetimeLocalToIso(overrideValidFrom),
          validUntil: datetimeLocalToIso(overrideValidUntil),
          changedBy: user?.id ?? null,
        })
      } else {
        await adminClearPriceOverride(saved.id, user?.id ?? null)
      }

      if (!isNew) {
        setListRows(await adminListProductListPrices(saved.id))
      }

      setDirty(false)
      toast.push('Produto salvo com sucesso.', 'success')

      if (isNew) navigate(`/admin/produtos/${saved.id}`, { replace: true })
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao salvar')
      setError(msg)
      toast.push(msg, 'error')
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

      <form
        onSubmit={saveGeneral}
        onChange={() => setDirty(true)}
        className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4"
      >
        <h2 className="font-extrabold text-fal-navy">Geral</h2>
        {dirty ? (
          <p className="m-0 text-xs font-semibold text-fal-yellow-dark">
            Há alterações não salvas.
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Código referência"
            value={commercialRef}
            onChange={(e) => {
              setCommercialRef(e.target.value)
              if (isNew && !sku.trim()) setSku(e.target.value)
            }}
            required
            hint="Código comercial exibido na loja e no admin."
          />
          <Input
            label="SKU FAL"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            hint="Identificador técnico (import/matching). Se vazio, usa o Código referência."
          />
          <fieldset className="text-sm md:col-span-2">
            <legend className="mb-1 block font-semibold text-fal-navy">Classificação</legend>
            <p className="mb-2 text-xs text-fal-muted">
              Mesma hierarquia da planilha: Categoria → Grupo → Subgrupo. Cadastre em Admin →
              Categorias antes de importar ou vincular aqui.
            </p>
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
          <fieldset className="text-sm md:col-span-2">
            <legend className="mb-1 block font-semibold text-fal-navy">Posição</legend>
            <p className="mb-2 text-xs text-fal-muted">
              Pode combinar (ex.: Dianteira + Inferior). Na planilha: DIANT, TRAS, SUPERIOR,
              INFERIOR ou “DIANT INFERIOR”.
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ['DIANTEIRA', 'Dianteira (DIANT)'],
                  ['TRASEIRA', 'Traseira (TRAS)'],
                  ['SUPERIOR', 'Superior'],
                  ['INFERIOR', 'Inferior'],
                ] as const
              ).map(([atom, label]) => {
                const checked = posicaoAtoms.includes(atom)
                return (
                  <label key={atom} className="inline-flex items-center gap-2 font-normal">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setPosicaoAtoms((prev) => {
                          const next = checked
                            ? prev.filter((a) => a !== atom)
                            : [...prev, atom]
                          return POSICAO_ATOMS.filter((a) => next.includes(a))
                        })
                      }}
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Lado</span>
            <select
              className="w-full rounded-[10px] border border-fal-line px-3 py-2"
              value={lado ?? ''}
              onChange={(e) => setLado((e.target.value || null) as Product['lado'])}
            >
              <option value="">—</option>
              <option value="ESQUERDO">Esquerdo</option>
              <option value="DIREITO">Direito</option>
              <option value="AMBOS">Ambos</option>
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

        <h2 className="pt-2 font-extrabold text-fal-navy">Precificação</h2>
        <p className="m-0 text-sm text-fal-muted">
          Preços de lista são só leitura aqui. Para alterar, use{' '}
          <Link to="/admin/precos" className="font-semibold text-fal-navy underline">
            Listas de preços
          </Link>
          . Neste formulário você pode apenas <strong>ativar ou editar o preço avulso</strong> (exceção).
        </p>
        <div className="rounded-[12px] border border-fal-line bg-white p-3">
          <p className="m-0 text-sm font-extrabold text-fal-navy">Disponibilidade na loja</p>
          <p className="mt-1 text-xs text-fal-muted">
            Importação de custo/preço não libera o produto. Use{' '}
            <strong>Liberar na loja</strong> quando status, preço e confirmação estiverem ok.
          </p>
          <p className="mt-2 text-sm">
            Situação:{' '}
            <strong className={available ? 'text-green-700' : 'text-fal-muted'}>
              {available ? 'Disponível' : 'Indisponível'}
            </strong>
            {status !== 'published' ? (
              <span className="ml-2 text-xs text-fal-yellow-dark">(status ≠ publicado)</span>
            ) : null}
          </p>
          {!isNew && productId ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={releasing || available}
                onClick={() => void onLiberarNaLoja()}
              >
                {releasing ? 'Liberando…' : 'Liberar na loja'}
              </Button>
              {available ? (
                <Button
                  type="button"
                  variant="light"
                  disabled={saving}
                  onClick={() => {
                    setAvailable(false)
                    setDirty(true)
                  }}
                >
                  Marcar indisponível (salvar depois)
                </Button>
              ) : null}
            </div>
          ) : (
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              Disponível na loja (após criar, use Liberar com checklist)
            </label>
          )}
        </div>
        {message ? <p className="m-0 text-sm font-semibold text-fal-navy">{message}</p> : null}

        {isNew ? (
          <Input
            label="Preço inicial (Lista Base)"
            inputMode="decimal"
            placeholder="0,00"
            value={initialBasePrice}
            onChange={(e) => setInitialBasePrice(e.target.value)}
            hint="Após criar o produto, alterações de preço de lista só em /admin/precos."
            required
          />
        ) : null}

        <div className="space-y-2 rounded-[12px] border border-fal-line bg-fal-bg/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-extrabold text-fal-navy">Preços nas listas</h3>
            <Link to="/admin/precos" className="text-xs font-semibold text-fal-navy underline">
              Gerenciar em Listas de preços
            </Link>
          </div>
          {listRows.length === 0 ? (
            <p className="m-0 text-sm text-fal-muted">Nenhuma lista cadastrada.</p>
          ) : (
            <ul className="m-0 list-none space-y-1.5 p-0">
              {listRows.map((row) => (
                <li
                  key={row.priceListId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-fal-navy">{row.listName}</span>
                    <span className="ml-2 text-xs text-fal-muted">
                      {row.status}
                      {row.isDefault ? ' · padrão' : ''}
                      {row.priceListId === PRICE_LIST_BASE_ID ? ' · Base' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong>
                      {row.price != null ? formatMoney(row.price) : '—'}
                    </strong>
                    <Link
                      to={`/admin/precos/${row.priceListId}`}
                      className="text-xs font-semibold text-fal-auth-link underline"
                    >
                      Abrir lista
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3 rounded-[12px] border border-fal-yellow/60 bg-[#fffdf3] p-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => setOverrideEnabled(e.target.checked)}
            />
            Ativar preço avulso
          </label>
          <p className="m-0 text-sm text-fal-muted md:col-span-2">
            Enquanto ativo, o avulso sobrescreve qualquer lista na vitrine e no checkout.
          </p>
          {overrideEnabled ? (
            <>
              <Input
                label="Valor avulso"
                inputMode="decimal"
                placeholder="0,00"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                required
              />
              <Input
                label="Motivo / nota"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Ex.: acordo comercial pontual"
              />
              <Input
                label="Válido de (opcional)"
                type="datetime-local"
                value={overrideValidFrom}
                onChange={(e) => setOverrideValidFrom(e.target.value)}
              />
              <Input
                label="Válido até (opcional)"
                type="datetime-local"
                value={overrideValidUntil}
                onChange={(e) => setOverrideValidUntil(e.target.value)}
              />
            </>
          ) : null}
        </div>

        <h2 className="pt-2 font-extrabold text-fal-navy">Frete próprio — POL e veículo</h2>
        <p className="m-0 text-xs text-fal-muted">
          Mesmo campo usado em{' '}
          <Link to="/admin/logistica/frete-proprio" className="font-semibold text-fal-navy">
            Logística → Frete próprio → Produtos
          </Link>
          . Sem duplicar cadastro. Editar marca origem <strong>Manual</strong>.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="POL unitário (capacidade de carga)"
            type="number"
            step="0.01"
            min="0"
            value={polUnit}
            onChange={(e) => {
              setPolUnit(e.target.value)
              setPolOrigin('manual')
            }}
            hint="Unidade de volume/carga usada na cotação por modalidade"
          />
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Porte logístico</span>
            <select
              className="w-full rounded-lg border border-fal-line px-3 py-2"
              value={logisticPorte}
              onChange={(e) => setLogisticPorte(e.target.value as typeof logisticPorte)}
            >
              <option value="">—</option>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Veículo mínimo</span>
            <select
              className="w-full rounded-lg border border-fal-line px-3 py-2"
              value={vehicleMinCode}
              onChange={(e) => setVehicleMinCode(e.target.value)}
            >
              <option value="">—</option>
              {ownVehicles.map((v) => (
                <option key={v.id} value={v.code}>
                  {v.label} (até {v.capacityPol} POL)
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Compatível (códigos, vírgula)"
            value={compatibleCodes}
            onChange={(e) => setCompatibleCodes(e.target.value)}
            hint={
              ownVehicles.length
                ? `Modalidades: ${ownVehicles.map((v) => v.code).join(', ')}`
                : 'Cadastre modalidades em Frete próprio → Veículos'
            }
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
            <input
              type="checkbox"
              checked={ownDeliveryAllowed}
              onChange={(e) => setOwnDeliveryAllowed(e.target.checked)}
            />
            Permite frete próprio FAL
          </label>
          <p className="m-0 self-center text-xs text-fal-muted">
            Origem POL: <strong>{polOrigin === 'manual' ? 'Manual' : 'Global'}</strong>
          </p>
        </div>
        <h2 className="pt-2 font-extrabold text-fal-navy">Medidas físicas (opcional)</h2>
        <p className="m-0 text-xs text-fal-muted">
          Peso e dimensões para ME/transportadoras. Independente do POL do frete próprio.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: 'Peso (kg)',
                step: '0.001',
                value: weightKg,
                setValue: setWeightKg,
                origin: weightOrigin,
                setOrigin: setWeightOrigin,
              },
              {
                label: 'Altura (cm)',
                step: '0.01',
                value: heightCm,
                setValue: setHeightCm,
                origin: heightOrigin,
                setOrigin: setHeightOrigin,
              },
              {
                label: 'Largura (cm)',
                step: '0.01',
                value: widthCm,
                setValue: setWidthCm,
                origin: widthOrigin,
                setOrigin: setWidthOrigin,
              },
              {
                label: 'Comprimento (cm)',
                step: '0.01',
                value: lengthCm,
                setValue: setLengthCm,
                origin: lengthOrigin,
                setOrigin: setLengthOrigin,
              },
            ] as const
          ).map((f) => (
            <div key={f.label} className="space-y-1">
              <Input
                label={f.label}
                type="number"
                step={f.step}
                min="0"
                value={f.value}
                onChange={(e) => {
                  f.setValue(e.target.value)
                  f.setOrigin('manual')
                }}
              />
              <label className="flex items-center gap-2 text-xs text-fal-muted">
                <span className="font-semibold">Origem</span>
                <select
                  className="rounded-md border border-fal-line px-2 py-1 text-fal-navy"
                  value={f.origin}
                  onChange={(e) => f.setOrigin(e.target.value as MeasureOrigin)}
                >
                  <option value="manual">Manual</option>
                  <option value="global">Global</option>
                </select>
              </label>
            </div>
          ))}
        </div>

        {productId ? (
          <div className="rounded-[10px] border border-fal-line bg-[#f7f9fc] p-3">
            <h3 className="m-0 text-sm font-extrabold text-fal-navy">Histórico de medidas</h3>
            <p className="mt-1 mb-2 text-xs text-fal-muted">
              Alterações de peso/dims/POL (manual ou bulk). Máx. 30 recentes.
            </p>
            {measureHistoryErr ? (
              <p className="m-0 text-xs text-red-700">{measureHistoryErr}</p>
            ) : measureHistory.length === 0 ? (
              <p className="m-0 text-xs text-fal-muted">Nenhuma alteração registrada ainda.</p>
            ) : (
              <ul className="m-0 max-h-48 list-none space-y-2 overflow-y-auto p-0 text-xs">
                {measureHistory.map((h) => (
                  <li key={h.id} className="rounded-md border border-fal-line bg-white px-2 py-1.5">
                    <div className="flex flex-wrap justify-between gap-2 font-semibold text-fal-navy">
                      <span>{new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                      <span className="uppercase tracking-wide text-fal-muted">{h.source}</span>
                    </div>
                    <ul className="mt-1 mb-0 list-disc pl-4 text-fal-muted">
                      {Object.entries(h.changes).map(([field, delta]) => (
                        <li key={field}>
                          <code>{field}</code>: {String(delta.old ?? '—')} →{' '}
                          {String(delta.new ?? '—')}
                          {delta.old_origin || delta.new_origin
                            ? ` (${delta.old_origin ?? '—'}→${delta.new_origin ?? '—'})`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

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
          <AdminProductRelatedSection productId={productId} />

          <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="font-extrabold text-fal-navy">Referências</h2>
            <div className="flex flex-wrap gap-2">
              <Input label="Código" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Tipo</span>
                <select className="rounded-[10px] border border-fal-line px-3 py-2" value={refType} onChange={(e) => setRefType(e.target.value)}>
                  <option value="manufacturer">Código do fabricante</option>
                  <option value="oem">Código OEM (montadora)</option>
                  <option value="internal">Código interno</option>
                  <option value="competitor">Código concorrente</option>
                  <option value="other">Outro</option>
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
                    <strong>{r.code}</strong> · {productReferenceTypeLabel(r.type)} ·{' '}
                    {entityStatusLabel(r.status)}
                  </span>
                  {r.id ? (
                    <button
                      type="button"
                      className="text-fal-danger font-semibold"
                      onClick={() => {
                        const refId = r.id!
                        void confirmDialog({
                          title: 'Remover referência?',
                          message: `A referência "${r.code}" será removida deste produto.`,
                          confirmLabel: 'Remover',
                          danger: true,
                        })
                          .then(async ({ confirmed }) => {
                            if (!confirmed) return
                            await adminDeleteReference(refId)
                            setRefs(await adminListReferences(productId))
                            toast.push('Referência removida.', 'success')
                          })
                          .catch((err) => {
                            const msg = toUserMessage(err, 'Falha ao remover referência')
                            setError(msg)
                            toast.push(msg, 'error')
                          })
                      }}
                    >
                      Remover
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 font-extrabold text-fal-navy">Aplicações</h2>
              {productId ? (
                <Link
                  className="text-sm font-semibold text-fal-navy underline"
                  to={`/admin/aplicacoes?productId=${productId}`}
                >
                  Abrir gestão de aplicações
                </Link>
              ) : null}
            </div>
            <p className="text-xs text-fal-muted">
              Cascata: montadora → modelo → motorização → versão → período. Motorização ou versão
              vazia = todas as configs que casarem ({matchingVersions.length} elegível
              {matchingVersions.length === 1 ? '' : 'is'}).
            </p>
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
              <select
                className="rounded-[10px] border border-fal-line px-3 py-2"
                value={makerId}
                onChange={(e) => {
                  setMakerId(e.target.value)
                  setModelId('')
                }}
              >
                <option value="">Montadora</option>
                {makers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-[10px] border border-fal-line px-3 py-2"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={!makerId}
              >
                <option value="">Modelo</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-[10px] border border-fal-line px-3 py-2"
                value={engineFilter}
                onChange={(e) => {
                  setEngineFilter(e.target.value)
                  setVersionNameFilter('')
                }}
                disabled={!modelId}
              >
                <option value="">Motorização (Todas)</option>
                {engineOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <select
                className="rounded-[10px] border border-fal-line px-3 py-2"
                value={versionNameFilter}
                onChange={(e) => setVersionNameFilter(e.target.value)}
                disabled={!modelId}
              >
                <option value="">Versão (Todas)</option>
                {versionNameOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <Input
                label="Ano início"
                inputMode="numeric"
                value={appYearStart}
                onChange={(e) => setAppYearStart(e.target.value)}
                disabled={!modelId}
              />
              <Input
                label="Ano fim"
                inputMode="numeric"
                value={appYearEnd}
                onChange={(e) => setAppYearEnd(e.target.value)}
                disabled={!modelId}
                hint="Vazio = vigente"
              />
            </div>
            <Button
              type="button"
              disabled={!productId || !modelId || appBusy || matchingVersions.length === 0}
              onClick={() => void onLinkApplications()}
            >
              Vincular {matchingVersions.length > 1 ? `(${matchingVersions.length})` : ''}
            </Button>
            <ul className="space-y-1 text-sm">
              {apps.map((a) => {
                const row = a as {
                  id: string
                  year_start?: number | null
                  year_end?: number | null
                  vehicle_versions?: {
                    year: number | null
                    engine: string | null
                    version_name: string | null
                    manufacturers?: { name: string } | { name: string }[]
                    models?: { name: string } | { name: string }[]
                  }
                }
                const vv = row.vehicle_versions
                const maker = Array.isArray(vv?.manufacturers)
                  ? vv?.manufacturers[0]?.name
                  : vv?.manufacturers?.name
                const model = Array.isArray(vv?.models) ? vv?.models[0]?.name : vv?.models?.name
                const yearLabel = formatVehicleAppYear({
                  yearStart: row.year_start,
                  yearEnd: row.year_end,
                  versionYear: vv?.year,
                })
                const isEditing = editingAppId === row.id
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line py-1"
                  >
                    <span>
                      {[maker, model, vv?.engine || '—', vv?.version_name || '—', yearLabel]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            className="w-20 rounded border border-fal-line px-2 py-1 text-xs"
                            inputMode="numeric"
                            placeholder="Início"
                            value={editYearStart}
                            onChange={(e) => setEditYearStart(e.target.value)}
                          />
                          <input
                            className="w-20 rounded border border-fal-line px-2 py-1 text-xs"
                            inputMode="numeric"
                            placeholder="Fim"
                            value={editYearEnd}
                            onChange={(e) => setEditYearEnd(e.target.value)}
                          />
                          <button
                            type="button"
                            className="font-semibold text-fal-navy underline"
                            onClick={() => {
                              const ys = parseAppYear(editYearStart)
                              const ye = parseAppYear(editYearEnd)
                              if (editYearStart.trim() && ys == null) {
                                setError('Ano início inválido')
                                return
                              }
                              if (editYearEnd.trim() && ye == null) {
                                setError('Ano fim inválido')
                                return
                              }
                              void adminUpdateApplicationYears(row.id, {
                                yearStart: ys,
                                yearEnd: ye,
                              })
                                .then(async () => {
                                  setEditingAppId(null)
                                  if (productId) setApps(await adminListApplications(productId))
                                })
                                .catch((err) => setError(String(err.message ?? err)))
                            }}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="font-semibold text-fal-muted underline"
                            onClick={() => setEditingAppId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="font-semibold text-fal-navy underline"
                          onClick={() => {
                            setEditingAppId(row.id)
                            setEditYearStart(
                              row.year_start != null ? String(row.year_start) : '',
                            )
                            setEditYearEnd(row.year_end != null ? String(row.year_end) : '')
                          }}
                        >
                          Período
                        </button>
                      )}
                      <button
                        type="button"
                        className="font-semibold text-fal-danger"
                        onClick={() => {
                          void confirmDialog({
                            title: 'Remover aplicação?',
                            message: 'O vínculo deste produto com o veículo será removido.',
                            confirmLabel: 'Remover',
                            danger: true,
                          })
                            .then(async ({ confirmed }) => {
                              if (!confirmed) return
                              await adminRemoveApplication(row.id)
                              if (productId) setApps(await adminListApplications(productId))
                              toast.push('Aplicação removida.', 'success')
                            })
                            .catch((err) => {
                              const msg = toUserMessage(err, 'Falha ao remover aplicação')
                              setError(msg)
                              toast.push(msg, 'error')
                            })
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            <h2 className="font-extrabold text-fal-navy">Imagens</h2>
            <p className="m-0 text-xs text-fal-muted">
              Várias de uma vez neste produto · lote por SKU em{' '}
              <Link className="font-semibold text-fal-navy hover:underline" to="/admin/produtos/importar-imagens">
                Importar imagens
              </Link>
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const list = e.target.files
                if (!list?.length) return
                const arr = Array.from(list)
                e.target.value = ''
                void (async () => {
                  try {
                    for (const file of arr) await adminUploadImage(productId, file)
                    setImages(await adminListImages(productId))
                    toast.push(
                      arr.length === 1 ? 'Imagem enviada.' : `${arr.length} imagens enviadas.`,
                      'success',
                    )
                  } catch (err) {
                    const msg = toUserMessage(err, 'Falha ao enviar imagem')
                    setError(msg)
                    toast.push(msg, 'error')
                  }
                })()
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
                    <button
                      type="button"
                      className="font-semibold text-fal-danger"
                      onClick={() => {
                        void confirmDialog({
                          title: 'Excluir imagem?',
                          message: 'A imagem será removida do produto. Esta ação não pode ser desfeita.',
                          confirmLabel: 'Excluir',
                          danger: true,
                        })
                          .then(async ({ confirmed }) => {
                            if (!confirmed) return
                            await adminDeleteImage(img)
                            setImages(await adminListImages(productId))
                            toast.push('Imagem excluída.', 'success')
                          })
                          .catch((err) => {
                            const msg = toUserMessage(err, 'Falha ao excluir imagem')
                            setError(msg)
                            toast.push(msg, 'error')
                          })
                      }}
                    >
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
