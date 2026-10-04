import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { formatDateTime } from '@/lib/datetime'
import {
  adjustInventory,
  getStoreInventoryMode,
  INVENTORY_MODE_LABELS,
  isAdministrador,
  listInventory,
  listInventoryMovements,
  setStoreInventoryMode,
  staffCanAdjustInventory,
  type InventoryMode,
  type InventoryMovementRow,
  type InventoryRow,
} from '@/services/admin/adminInventoryService'
import { useEffect, useState } from 'react'

export function AdminInventoryPage() {
  const [mode, setMode] = useState<InventoryMode>('com_estoque')
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [canAdjust, setCanAdjust] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selected, setSelected] = useState<InventoryRow | null>(null)
  const [movements, setMovements] = useState<InventoryMovementRow[]>([])
  const [delta, setDelta] = useState('1')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload(q?: string) {
    setLoading(true)
    setError(null)
    try {
      const [m, list, adj, adm] = await Promise.all([
        getStoreInventoryMode(),
        listInventory(q),
        staffCanAdjustInventory(),
        isAdministrador(),
      ])
      setMode(m)
      setRows(list)
      setCanAdjust(adj)
      setIsAdmin(adm)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar estoque')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function openProduct(row: InventoryRow) {
    setSelected(row)
    setMsg(null)
    try {
      setMovements(await listInventoryMovements(row.productId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar movimentos')
    }
  }

  async function onChangeMode(next: InventoryMode) {
    if (!window.confirm(`Alterar modo da loja para “${INVENTORY_MODE_LABELS[next]}”? Pedidos já criados não mudam.`)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const m = await setStoreInventoryMode(next)
      setMode(m)
      setMsg(`Modo atualizado: ${INVENTORY_MODE_LABELS[m]}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar modo')
    } finally {
      setBusy(false)
    }
  }

  async function onAdjust(sign: 1 | -1) {
    if (!selected) return
    const n = Number(delta)
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      setError('Informe um delta inteiro positivo')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adjustInventory(selected.productId, sign * n, reason || undefined)
      setMsg('Ajuste registrado')
      await reload(search)
      const refreshed = (await listInventory(selected.sku)).find((r) => r.productId === selected.productId)
      if (refreshed) {
        setSelected(refreshed)
        setMovements(await listInventoryMovements(refreshed.productId))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no ajuste')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy">Estoque</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Saldos, movimentos e modo da loja. Em <strong>com_estoque</strong> o fluxo F7 (reserva/baixa)
          permanece ativo.
        </p>
      </header>

      <section className="rounded-[14px] border border-fal-line bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-fal-muted">Modo atual</div>
            <div className="text-lg font-extrabold text-fal-navy">{INVENTORY_MODE_LABELS[mode]}</div>
          </div>
          {isAdmin ? (
            <select
              className="rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm"
              value={mode}
              disabled={busy}
              onChange={(e) => void onChangeMode(e.target.value as InventoryMode)}
            >
              {(Object.keys(INVENTORY_MODE_LABELS) as InventoryMode[]).map((k) => (
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
          <p className="mt-2 text-sm text-fal-muted">Saldos ocultos na operação comercial; listagem abaixo é só consulta.</p>
        ) : null}
        {mode === 'estoque_ficticio' ? (
          <p className="mt-2 text-sm text-fal-muted">
            Quantidades são apresentacionais — pedidos neste modo não reservam nem baixam estoque real.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SKU ou nome"
        />
        <Button type="button" variant="light" onClick={() => void reload(search)} disabled={loading}>
          Filtrar
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      {loading ? <Loading label="Carregando estoque…" /> : null}

      {!loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Produto</th>
                  {mode !== 'sem_estoque' ? (
                    <>
                      <th className="px-3 py-2">Físico</th>
                      <th className="px-3 py-2">Reservado</th>
                      <th className="px-3 py-2">Disponível</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.productId}
                    className={[
                      'cursor-pointer border-b border-fal-line last:border-0 hover:bg-fal-bg/60',
                      selected?.productId === r.productId ? 'bg-fal-bg/80' : '',
                    ].join(' ')}
                    onClick={() => void openProduct(r)}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    {mode !== 'sem_estoque' ? (
                      <>
                        <td className="px-3 py-2">{r.onHand}</td>
                        <td className="px-3 py-2">{r.reserved}</td>
                        <td className="px-3 py-2 font-semibold">{r.available}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
            {!selected ? (
              <p className="text-sm text-fal-muted">Selecione um produto para ver movimentos e ajustar.</p>
            ) : (
              <>
                <h2 className="m-0 text-lg font-extrabold text-fal-navy">
                  {selected.sku} — {selected.name}
                </h2>
                {canAdjust && mode !== 'sem_estoque' ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Input label="Delta" value={delta} onChange={(e) => setDelta(e.target.value)} />
                    <Input
                      label="Motivo"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="ajuste_manual"
                    />
                    <Button type="button" disabled={busy} onClick={() => void onAdjust(1)}>
                      + Entrada
                    </Button>
                    <Button type="button" variant="light" disabled={busy} onClick={() => void onAdjust(-1)}>
                      − Saída
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-fal-muted">Sem permissão de ajuste ou modo sem estoque.</p>
                )}
                <div>
                  <h3 className="text-xs font-bold uppercase text-fal-muted">Movimentos</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {movements.length === 0 ? (
                      <li className="text-fal-muted">Nenhum movimento.</li>
                    ) : (
                      movements.map((m) => (
                        <li key={m.id} className="border-b border-fal-line py-1 last:border-0">
                          <span className="font-semibold">{m.type}</span> {m.quantity}{' '}
                          <span className="text-fal-muted">
                            · {m.reason ?? '—'} · {formatDateTime(m.createdAt)}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
