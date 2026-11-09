import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/datetime'
import {
  IMPORT_KINDS,
  importItemResultLabel,
  importKindLabel,
  importStatusLabel,
  importWizardPath,
} from '@/lib/importLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_IMPORTS_PAGE_SIZE,
  adminGetImportRunDetail,
  adminListImports,
  formatImportReportSummary,
  type ImportRunDetail,
  type ImportRunSummary,
} from '@/services/admin/adminImportHistoryService'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

function payloadPreview(payload: Record<string, unknown>): string {
  const sku = payload.sku ?? payload.codigo ?? payload.code ?? ''
  const name = payload.name ?? payload.nome ?? payload.description ?? ''
  const price = payload.price ?? payload.custo ?? payload.cost ?? ''
  return [sku, name, price].filter((x) => String(x).trim()).join(' · ') || '—'
}

export function AdminImportsPage() {
  useDocumentTitle('Importações | Admin FAL')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const kindFromUrl = searchParams.get('kind') ?? ''
  const [rows, setRows] = useState<ImportRunSummary[]>([])
  const [kind, setKind] = useState(kindFromUrl)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<ImportRunDetail | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  useEffect(() => {
    setKind(kindFromUrl)
  }, [kindFromUrl])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await adminListImports({
        kind: kind || undefined,
        status: status || undefined,
        offset: 0,
        limit: ADMIN_IMPORTS_PAGE_SIZE,
      })
      setRows(list)
      setHasMore(list.length >= ADMIN_IMPORTS_PAGE_SIZE)
      setError(null)
    } catch (e) {
      const message = toUserMessage(e, 'Erro ao listar importações')
      setError(message)
      toast.push(message, 'error')
    } finally {
      setLoading(false)
    }
    // toast omitido de deps: push é estável o bastante; evita loop com useEffect(reload)
  }, [kind, status])

  useEffect(() => {
    void reload()
  }, [reload])

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const next = await adminListImports({
        kind: kind || undefined,
        status: status || undefined,
        offset: rows.length,
        limit: ADMIN_IMPORTS_PAGE_SIZE,
      })
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...next.filter((r) => !seen.has(r.id))]
      })
      setHasMore(next.length >= ADMIN_IMPORTS_PAGE_SIZE)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar mais importações'))
    } finally {
      setLoadingMore(false)
    }
  }

  async function openDetail(id: string) {
    setDetailBusy(true)
    try {
      setDetail(await adminGetImportRunDetail(id))
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar detalhes'))
    } finally {
      setDetailBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Importações</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted">
            Histórico das importações da loja — catálogo, aplicações, conversões, custos e listas de
            preços.
            {rows.length > 0
              ? ` · ${rows.length} importaç${rows.length === 1 ? 'ão' : 'ões'} carregada${rows.length === 1 ? '' : 's'}.`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/produtos/importar"
          >
            Importar produtos
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/produtos/importar-aplicacoes"
          >
            Importar aplicações
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/fornecedores/importar-custos"
          >
            Importar custos
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/produtos/importar-imagens"
          >
            Importar imagens
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-[14px] border border-fal-line bg-white p-3">
        <label className="block min-w-[180px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Tipo</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-2"
            value={kind}
            onChange={(e) => {
              const next = e.target.value
              setKind(next)
              const params = new URLSearchParams(searchParams)
              if (next) params.set('kind', next)
              else params.delete('kind')
              setSearchParams(params, { replace: true })
            }}
          >
            <option value="">Todos</option>
            {IMPORT_KINDS.map((k) => (
              <option key={k} value={k}>
                {importKindLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[160px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Status</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="preview">Pré-visualização</option>
            <option value="done">Concluída</option>
            <option value="failed">Falhou</option>
            <option value="running">Em andamento</option>
          </select>
        </label>
        <Button type="button" variant="light" className="mt-[22px]" onClick={() => void reload()}>
          Atualizar
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_IMPORTS_PAGE_SIZE} importações por carga ({rows.length} carregadas). Há
          mais no histórico — use “Carregar mais importações” ao final da lista ou refine os filtros.
        </p>
      ) : null}
      {loading ? <Loading label="Carregando histórico…" /> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Arquivo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Resumo</th>
                <th className="px-3 py-2 text-right">Linhas</th>
                <th className="px-3 py-2 text-right">Erros</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4">
                    <EmptyState
                      title="Nenhuma importação encontrada"
                      description="Ajuste os filtros ou execute uma nova importação pelo assistente correspondente."
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const wizard = importWizardPath(row.kind)
                  return (
                    <tr key={row.id} className="border-b border-fal-line/70">
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-fal-navy">
                        {importKindLabel(row.kind)}
                      </td>
                      <td className="px-3 py-2">{row.filename || '—'}</td>
                      <td className="px-3 py-2">{importStatusLabel(row.status)}</td>
                      <td className="px-3 py-2 text-xs text-fal-muted">
                        {formatImportReportSummary(row.report)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.totalItems}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          row.errorItems > 0 ? 'font-bold text-amber-800' : ''
                        }`}
                      >
                        {row.errorItems}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="font-semibold text-fal-navy underline"
                            onClick={() => void openDetail(row.id)}
                          >
                            Detalhes
                          </button>
                          {row.priceListId ? (
                            <Link
                              className="font-semibold text-fal-navy underline"
                              to={`/admin/precos/${row.priceListId}?tab=importacoes`}
                            >
                              Lista
                            </Link>
                          ) : null}
                          {wizard && !row.priceListId ? (
                            <Link className="font-semibold text-fal-muted underline" to={wizard}>
                              Assistente
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {hasMore ? (
            <div className="flex justify-center border-t border-fal-line p-3">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMore || loading}
                onClick={() => void loadMore()}
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais importações'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {detailBusy ? <Loading label="Carregando detalhes…" /> : null}

      {detail ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="m-0 text-lg font-extrabold text-fal-navy">{detail.filename}</h2>
              <p className="mt-1 text-sm text-fal-muted">
                {importKindLabel(detail.kind)} · {importStatusLabel(detail.status)} ·{' '}
                {formatDateTime(detail.createdAt)} · {detail.totalItems} itens ·{' '}
                {detail.errorItems} erros
              </p>
              <p className="mt-1 text-xs text-fal-muted">
                Relatório: {formatImportReportSummary(detail.report)}
              </p>
            </div>
            <Button type="button" variant="light" onClick={() => setDetail(null)}>
              Fechar
            </Button>
          </div>
          <div className="mt-3 max-h-80 overflow-auto text-xs">
            <table className="min-w-full">
              <thead>
                <tr className="bg-fal-bg text-left text-fal-muted">
                  <th className="px-2 py-1">Linha</th>
                  <th className="px-2 py-1">Resultado</th>
                  <th className="px-2 py-1">Dados</th>
                  <th className="px-2 py-1">Erros</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.slice(0, 200).map((it) => (
                  <tr key={it.id} className="border-b border-fal-line/50">
                    <td className="px-2 py-1">{it.lineNumber ?? '—'}</td>
                    <td className="px-2 py-1">{importItemResultLabel(it.result)}</td>
                    <td className="px-2 py-1 font-mono">{payloadPreview(it.payload)}</td>
                    <td className="px-2 py-1 text-red-600">{it.errors.join('; ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.items.length > 200 ? (
              <p className="mt-2 text-fal-muted">
                Exibindo 200 de {detail.items.length} linhas.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
