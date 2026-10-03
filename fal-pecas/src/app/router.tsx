import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loading } from '@/components/common/Loading'

const HomePage = lazy(() =>
  import('@/pages/Home/HomePage').then((m) => ({ default: m.HomePage })),
)
const CatalogPage = lazy(() =>
  import('@/pages/Catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })),
)
const ProductPage = lazy(() =>
  import('@/pages/Product/ProductPage').then((m) => ({ default: m.ProductPage })),
)
const VehiclePage = lazy(() =>
  import('@/pages/Vehicle/VehiclePage').then((m) => ({ default: m.VehiclePage })),
)
const CartPage = lazy(() =>
  import('@/pages/Cart/CartPage').then((m) => ({ default: m.CartPage })),
)
const CheckoutPage = lazy(() =>
  import('@/pages/Checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const AccountPage = lazy(() =>
  import('@/pages/Account/AccountPage').then((m) => ({ default: m.AccountPage })),
)
const OrdersPage = lazy(() =>
  import('@/pages/Orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/Login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/Register/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPassword/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)

function Suspend({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspend>
            <HomePage />
          </Suspend>
        ),
      },
      {
        path: 'catalogo',
        element: (
          <Suspend>
            <CatalogPage />
          </Suspend>
        ),
      },
      {
        path: 'produto/:id',
        element: (
          <Suspend>
            <ProductPage />
          </Suspend>
        ),
      },
      {
        path: 'veiculo',
        element: (
          <Suspend>
            <VehiclePage />
          </Suspend>
        ),
      },
      {
        path: 'carrinho',
        element: (
          <Suspend>
            <CartPage />
          </Suspend>
        ),
      },
      {
        path: 'checkout',
        element: (
          <Suspend>
            <CheckoutPage />
          </Suspend>
        ),
      },
      {
        path: 'conta',
        element: (
          <Suspend>
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          </Suspend>
        ),
      },
      {
        path: 'pedidos',
        element: (
          <Suspend>
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          </Suspend>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspend>
            <LoginPage />
          </Suspend>
        ),
      },
      {
        path: 'cadastro',
        element: (
          <Suspend>
            <RegisterPage />
          </Suspend>
        ),
      },
      {
        path: 'recuperar-senha',
        element: (
          <Suspend>
            <ForgotPasswordPage />
          </Suspend>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
