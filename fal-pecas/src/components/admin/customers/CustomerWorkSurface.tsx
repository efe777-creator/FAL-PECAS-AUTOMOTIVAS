import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { formatPhoneMask } from '@/lib/phone'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminGetCustomer,
  adminSetCustomerAssignedPriceList,
  type AdminAssignedPriceListOption,
  type AdminCustomerDetail,
} from '@/services/admin/adminCustomerService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  customerId: string
  assignedLists: AdminAssignedPriceListOption[]
  onClose: () => void
  onError: (msg: string) => void
}

/**
 * Superfície contextual do hub Clientes (Adaptive).
 * Detalhe + lista B2B + pedidos recentes na guia.
 */
export function CustomerWorkSurface({
  customerId,
  assignedLists,
  onClose,
  onError,
}: Props) {
  const toast = useToast()
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingList, setSavingList] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDetail(null)
    void adminGetCustomer(customerId)
      .then((d) => {
        if (cancelled) return
        if (!d) {
          onError('Cliente não encontrado.')
          setDetail(null)
          return
        }
        setDetail(d)
      })
      .catch((e) => {
        if (!cancelled) {
          onError(toUserMessage(e, 'Erro ao abrir cliente'))
          setDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId, onError])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-customer-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {detail ? `Cliente na guia · ${detail.name ?? detail.id.slice(0, 8)}` : 'Cliente na guia'}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto fal-admin-scroll text-sm">
        {loading ? <Loading label="Carregando detalhe…" /> : null}
        {!loading && !detail ? (
          <p className="m-0 text-fal-muted">Não foi possível carregar o cliente.</p>
        ) : null}
        {!loading && detail ? (
          <>
            <h2 className="m-0 text-lg font-extrabold text-fal-fg">{detail.name ?? 'Cliente'}</h2>
            <p className="m-0 text-fal-muted">
              {detail.username ?? '—'} · {detail.document ?? 'sem documento'} · tel{' '}
              {detail.phone ? formatPhoneMask(detail.phone) : '—'}
            </p>
            <p className="m-0 text-xs text-fal-muted">
              Desde {formatDateTime(detail.createdAt)} · {detail.addressCount} endereço
              {detail.addressCount === 1 ? '' : 's'}
            </p>

            <div className="rounded-[10px] border border-fal-line bg-fal-bg p-3">
              <h3 className="m-0 text-xs font-bold uppercase text-fal-muted">Lista B2B (assigned)</h3>
              <p className="mt-1 mb-2 text-xs text-fal-muted">
                Preços de itens e kits nesta lista vencem a vitrine pública no checkout. Crie a lista
                em{' '}
                <Link to="/admin/precos" className="font-semibold underline">
                  Preços
                </Link>{' '}
                com escopo assigned.
              </p>
              <Select
                label="Lista atribuída"
                value={detail.assignedPriceListId ?? ''}
                disabled={savingList || assignedLists.length === 0}
                onChange={(e) => {
                  const next = e.target.value || null
                  void (async () => {
                    setSavingList(true)
                    try {
                      await adminSetCustomerAssignedPriceList({
                        customerId: detail.id,
                        priceListId: next,
                      })
                      const refreshed = await adminGetCustomer(detail.id)
                      if (refreshed) setDetail(refreshed)
                      toast.push('Lista B2B atualizada', 'success')
                    } catch (err) {
                      onError(toUserMessage(err, 'Falha ao atribuir lista'))
                    } finally {
                      setSavingList(false)
                    }
                  })()
                }}
                options={[
                  {
                    value: '',
                    label: assignedLists.length
                      ? 'Nenhuma (preço público)'
                      : 'Nenhuma lista assigned',
                  },
                  ...assignedLists.map((l) => ({
                    value: l.id,
                    label: `${l.name}${l.status !== 'active' ? ` (${l.status})` : ''}`,
                  })),
                ]}
              />
            </div>

            <div>
              <h3 className="m-0 text-xs font-bold uppercase text-fal-muted">Pedidos recentes</h3>
              <ul className="mt-2 space-y-1">
                {detail.recentOrders.length === 0 ? (
                  <li className="text-fal-muted">Nenhum pedido.</li>
                ) : (
                  detail.recentOrders.map((o) => (
                    <li key={o.id}>
                      <Link
                        to={`/admin/pedidos/${o.id}`}
                        className="font-semibold text-fal-fg underline-offset-2 hover:underline"
                      >
                        {o.id.slice(0, 8)}…
                      </Link>{' '}
                      · {orderStatusAdminLabel[o.status] ?? o.status} · {formatMoney(o.total)}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
