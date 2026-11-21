import { InventoryWorkSurface } from '@/components/admin/inventory/InventoryWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  ADMIN_INVENTORY_PAGE_SIZE,
  formatInventoryError,
  getStoreInventoryMode,
  INVENTORY_MODE_LABELS,
  INVENTORY_MODE_SUCCESS_MSG,
  isAdministrador,
  listInventory,
  setStoreInventoryMode,
  staffCanAdjustInventory,
  type InventoryMode,
  type InventoryRow,
} from '@/services/admin/adminInventoryService'
import { useEffect, useState } from 'react'

const MODE_OPTIONS = Object.keys(INVENTORY_MODE_LABELS) as InventoryMode[]

export function AdminInventoryPage() {
  useDocumentTitle('Estoque | Admin FAL')
  const toast = useToast()
  const [mode, setMode] = useState<InventoryMode>('com_estoque')
  const [pendingMode, setPendingMode] = useState<InventoryMode | null>(null)
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canAdjust, setCanAdjust] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selected, setSelected] = useState<InventoryRow | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const showPhysicalCols = mode === 'com_estoque' || mode === 'estoque_ficticio'
  const allowAdjust = canAdjust && mode === 'com_estoque'

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

  async function reload(q?: string) {
    setLoading(true)
    setError(null)
    try {
      const [m, list, adj, adm] = await Promise.all([
        getStoreInventoryMode(),
        listInventory(q, { offset: 0, limit: ADMIN_INVENTORY_PAGE_SIZE }),
        staffCanAdjustInventory(),
        isAdministrador(),
      ])
      setMode(m)
      setRows(list)
      setHasMore(list.length >= ADMIN_INVENTORY_PAGE_SIZE)
      setCanAdjust(adj)
      setIsAdmin(adm)
      if (selected) {
        const refreshed = list.find((r) => r.productId === selected.productId) ?? null
        setSelected(refreshed)
        if (!refreshed) {
          setGuideOpen(false)
        }
      }
    } catch (e) {
      pushError(formatInventoryError(e, 'Erro ao carregar estoque'))
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const next = await listInventory(search, {
        offset: rows.length,
        limit: ADMIN_INVENTORY_PAGE_SIZE,
      })
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.productId))
        return [...prev, ...next.filter((r) => !seen.has(r.productId))]
      })
      setHasMore(next.length >= ADMIN_INVENTORY_PAGE_SIZE)
    } catch (e) {
      pushError(formatInventoryError(e, 'Erro ao carregar mais estoque'))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  function openGuide(row: InventoryRow) {
    setSelected(row)
    setGuideOpen(true)
    setError(null)
  }

  function closeGuide() {
    setGuideOpen(false)
  }

  function requestModeChange(next: InventoryMode) {
    if (next === mode) {
      setPendingMode(null)
      return
    }
    setError(null)
    setPendingMode(next)
  }

  function cancelModeChange() {
    setPendingMode(null)
  }

  async function confirmModeChange() {
    if (!pendingMode) return
    const next = pendingMode
    setBusy(true)
    setError(null)
    try {
      const m = await setStoreInventoryMode(next)
      setPendingMode(null)
      setMode(m)
      pushOk(INVENTORY_MODE_SUCCESS_MSG[m])
      await reload(search)
    } catch (e) {
      setPendingMode(null)
      pushError(formatInventoryError(e, 'Falha ao alterar modo'))
      try {
        const current = await getStoreInventoryMode()
        setMode(current)
      } catch {
        /* keep previous mode state */
      }
    } finally {
      setBusy(false)
    }
  }

  const primary = (
    <div className="admin-inventory-hub space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-fg">Estoque</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Centro operacional de estoque. Ajuste e movimentos na guia.
          {rows.length > 0
            ? ` · ${rows.length} produto${rows.length === 1 ? '' : 's'} carregado${rows.length === 1 ? '' : 's'}.`
            : null}
        </p>
      </header>

      <section className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-fal-muted">Modo atual</div>
            <div className="text-lg font-extrabold text-fal-fg">{INVENTORY_MODE_LABELS[mode]}</div>
          </div>
          {isAdmin ? (
            <select
              className="rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm"
              value={mode}
              disabled={busy || pendingMode != null}
              onChange={(e) => requestModeChange(e.target.value as InventoryMode)}
            >
              {MODE_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {INVENTORY_MODE_LABELS[k]}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-fal-muted">Somente administrador altera o modo.</p>
          )}
        </div>

        {mode === 'sem_estoque' ? (
          <p className="mt-2 text-sm text-fal-muted">
            Saldos físicos não são controlados — exibidos como —. Vendas usam a disponibilidade comercial
            do produto (<code className="text-xs">is_available</code>).
          </p>
        ) : null}
        {mode === 'estoque_ficticio' ? (
          <p className="mt-2 text-sm text-fal-muted">
            Quantidades são apresentacionais e não representam necessariamente estoque físico auditado.
            Pedidos neste modo não reservam nem baixam estoque real.
          </p>
        ) : null}
        {mode === 'com_estoque' ? (
          <p className="mt-2 text-sm text-fal-muted">
            Estoque real ativo: reserva no pedido e baixa na expedição (fluxo F7).
          </p>
        ) : null}

        {pendingMode ? (
          <div className="mt-4 rounded-[12px] border border-fal-navy/30 bg-fal-surface-2 p-4">
            <h2 className="m-0 text-base font-extrabold text-fal-fg">
              Alterar modo para “{INVENTORY_MODE_LABELS[pendingMode]}”?
            </h2>
            <p className="mt-1 mb-0 text-sm text-fal-muted">
              Pedidos já criados não mudam — cada pedido mantém o modo gravado na criação (
              <code className="text-xs">inventory_mode_at_order</code>).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void confirmModeChange()}>
                Confirmar
              </Button>
              <Button type="button" variant="light" disabled={busy} onClick={cancelModeChange}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Código ou nome"
        />
        <Button type="button" variant="light" onClick={() => void reload(search)} disabled={loading || busy}>
          Filtrar
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_INVENTORY_PAGE_SIZE} registros por carga ({rows.length} carregados). Há
          mais produtos — use “Carregar mais estoque” ao final da lista ou refine a busca.
        </p>
      ) : null}
      {loading ? <Loading label="Carregando estoque…" /> : null}

      {!loading ? (
        <>
          <div className="admin-inventory-list-mobile fal-admin-scroll max-h-[min(60dvh,640px)] space-y-2 overflow-y-auto md:hidden">
            {rows.map((r) => {
              const onGuide = guideOpen && selected?.productId === r.productId
              return (
                <article
                  key={r.productId}
                  className={`rounded-[14px] border border-fal-line bg-fal-surface p-3 ${
                    onGuide ? 'bg-fal-yellow/15' : ''
                  }`}
                >
                  <p className="m-0 font-mono text-xs text-fal-muted">{r.sku}</p>
                  <p className="mb-1 mt-0.5 text-sm font-extrabold text-fal-fg">{r.name}</p>
                  {showPhysicalCols ? (
                    <p className="m-0 text-xs text-fal-muted">
                      {mode === 'estoque_ficticio' ? 'Exib.' : 'Físico'} {r.onHand} · Res. {r.reserved}{' '}
                      · Disp. <strong className="text-fal-fg">{r.available}</strong>
                    </p>
                  ) : (
                    <p className="m-0 text-xs text-fal-muted">Saldo —</p>
                  )}
                  <button
                    type="button"
                    className="mt-2 inline-flex min-h-11 items-center rounded-[10px] bg-fal-yellow px-3 text-sm font-bold text-fal-navy-dark"
                    onClick={() => openGuide(r)}
                  >
                    {onGuide ? 'Na guia' : 'Abrir guia'}
                  </button>
                </article>
              )
            })}
            {hasMore ? (
              <div className="flex justify-center p-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMore || busy}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Carregando…' : 'Carregar mais estoque'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="admin-inventory-list-desktop fal-admin-scroll hidden max-h-[min(60dvh,640px)] overflow-auto rounded-[14px] border border-fal-line bg-fal-surface md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Produto</th>
                  {mode === 'sem_estoque' ? <th className="px-3 py-2">Saldo</th> : null}
                  {showPhysicalCols ? (
                    <>
                      <th className="px-3 py-2">
                        {mode === 'estoque_ficticio' ? 'Qtd (exib.)' : 'Físico'}
                      </th>
                      <th className="px-3 py-2">Reservado</th>
                      <th className="px-3 py-2">Disponível</th>
                    </>
                  ) : null}
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const onGuide = guideOpen && selected?.productId === r.productId
                  return (
                    <tr
                      key={r.productId}
                      className={`border-b border-fal-line last:border-0 ${
                        onGuide ? 'bg-fal-yellow/15' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      {mode === 'sem_estoque' ? (
                        <td className="px-3 py-2 text-fal-muted" title="Estoque físico não controlado">
                          —
                        </td>
                      ) : null}
                      {showPhysicalCols ? (
                        <>
                          <td className="px-3 py-2">{r.onHand}</td>
                          <td className="px-3 py-2">{r.reserved}</td>
                          <td className="px-3 py-2 font-semibold">{r.available}</td>
                        </>
                      ) : null}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center rounded-[10px] bg-fal-yellow px-2.5 text-xs font-bold text-fal-navy-dark"
                          onClick={() => openGuide(r)}
                        >
                          {onGuide ? 'Na guia' : 'Abrir guia'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {hasMore ? (
              <div className="flex justify-center border-t border-fal-line p-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMore || busy}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Carregando…' : 'Carregar mais estoque'}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="inventory"
      primary={primary}
      contextualOpen={guideOpen && Boolean(selected)}
      onContextualOpenChange={(open) => {
        if (!open) closeGuide()
      }}
      contextualTitle={selected ? `${selected.sku} — ${selected.name}` : 'Estoque'}
      contextual={
        guideOpen && selected ? (
          <InventoryWorkSurface
            focused={selected}
            mode={mode}
            allowAdjust={allowAdjust}
            onClose={closeGuide}
            onMutated={(refreshed) => {
              if (refreshed) setSelected(refreshed)
              void reload(search)
            }}
          />
        ) : null
      }
    />
  )
}
