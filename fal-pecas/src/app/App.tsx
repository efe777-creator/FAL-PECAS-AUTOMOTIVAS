import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ConfirmDialogHost } from '@/components/common/ConfirmDialog'
import { ToastProvider } from '@/components/common/Toast'
import { router } from '@/app/router'
import { RouterProvider } from 'react-router-dom'

/**
 * Toast e ConfirmDialog ficam dentro do RouterProvider (via RouterRoot)
 * para poderem usar <Link> e rotas. Providers de auth/cart/favorites ficam fora.
 */
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>{children}</CartProvider>
      </FavoritesProvider>
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
      {children}
      <ConfirmDialogHost />
    </ToastProvider>
  )
}

export default App
