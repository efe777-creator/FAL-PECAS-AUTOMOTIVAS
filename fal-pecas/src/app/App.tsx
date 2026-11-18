import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { GarageProvider } from '@/contexts/GarageContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ConfirmDialogHost } from '@/components/common/ConfirmDialog'
import { ToastProvider } from '@/components/common/Toast'
import { PendingGarageFlush } from '@/components/vehicle/PendingGarageFlush'
import { router } from '@/app/router'
import { RouterProvider } from 'react-router-dom'

/**
 * Toast e ConfirmDialog ficam dentro do RouterProvider (via RouterRoot)
 * para poderem usar <Link> e rotas. Providers de auth/cart/favorites/garagem ficam fora.
 */
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GarageProvider>
        <FavoritesProvider>
          <CartProvider>{children}</CartProvider>
        </FavoritesProvider>
      </GarageProvider>
    </AuthProvider>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  )
}

/** Envolver o layout da loja/admin — toast com Link + ConfirmDialog. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PendingGarageFlush />
      {children}
      <ConfirmDialogHost />
    </ToastProvider>
  )
}

export default App
