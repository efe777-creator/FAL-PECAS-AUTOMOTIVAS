import { KitWorkSurface } from '@/components/admin/kits/KitWorkSurface'
import { KITS_OPEN_GUIDE_KEY } from '@/components/admin/products/ProductWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button, buttonClassName } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminGetKitPricePreview,
  type KitPricePreview,
} from '@/services/admin/adminKitPricingService'
import {
  adminGetProduct,
  adminListProductsPage,
  adminReleaseProductToStore,
  adminSetProductStatus,
} from '@/services/admin/adminProductService'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import type { Product } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const PAGE = 40

export function AdminKitsPage() {
  useDocumentTitle('Kits | Admin FAL')
  const toast = useToast()
  const splitTabs = useIdSplitTabs()
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [kitCache, setKitCache] = useState<Record<string, Product>>({})
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [previews, setPreviews] = useState<Record<string, KitPricePreview | undefined>>({})
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const loadPreviews = useCallback(async (kits: Product[]) => {
    const entries = await Promise.all(
      kits.map(async (k) => {
        try {
          return [k.id, await adminGetKitPricePreview(k.id)] as const
        } catch {
          return [k.id, undefined] as const
        }
      }),
    )
    setPreviews((prev) => {
      const next = { ...prev }
      for (const [id, p] of entries) next[id] = p
      return next
    })
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const { items: rows, hasMore: more } = await adminListProductsPage({
        productKind: 'kit',
        q: q.trim() || undefined,
        status: status || undefined,
        limit: PAGE,
        offset: 0,
      })
      setItems(rows)
      setKitCache((prev) => {
        const next = { ...prev }
        for (const k of rows) next[k.id] = k
        return next
      })
      setHasMore(more)
      setOffset(rows.length)
      void loadPreviews(rows)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao listar kits'), 'error')
    } finally {
      setLoading(false)
    }
  }, [q, status, loadPreviews, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: rows, hasMore: more } = await adminListProductsPage({
        productKind: 'kit',
        q: q.trim() || undefined,
        status: status || undefined,
        limit: PAGE,
        offset,
      })
      setItems((prev) => [...prev, ...rows])
      setKitCache((prev) => {
        const next = { ...prev }
        for (const k of rows) next[k.id] = k
        return next
      })
      setHasMore(more)
      setOffset((n) => n + rows.length)
      void loadPreviews(rows)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao carregar mais'), 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  async function liberar(kit: Product) {
    setReleasingId(kit.id)
    try {
      const result = await adminReleaseProductToStore({
        productId: kit.id,
        publishIfNeeded: kit.status !== 'published',
      })
      if (!result.ok) {
        toast.push(result.reason, 'error')
        return
      }
      toast.push(
        result.publishedNow ? 'Kit publicado e liberado na loja.' : 'Kit liberado na loja.',
        'success',
      )
      await reload()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao liberar'), 'error')
    } finally {
      setReleasingId(null)
    }
  }

  const kitsById = useMemo(() => {
    const map = { ...kitCache }
    for (const k of items) map[k.id] = k
    return map
  }, [items, kitCache])

  const focusedKit = useMemo(() => {
    if (!splitTabs.activeId) return null
    return kitsById[splitTabs.activeId] ?? null
  }, [kitsById, splitTabs.activeId])

  const contextualOpen = quickCreateOpen || splitTabs.hasOpen

  function openKitGuia(kitId: string) {
    setQuickCreateOpen(false)
    splitTabs.openTab(kitId)
  }

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(KITS_OPEN_GUIDE_KEY)?.trim()
      if (!pending) return
      sessionStorage.removeItem(KITS_OPEN_GUIDE_KEY)
      openKitGuia(pending)
      void adminGetProduct(pending)
        .then((kit) => {
          if (kit) setKitCache((prev) => ({ ...prev, [kit.id]: kit }))
        })
        .catch(() => undefined)
    } catch {
      /* ignore */
    }
    // só no mount — ponte a partir da guia Produtos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openQuickCreate() {
    splitTabs.closeAll()
    setQuickCreateOpen(true)
  }

  async function toggleArchive(kit: Product) {
    try {
      const next = kit.status === 'archived' ? 'draft' : 'archived'
      await adminSetProductStatus(kit.id, next)
      toast.push(next === 'archived' ? 'Kit arquivado.' : 'Kit desarquivado.', 'success')
      await reload()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao alterar status'), 'error')
    }
  }

  const primary = (
    <div className="admin-kits-hub space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Kits</h1>
          <p className="mt-1 mb-0 text-sm text-fal-muted">
            Cadastro de kits (código, composição e preço automático ou manual). Promoções ficam em
            Home da loja › Promoções › Kits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/kits/precos" className={buttonClassName({ variant: 'outline' })}>
            Preços dos kits
          </Link>
          <Link
            to="/admin/produtos/importar-kits"
            className={buttonClassName({ variant: 'outline' })}
          >
            Importar composição
          </Link>
          <Button type="button" variant="primary" onClick={openQuickCreate}>
            Novo na guia
          </Button>
          <Link to="/admin/kits/novo" className={buttonClassName({ variant: 'light' })}>
            Cadastro completo
          </Link>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-[14px] border border-fal-line bg-fal-surface p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void reload()
        }}
      >
        <div className="min-w-[220px] flex-1">
          <Input
            label="Buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, código ou SKU"
          />
        </div>
        <label className="block min-w-[140px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Status</span>
          <select
            className="w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-3 text-fal-fg"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {loading ? <Loading label="Carregando kits…" /> : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title="Nenhum kit"
          description="Crie o primeiro kit com código, descrição e composição."
          actionLabel="Cadastro completo"
          actionTo="/admin/kits/novo"
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <div className="admin-kits-list-mobile space-y-3 md:hidden">
            {items.map((k) => {
              const prev = previews[k.id]
              return (
                <article
                  key={k.id}
                  className="rounded-[14px] border border-fal-line bg-fal-surface p-3"
                >
                  <p className="m-0 font-mono text-xs text-fal-muted">
                    {k.commercialRef ?? k.sku}
                  </p>
                  <p className="mb-1 mt-0.5 text-sm font-extrabold text-fal-fg">{k.name}</p>
                  <p className="m-0 text-xs text-fal-muted">
                    {k.kitPriceMode === 'manual' ? 'Manual' : 'Automático'} ·{' '}
                    {productStatusLabel(k.status)} ·{' '}
                    {k.available ? 'Disponível' : 'Indisponível'}
                    {k.kitCompatReviewRequired ? ' · Revisar PVC' : ''}
                  </p>
                  <p className="mb-0 mt-1 text-sm font-bold text-fal-fg">
                    {prev ? formatMoney(prev.effectiveHint) : formatMoney(k.price)}
                    {prev?.provisional ? (
                      <span className="ml-2 text-xs font-semibold text-fal-warning">provisório</span>
                    ) : null}
                    {k.kitCompatReviewRequired ? (
                      <span className="ml-2 text-xs font-bold text-fal-warning">PVC</span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-yellow px-3 text-sm font-extrabold text-fal-navy-dark"
                      onClick={() => openKitGuia(k.id)}
                    >
                      {splitTabs.openIds.includes(k.id)
                        ? 'Na guia'
                        : splitTabs.hasOpen
                          ? '+ Guia'
                          : 'Abrir guia'}
                    </button>
                    <Link
                      className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-fg"
                      to={`/admin/kits/${k.id}`}
                    >
                      Cadastro
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={releasingId === k.id || k.available}
                      onClick={() => void liberar(k)}
                    >
                      {releasingId === k.id ? 'Liberando…' : 'Liberar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="light"
                      onClick={() => void toggleArchive(k)}
                    >
                      {k.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="admin-kits-list-desktop fal-admin-scroll hidden overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-fal-bg text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Ref / SKU</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Modo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Preço</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((k) => {
                  const prev = previews[k.id]
                  return (
                    <tr key={k.id} className="border-t border-fal-line/70">
                      <td className="px-3 py-2 font-mono text-xs">
                        {k.commercialRef ?? k.sku}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {k.name}
                        {k.kitCompatReviewRequired ? (
                          <span className="ml-2 text-xs font-bold text-fal-warning">PVC</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {k.kitPriceMode === 'manual' ? 'Manual' : 'Automático'}
                      </td>
                      <td className="px-3 py-2">
                        {productStatusLabel(k.status)}
                        {k.available ? ' · disp.' : ''}
                      </td>
                      <td className="px-3 py-2 font-bold">
                        {prev ? formatMoney(prev.effectiveHint) : formatMoney(k.price)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="font-semibold text-fal-fg underline"
                            onClick={() => openKitGuia(k.id)}
                          >
                            {splitTabs.openIds.includes(k.id)
                              ? 'Na guia'
                              : splitTabs.hasOpen
                                ? '+ Guia'
                                : 'Abrir guia'}
                          </button>
                          <Link
                            className="font-semibold text-fal-muted underline"
                            to={`/admin/kits/${k.id}`}
                          >
                            Cadastro
                          </Link>
                          <button
                            type="button"
                            className="font-semibold text-fal-muted underline disabled:opacity-40"
                            disabled={releasingId === k.id || k.available}
                            onClick={() => void liberar(k)}
                          >
                            Liberar
                          </button>
                          <button
                            type="button"
                            className="font-semibold text-fal-muted underline"
                            onClick={() => void toggleArchive(k)}
                          >
                            {k.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? 'Carregando…' : 'Carregar mais'}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="kits"
      primary={primary}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) {
          setQuickCreateOpen(false)
          splitTabs.closeAll()
        }
      }}
      contextualTitle={
        quickCreateOpen
          ? 'Novo na guia'
          : focusedKit
            ? focusedKit.name
            : splitTabs.openIds.length > 1
              ? `${splitTabs.openIds.length} kits na guia`
              : 'Kit'
      }
      contextual={
        contextualOpen ? (
          <KitWorkSurface
            openKitIds={splitTabs.openIds}
            kitsById={kitsById}
            previews={previews}
            quickCreateOpen={quickCreateOpen}
            onQuickCreateOpenChange={setQuickCreateOpen}
            onCloseTab={splitTabs.closeTab}
            onCloseAll={() => {
              setQuickCreateOpen(false)
              splitTabs.closeAll()
            }}
            onKitCreated={(kit) => {
              setKitCache((prev) => ({ ...prev, [kit.id]: kit }))
              void reload().then(() => openKitGuia(kit.id))
            }}
            onKitUpdated={() => void reload()}
            releasingId={releasingId}
            onLiberar={(kit) => void liberar(kit)}
            onArchiveToggle={(kit) => void toggleArchive(kit)}
          />
        ) : null
      }
    />
  )
}
