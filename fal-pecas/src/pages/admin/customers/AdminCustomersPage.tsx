import { Loading } from '@/components/common/Loading'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import {
  adminGetCustomer,
  adminListCustomers,
  staffCanViewCustomersF8,
  type AdminCustomerDetail,
  type AdminCustomerListRow,
} from '@/services/admin/adminCustomerService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminCustomersPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<AdminCustomerListRow[]>([])
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const ok = await staffCanViewCustomersF8()
        setAllowed(ok)
        if (!ok) return
        setRows(await adminListCustomers())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function open(id: string) {
    setError(null)
    try {
      setDetail(await adminGetCustomer(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao abrir cliente')
    }
  }

  if (loading) return <Loading label="Carregando clientes…" />
  if (allowed === false) {
    return (
      <p className="text-sm text-red-600">
        Sem permissão para consultar clientes nesta fase (role atendimento não possui acesso F8).
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy">Clientes</h1>
        <p className="mt-1 text-sm text-fal-muted">Consulta e detalhe — sem CRM nesta fatia.</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Desde</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-fal-line last:border-0 hover:bg-fal-bg/60"
                  onClick={() => void open(r.id)}
                >
                  <td className="px-3 py-2 font-semibold text-fal-navy">{r.name ?? '—'}</td>
                  <td className="px-3 py-2">{r.username ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.document ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          {!detail ? (
            <p className="text-sm text-fal-muted">Selecione um cliente.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <h2 className="m-0 text-lg font-extrabold text-fal-navy">{detail.name ?? 'Cliente'}</h2>
              <p className="m-0 text-fal-muted">
                {detail.username ?? '—'} · {detail.document ?? 'sem documento'} · tel{' '}
                {detail.phone ?? '—'}
              </p>
              <div>
                <h3 className="text-xs font-bold uppercase text-fal-muted">Pedidos recentes</h3>
                <ul className="mt-2 space-y-1">
                  {detail.recentOrders.length === 0 ? (
                    <li className="text-fal-muted">Nenhum pedido.</li>
                  ) : (
                    detail.recentOrders.map((o) => (
                      <li key={o.id}>
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          className="font-semibold text-fal-navy underline-offset-2 hover:underline"
                        >
                          {o.id.slice(0, 8)}…
                        </Link>{' '}
                        · {orderStatusAdminLabel[o.status] ?? o.status} · {formatMoney(o.total)}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
