import { MainLayout } from '@/components/layout/MainLayout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { StaffRoute } from '@/app/StaffRoute'
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
const AccountLayout = lazy(() =>
  import('@/components/account/AccountLayout').then((m) => ({ default: m.AccountLayout })),
)
const AccountHomePage = lazy(() =>
  import('@/pages/Account/AccountHomePage').then((m) => ({ default: m.AccountHomePage })),
)
const AccountProfilePage = lazy(() =>
  import('@/pages/Account/AccountProfilePage').then((m) => ({ default: m.AccountProfilePage })),
)
const AccountAddressesPage = lazy(() =>
  import('@/pages/Account/AccountAddressesPage').then((m) => ({ default: m.AccountAddressesPage })),
)
const AccountVehiclesPage = lazy(() =>
  import('@/pages/Account/AccountVehiclesPage').then((m) => ({ default: m.AccountVehiclesPage })),
)
const AccountFavoritesPage = lazy(() =>
  import('@/pages/Account/AccountFavoritesPage').then((m) => ({ default: m.AccountFavoritesPage })),
)
const AccountOrdersPage = lazy(() =>
  import('@/pages/Account/AccountOrdersPage').then((m) => ({ default: m.AccountOrdersPage })),
)
const AccountOrderDetailPage = lazy(() =>
  import('@/pages/Account/AccountOrderDetailPage').then((m) => ({
    default: m.AccountOrderDetailPage,
  })),
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

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/orders/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
)
const AdminInventoryPage = lazy(() =>
  import('@/pages/admin/inventory/AdminInventoryPage').then((m) => ({
    default: m.AdminInventoryPage,
  })),
)
const AdminCustomersPage = lazy(() =>
  import('@/pages/admin/customers/AdminCustomersPage').then((m) => ({
    default: m.AdminCustomersPage,
  })),
)
const AdminReportsPage = lazy(() =>
  import('@/pages/admin/reports/AdminReportsPage').then((m) => ({
    default: m.AdminReportsPage,
  })),
)
const AdminOrderDetailPage = lazy(() =>
  import('@/pages/admin/orders/AdminOrderDetailPage').then((m) => ({
    default: m.AdminOrderDetailPage,
  })),
)
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/categories/AdminCategoriesPage').then((m) => ({
    default: m.AdminCategoriesPage,
  })),
)
const AdminManufacturersPage = lazy(() =>
  import('@/pages/admin/manufacturers/AdminManufacturersPage').then((m) => ({
    default: m.AdminManufacturersPage,
  })),
)
const AdminVehiclesPage = lazy(() =>
  import('@/pages/admin/vehicles/AdminVehiclesPage').then((m) => ({
    default: m.AdminVehiclesPage,
  })),
)
const AdminBrandsPage = lazy(() =>
  import('@/pages/admin/brands/AdminBrandsPage').then((m) => ({ default: m.AdminBrandsPage })),
)
const AdminSuppliersPage = lazy(() =>
  import('@/pages/admin/suppliers/AdminSuppliersPage').then((m) => ({
    default: m.AdminSuppliersPage,
  })),
)
const AdminSupplierConversionImportPage = lazy(() =>
  import('@/pages/admin/suppliers/AdminSupplierConversionImportPage').then((m) => ({
    default: m.AdminSupplierConversionImportPage,
  })),
)
const AdminSupplierCostImportPage = lazy(() =>
  import('@/pages/admin/suppliers/AdminSupplierCostImportPage').then((m) => ({
    default: m.AdminSupplierCostImportPage,
  })),
)
const AdminProductsPage = lazy(() =>
  import('@/pages/admin/products/AdminProductsPage').then((m) => ({
    default: m.AdminProductsPage,
  })),
)
const AdminProductFormPage = lazy(() =>
  import('@/pages/admin/products/AdminProductFormPage').then((m) => ({
    default: m.AdminProductFormPage,
  })),
)
const AdminProductImportPage = lazy(() =>
  import('@/pages/admin/products/AdminProductImportPage').then((m) => ({
    default: m.AdminProductImportPage,
  })),
)
const AdminApplicationsImportPage = lazy(() =>
  import('@/pages/admin/products/AdminApplicationsImportPage').then((m) => ({
    default: m.AdminApplicationsImportPage,
  })),
)
const AdminHfBundleImportPage = lazy(() =>
  import('@/pages/admin/products/AdminHfBundleImportPage').then((m) => ({
    default: m.AdminHfBundleImportPage,
  })),
)
const AdminPriceListsPage = lazy(() =>
  import('@/pages/admin/prices/AdminPriceListsPage').then((m) => ({
    default: m.AdminPriceListsPage,
  })),
)
const AdminPriceListDetailPage = lazy(() =>
  import('@/pages/admin/prices/AdminPriceListDetailPage').then((m) => ({
    default: m.AdminPriceListDetailPage,
  })),
)
const AdminShippingOriginPage = lazy(() =>
  import('@/pages/admin/shipping/AdminShippingOriginPage').then((m) => ({
    default: m.AdminShippingOriginPage,
  })),
)
const AdminOperatorsPage = lazy(() =>
  import('@/pages/admin/operators/AdminOperatorsPage').then((m) => ({
    default: m.AdminOperatorsPage,
  })),
)

function Suspend({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

function AdminSuspend({ children }: { children: ReactNode }) {
  return (
    <StaffRoute>
      <Suspend>{children}</Suspend>
    </StaffRoute>
  )
}

export const router = createBrowserRouter([
  {
    path: '/admin',
    element: (
      <AdminSuspend>
        <AdminLayout />
      </AdminSuspend>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'produtos', element: <AdminProductsPage /> },
      { path: 'produtos/importar', element: <AdminProductImportPage /> },
      {
        path: 'produtos/importar-aplicacoes',
        element: <AdminApplicationsImportPage />,
      },
      {
        path: 'produtos/importar-hf',
        element: <AdminHfBundleImportPage />,
      },
      { path: 'produtos/novo', element: <AdminProductFormPage /> },
      { path: 'produtos/:id', element: <AdminProductFormPage /> },
      { path: 'precos', element: <AdminPriceListsPage /> },
      { path: 'precos/:id', element: <AdminPriceListDetailPage /> },
      { path: 'categorias', element: <AdminCategoriesPage /> },
      { path: 'montadoras', element: <AdminManufacturersPage /> },
      { path: 'veiculos', element: <AdminVehiclesPage /> },
      { path: 'fabricantes', element: <AdminBrandsPage /> },
      { path: 'fornecedores', element: <AdminSuppliersPage /> },
      {
        path: 'fornecedores/importar-conversoes',
        element: <AdminSupplierConversionImportPage />,
      },
      {
        path: 'fornecedores/importar-custos',
        element: <AdminSupplierCostImportPage />,
      },
      { path: 'pedidos', element: <AdminOrdersPage /> },
      { path: 'pedidos/:id', element: <AdminOrderDetailPage /> },
      { path: 'clientes', element: <AdminCustomersPage /> },
      { path: 'estoque', element: <AdminInventoryPage /> },
      { path: 'frete', element: <AdminShippingOriginPage /> },
      { path: 'relatorios', element: <AdminReportsPage /> },
      { path: 'operadores', element: <AdminOperatorsPage /> },
    ],
  },
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
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          </Suspend>
        ),
      },
      {
        path: 'conta',
        element: (
          <Suspend>
            <ProtectedRoute>
              <AccountLayout />
            </ProtectedRoute>
          </Suspend>
        ),
        children: [
          { index: true, element: <AccountHomePage /> },
          { path: 'perfil', element: <AccountProfilePage /> },
          { path: 'enderecos', element: <AccountAddressesPage /> },
          { path: 'veiculos', element: <AccountVehiclesPage /> },
          { path: 'favoritos', element: <AccountFavoritesPage /> },
          { path: 'pedidos', element: <AccountOrdersPage /> },
          { path: 'pedidos/:id', element: <AccountOrderDetailPage /> },
        ],
      },
      {
        path: 'pedidos',
        element: <Navigate to="/conta/pedidos" replace />,
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
