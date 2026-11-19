import { noteGarageNavigation } from '@/lib/garageNavStack'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Tracker global (MainLayout): memoriza origem fora da garagem
 * (catálogo+filtros, conta, etc.) e alimenta a stack ao entrar.
 * Um único ponto — o botão Voltar não duplica o push.
 */
export function GarageNavTracker() {
  const location = useLocation()

  useEffect(() => {
    noteGarageNavigation(location.pathname, location.search)
  }, [location.pathname, location.search])

  return null
}
