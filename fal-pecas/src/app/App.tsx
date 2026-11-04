import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastProvider } from '@/components/common/Toast'
import { router } from '@/app/router'
import { RouterProvider } from 'react-router-dom'

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          {/* Toast fora do router: CTAs usam <a href>, não <Link> */}
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
