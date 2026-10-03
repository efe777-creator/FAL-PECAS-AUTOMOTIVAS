import { useAuth } from '@/contexts/AuthContext'
import { Link } from 'react-router-dom'

export function AccountButton() {
  const { user } = useAuth()
  return (
    <Link className="text-center text-[13px] text-fal-navy" to={user ? '/conta' : '/login'}>
      <b className="block text-xl">👤</b>
      {user ? 'Minha conta' : 'Entrar'}
    </Link>
  )
}
