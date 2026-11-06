import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  listProductsForOwnPol,
  saveProductPol,
  type OwnVehicleCategory,
} from '@/services/admin/adminOwnDeliveryService'
import type { Product } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  categories: OwnVehicleCategory[]
  onOk: (msg: string) => void
  onError: (msg: string) => void
}

export function OwnDeliveryProductsTab({ categories, onOk, onError }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [prodQ, setProdQ] = useState('')
  const [prodStatus, setProdStatus] = useState('')
  const [prodMissingPol, setProdMissingPol] = useState(false)
  const [prodLoading, setProdLoading] = useState(false)
  const [draftPol, setDraftPol] = useState<Record<string, string>>({})

  async function reloadProducts() {
    setProdLoading(true)
    try {
      const rows = await listProductsForOwnPol({
        q: prodQ.trim() || undefined,
        status: prodStatus || undefined,
        missingPol: prodMissingPol || undefined,
      })
      setProducts(rows)
      const drafts: Record<string, string> = {}
      for (const p of rows) drafts[p.id] = p.polUnit != null ? String(p.polUnit) : ''
      setDraftPol(drafts)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erro ao listar produtos')
    } finally {
      setProdLoading(false)
    }
  }

  useEffect(() => {
    void reloadProducts()
    // carga inicial da aba (filtrar = botão)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Capacidade POL dos produtos</h2>
      <p className="m-0 text-sm text-fal-muted">
        É o mesmo valor do cadastro do produto — altere aqui ou em{' '}
        <Link to="/admin/produtos" className="font-semibold text-fal-navy">
          Produtos
        </Link>
        ; não cria registro duplicado.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="Busca (nome / SKU / ref)"
          value={prodQ}
          onChange={(e) => setProdQ(e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Status</span>
          <select
            className="rounded-[9px] border border-fal-line px-3 py-3"
            value={prodStatus}
            onChange={(e) => setProdStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="published">Publicado</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={prodMissingPol}
            onChange={(e) => setProdMissingPol(e.target.checked)}
          />
          Só sem capacidade POL
        </label>
        <Button type="button" onClick={() => void reloadProducts()} disabled={prodLoading}>
          {prodLoading ? 'Buscando…' : 'Filtrar'}
        </Button>
      </div>

      {prodLoading ? (
        <Loading label="Carregando produtos…" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-fal-line text-left text-xs text-fal-muted">
                <th className="px-2 py-2">Produto</th>
                <th className="px-2 py-2">Capacidade POL</th>
                <th className="px-2 py-2">Porte</th>
                <th className="px-2 py-2">Veículo mínimo</th>
                <th className="px-2 py-2">Frete FAL</th>
                <th className="px-2 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-fal-line/70 align-top">
                  <td className="px-2 py-2">
                    <div className="font-semibold text-fal-navy">{p.name}</div>
                    <div className="text-xs text-fal-muted">
                      {p.commercialRef || p.sku} · {p.status}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="w-20 rounded border border-fal-line px-2 py-1"
                      type="number"
                      step="0.01"
                      min="0"
                      value={draftPol[p.id] ?? ''}
                      onChange={(e) => setDraftPol((d) => ({ ...d, [p.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="rounded border border-fal-line px-2 py-1"
                      defaultValue={p.logisticPorte ?? ''}
                      id={`porte-${p.id}`}
                    >
                      <option value="">—</option>
                      <option value="pequeno">Pequeno</option>
                      <option value="medio">Médio</option>
                      <option value="grande">Grande</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="rounded border border-fal-line px-2 py-1"
                      defaultValue={p.vehicleMinCode ?? ''}
                      id={`vmin-${p.id}`}
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      defaultChecked={p.ownDeliveryAllowed !== false}
                      id={`own-${p.id}`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        onClick={() => {
                          const porteEl = document.getElementById(
                            `porte-${p.id}`,
                          ) as HTMLSelectElement | null
                          const vminEl = document.getElementById(
                            `vmin-${p.id}`,
                          ) as HTMLSelectElement | null
                          const ownEl = document.getElementById(
                            `own-${p.id}`,
                          ) as HTMLInputElement | null
                          const polRaw = (draftPol[p.id] ?? '').trim()
                          void (async () => {
                            try {
                              await saveProductPol({
                                product: p,
                                polUnit: polRaw === '' ? null : Number(polRaw),
                                logisticPorte: (porteEl?.value ||
                                  null) as Product['logisticPorte'],
                                vehicleMinCode: vminEl?.value || null,
                                compatibleVehicleCodes: p.compatibleVehicleCodes?.length
                                  ? p.compatibleVehicleCodes
                                  : categories.map((c) => c.code),
                                ownDeliveryAllowed: ownEl?.checked !== false,
                              })
                              onOk(`Capacidade de “${p.name}” salva no cadastro do produto.`)
                              await reloadProducts()
                            } catch (err) {
                              onError(
                                err instanceof Error ? err.message : 'Falha ao salvar capacidade',
                              )
                            }
                          })()
                        }}
                      >
                        Salvar
                      </Button>
                      <Link
                        className="text-xs font-semibold text-fal-navy"
                        to={`/admin/produtos/${p.id}`}
                      >
                        Abrir cadastro
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length ? (
            <p className="text-sm text-fal-muted">Nenhum produto no filtro.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
