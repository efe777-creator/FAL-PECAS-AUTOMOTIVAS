import { Button } from '@/components/common/Button'
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
  adminListProductsPage,
  adminReleaseProductToStore,
  adminSetProductStatus,
} from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const PAGE = 40

export function AdminKitsPage() {
  useDocumentTitle('Kits | Admin FAL')
  const toast = useToast()
  const [q, setQ] = useState('')
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
        limit: PAGE,
        offset: 0,
      })
      setItems(rows)
      setHasMore(more)
      setOffset(rows.length)
      void loadPreviews(rows)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao listar kits'), 'error')
    } finally {
      setLoading(false)
    }
  }, [q, loadPreviews, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: rows, hasMore: more } = await adminListProductsPage({
        productKind: 'kit',
        q: q.trim() || undefined,
        limit: PAGE,
        offset,
      })
      setItems((prev) => [...prev, ...rows])
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Kits</h1>
          <p className="mt-1 mb-0 text-sm text-fal-muted">
            Cadastro de kits (código, composição e preço automático ou manual). Promoções ficam em
            Home da loja › Promoções › Kits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/kits/precos">
            <Button type="button" variant="outline">
              Preços dos kits
            </Button>
          </Link>
          <Link to="/admin/produtos/importar-kits">
            <Button type="button" variant="outline">
              Importar composição
            </Button>
          </Link>
          <Link to="/admin/kits/novo">
            <Button type="button" variant="primary">
              Novo kit
            </Button>
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
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {loading ? <Loading label="Carregando kits…" /> : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title="Nenhum kit"
          description="Crie o primeiro kit com código, descrição e composição."
          actionLabel="Novo kit"
          actionTo="/admin/kits/novo"
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
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
                  <p className="mb-0 mt-1 text-sm font-bold">
                    {prev ? formatMoney(prev.effectiveHint) : formatMoney(k.price)}
                    {prev?.provisional ? (
                      <span className="ml-2 text-xs font-semibold text-amber-800">provisório</span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-yellow px-3 text-sm font-bold text-fal-navy-dark"
                      to={`/admin/kits/${k.id}`}
                    >
                      Editar
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={releasingId === k.id || k.available}
                      onClick={() => void liberar(k)}
                    >
                      {releasingId === k.id ? 'Liberando…' : 'Liberar'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="fal-admin-scroll hidden overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface md:block">
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
                          <span className="ml-2 text-xs font-bold text-amber-800">PVC</span>
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
                          <Link
                            className="font-semibold text-fal-fg underline"
                            to={`/admin/kits/${k.id}`}
                          >
                            Editar
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
}
