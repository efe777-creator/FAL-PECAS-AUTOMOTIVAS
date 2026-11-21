import { AdminProductKitReplacePanel } from '@/components/admin/AdminProductKitReplacePanel'
import { Button } from '@/components/common/Button'
import { productStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminListKitsUsingProduct,
  type AdminKitUsageRow,
} from '@/services/admin/adminProductKitService'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  productId: string
}

/** Na ficha do item: quais kits usam este componente + substituição assistida (K8). */
export function AdminProductKitUsageSection({ productId }: Props) {
  const [rows, setRows] = useState<AdminKitUsageRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [replaceOpen, setReplaceOpen] = useState(false)

  const reload = useCallback(async () => {
    setRows(await adminListKitsUsingProduct(productId))
  }, [productId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar kits')))
  }, [reload])

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 font-extrabold text-fal-fg">Usado em kits</h2>
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Dependências deste item. Alterações de preço/status/aplicação impactam estes kits.
          </p>
        </div>
        {rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant={replaceOpen ? 'outline' : 'primary'}
            onClick={() => setReplaceOpen((v) => !v)}
          >
            {replaceOpen ? 'Ocultar substituição' : 'Substituir em kits'}
          </Button>
        ) : null}
      </div>

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      {replaceOpen ? (
        <AdminProductKitReplacePanel
          oldComponentProductId={productId}
          onCancel={() => setReplaceOpen(false)}
          onDone={() => {
            setReplaceOpen(false)
            void reload().catch((e) => setError(toUserMessage(e, 'Falha ao recarregar')))
          }}
        />
      ) : null}

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-fal-muted">Este item ainda não entra em nenhum kit.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm"
            >
              <div>
                <Link
                  to={`/admin/produtos/${row.kitProductId}`}
                  className="font-semibold text-fal-fg underline"
                >
                  {row.kitCommercialRef || row.kitSku}
                </Link>
                <span className="text-fal-muted"> — {row.kitName}</span>
              </div>
              <span className="text-xs text-fal-muted">
                qty {row.quantity} · {row.kitPriceMode} · {productStatusLabel(row.kitStatus)}
                {row.kitCompatReviewRequired ? ' · revisão PVC' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
