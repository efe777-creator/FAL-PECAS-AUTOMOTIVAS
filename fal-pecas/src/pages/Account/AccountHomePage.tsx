import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  accountInVerificationGrace,
  accountPastVerificationGrace,
  isAccountVerified,
  verificationGraceRemainingLabel,
} from '@/lib/accountVerification'
import { customerOrderListCta } from '@/lib/orderLifecycle'
import { isStaffRole } from '@/services/admin/staffService'
import { listAddresses } from '@/services/customers/addressService'
import { listMyOrders } from '@/services/customers/orderQueryService'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import type { CustomerOrderSummary } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AccountHomePage() {
  useDocumentTitle('Minha conta | FAL Peças Automotivas')
  const { user } = useAuth()
  const isStaff = isStaffRole(user?.role)
  const [stats, setStats] = useState<{ addresses: number; vehicles: number; orders: number } | null>(
    null,
  )
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])

  useEffect(() => {
    if (!user) return
    let active = true
    void (async () => {
      try {
        const [addresses, vehicles, orderRows] = await Promise.all([
          listAddresses(),
          listSavedVehicles(),
          listMyOrders(),
        ])
        if (active) {
          setOrders(orderRows)
          setStats({
            addresses: addresses.length,
            vehicles: vehicles.length,
            orders: orderRows.length,
          })
        }
      } catch {
        if (active) {
          setStats(null)
          setOrders([])
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const pendingActions = useMemo(() => {
    return orders
      .map((o) => {
        const cta = customerOrderListCta(o.status, {
          pickup: o.pickup,
          pickupAuthorized: o.pickupAuthorized,
        })
        if (!cta) return null
        return { id: o.id, cta: cta.replace(/\s*→\s*$/, '') }
      })
      .filter((x): x is { id: string; cta: string } => x != null)
      .slice(0, 5)
  }, [orders])

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
        <h2 className="mt-0 text-xl font-extrabold text-fal-fg">Resumo</h2>
        <p className="text-sm text-fal-muted">
          Seus dados, veículos e pedidos ficam no menu. Use a busca do catálogo para encontrar peças.
        </p>
        {stats ? (
          <p className="mt-3 text-sm text-fal-fg">
            <strong>{stats.orders}</strong> pedido{stats.orders === 1 ? '' : 's'} ·{' '}
            <strong>{stats.addresses}</strong> endereço{stats.addresses === 1 ? '' : 's'} ·{' '}
            <strong>{stats.vehicles}</strong> veículo{stats.vehicles === 1 ? '' : 's'}
          </p>
        ) : null}
        {user && isAccountVerified(user) ? (
          <p className="mt-3 text-sm text-fal-success">✓ Conta confirmada</p>
        ) : user && accountPastVerificationGrace(user) ? (
          <p className="mt-3 rounded-[10px] border border-fal-danger/40 bg-red-50 p-3 text-sm text-fal-fg dark:bg-red-950/30">
            <strong>Confirmação pendente</strong> — após 48h a validação é obrigatória no próximo
            login e no pagamento. Preferimos código no WhatsApp.{' '}
            <Link to="/conta/verificar" className="font-bold underline">
              Validar agora
            </Link>
          </p>
        ) : user && accountInVerificationGrace(user) ? (
          <p className="mt-3 rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 p-3 text-sm text-fal-navy dark:text-fal-fg">
            <strong>Confirme quando puder</strong> — restam{' '}
            {verificationGraceRemainingLabel(user.verificationGraceEndsAt) ?? 'poucas horas'}.
            Depois das 48h (ou no 1º pagamento) pediremos validação.{' '}
            <Link to="/conta/verificar" className="font-bold underline">
              Ver opções
            </Link>
          </p>
        ) : user && !user.accountVerifiedAt ? (
          <p className="mt-3 rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 p-3 text-sm text-fal-navy dark:text-fal-fg">
            <strong>Confirme a conta</strong> — e-mail ou WhatsApp (celular válido).{' '}
            <Link to="/conta/verificar" className="font-bold underline">
              Abrir confirmação
            </Link>
          </p>
        ) : null}
        {isStaff ? (
          <p className="mt-3">
            <Link
              to="/admin"
              className="inline-flex rounded-[10px] bg-fal-navy px-4 py-2.5 text-sm font-extrabold text-white"
            >
              Abrir painel da loja
            </Link>
          </p>
        ) : null}
        <p className="mb-0 mt-4 text-sm">
          <Link to="/catalogo" className="font-semibold text-fal-accent underline-offset-2 hover:underline">
            Ver catálogo →
          </Link>
        </p>
      </div>

      {pendingActions.length > 0 ? (
        <section className="rounded-fal border-2 border-fal-yellow-dark/40 bg-fal-yellow/15 p-5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
            Avisos dos seus pedidos
          </p>
          <h2 className="mt-1 mb-0 text-lg font-extrabold text-fal-fg">Faça agora</h2>
          <ul className="mb-0 mt-3 list-none space-y-2 p-0">
            {pendingActions.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/conta/pedidos/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg no-underline"
                >
                  <span>
                    Pedido {a.id.slice(0, 8)}… · {a.cta}
                  </span>
                  <span className="text-xs font-bold text-fal-accent">Abrir →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
