import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { listAddresses } from '@/services/customers/addressService'
import { listMyOrders } from '@/services/customers/orderQueryService'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const cards = [
  { to: '/conta/perfil', title: 'Perfil', desc: 'Nome, telefone e documentos' },
  { to: '/conta/enderecos', title: 'Endereços', desc: 'Casa, trabalho e outros' },
  { to: '/conta/veiculos', title: 'Meus veículos', desc: 'Veículos salvos para busca' },
  { to: '/conta/favoritos', title: 'Favoritos', desc: 'Produtos que você marcou' },
  { to: '/conta/pedidos', title: 'Meus pedidos', desc: 'Consulta de pedidos' },
]

export function AccountHomePage() {
  const { user } = useAuth()
  const isStaff = isStaffRole(user?.role)
  const [stats, setStats] = useState<{ addresses: number; vehicles: number; orders: number } | null>(
    null,
  )

  useEffect(() => {
    if (!user) return
    let active = true
    void (async () => {
      try {
        const [addresses, vehicles, orders] = await Promise.all([
          listAddresses(),
          listSavedVehicles(),
          listMyOrders(),
        ])
        if (active)
          setStats({
            addresses: addresses.length,
            vehicles: vehicles.length,
            orders: orders.length,
          })
      } catch {
        if (active) setStats(null)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  return (
    <div className="rounded-fal border border-fal-line bg-white p-5">
      <h2 className="mt-0 text-xl font-extrabold">Resumo</h2>
      <p className="text-sm text-fal-muted">
        Gerencie seus dados, veículos e favoritos. Use a busca do catálogo para encontrar peças.
      </p>
      {stats ? (
        <p className="mt-3 text-sm text-fal-navy">
          <strong>{stats.orders}</strong> pedido{stats.orders === 1 ? '' : 's'} ·{' '}
          <strong>{stats.addresses}</strong> endereço{stats.addresses === 1 ? '' : 's'} ·{' '}
          <strong>{stats.vehicles}</strong> veículo{stats.vehicles === 1 ? '' : 's'}
        </p>
      ) : null}
      {user && user.emailConfirmed === false ? (
        <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
          <strong>Confirme seu e-mail</strong> — sua conta já está ativa e você pode navegar na
          loja. Verifique a caixa de entrada (e o spam) e clique no link de confirmação.
        </p>
      ) : user?.emailConfirmed ? (
        <p className="mt-3 text-sm text-fal-success">✓ E-mail confirmado</p>
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
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-[12px] border border-fal-line p-4 transition hover:border-fal-yellow"
          >
            <h3 className="m-0 font-extrabold text-fal-navy">{c.title}</h3>
            <p className="mb-0 mt-1 text-sm text-fal-muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
