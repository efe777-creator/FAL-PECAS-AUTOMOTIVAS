import { Button } from '@/components/common/Button'
import { formatDateTime } from '@/lib/datetime'
import { importStatusLabel } from '@/lib/importLabels'
import type {
  PriceListImportDetail,
  PriceListImportSummary,
} from '@/services/admin/adminPriceListService'
import { Link } from 'react-router-dom'

type Props = {
  allowed: boolean
  imports: PriceListImportSummary[]
  importDetail: PriceListImportDetail | null
  onOpenWizard: () => void
  onOpenDetail: (importId: string) => void
  onCloseDetail: () => void
}

export function PriceListImportsTab({
  allowed,
  imports,
  importDetail,
  onOpenWizard,
  onOpenDetail,
  onCloseDetail,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-lg font-extrabold text-fal-navy">Histórico de importações</h2>
            <p className="mt-1 text-sm text-fal-muted">
              Importações desta lista de preços. Histórico geral:{' '}
              <Link className="font-semibold text-fal-navy underline" to="/admin/importacoes">
                Importações
              </Link>
              .
            </p>
          </div>
          <Button type="button" disabled={!allowed} onClick={onOpenWizard}>
            Nova importação
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Arquivo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Linhas</th>
                <th className="px-3 py-2 text-right">Erros</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-fal-muted">
                    Nenhuma importação registrada para esta lista.
                  </td>
                </tr>
              ) : (
                imports.map((imp) => (
                  <tr key={imp.id} className="border-b border-fal-line/70">
                    <td className="px-3 py-2 text-xs">{formatDateTime(imp.createdAt)}</td>
                    <td className="px-3 py-2">{imp.filename}</td>
                    <td className="px-3 py-2">{importStatusLabel(imp.status)}</td>
                    <td className="px-3 py-2 text-right">{imp.totalItems}</td>
                    <td className="px-3 py-2 text-right">{imp.errorItems}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-semibold text-fal-navy underline"
                        onClick={() => onOpenDetail(imp.id)}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {importDetail ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          <h3 className="m-0 font-extrabold text-fal-navy">{importDetail.filename}</h3>
          <p className="text-sm text-fal-muted">
            {importStatusLabel(importDetail.status)} · {formatDateTime(importDetail.createdAt)} ·{' '}
            {importDetail.totalItems} itens
          </p>
          <div className="mt-2 max-h-64 overflow-auto text-xs">
            <table className="min-w-full">
              <thead>
                <tr className="bg-fal-bg text-left">
                  <th className="px-2 py-1">Linha</th>
                  <th className="px-2 py-1">Resultado</th>
                  <th className="px-2 py-1">Payload</th>
                  <th className="px-2 py-1">Erros</th>
                </tr>
              </thead>
              <tbody>
                {importDetail.items.slice(0, 100).map((it) => (
                  <tr key={it.id}>
                    <td className="px-2 py-1">{it.lineNumber ?? '—'}</td>
                    <td className="px-2 py-1">{it.result ?? '—'}</td>
                    <td className="px-2 py-1 font-mono">
                      {String(it.payload.sku ?? '')} {String(it.payload.price ?? '')}
                    </td>
                    <td className="px-2 py-1 text-red-600">{it.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="light" className="mt-2" onClick={onCloseDetail}>
            Fechar detalhes
          </Button>
        </div>
      ) : null}
    </div>
  )
}
