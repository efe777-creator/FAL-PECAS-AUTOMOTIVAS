import { AppChrome } from '@/app/App'
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
const ResetPasswordPage = lazy(() =>
  import('@/pages/ForgotPassword/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
)
const TermsPage = lazy(() =>
  import('@/pages/Legal/LegalDocumentPage').then((m) => ({ default: m.TermsPage })),
)
const PrivacyPage = lazy(() =>
  import('@/pages/Legal/LegalDocumentPage').then((m) => ({ default: m.PrivacyPage })),
)
const ReturnsPage = lazy(() =>
  import('@/pages/Legal/LegalDocumentPage').then((m) => ({ default: m.ReturnsPage })),
)

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminOrdersHubPage = lazy(() =>
  import('@/pages/admin/orders/AdminOrdersHubPage').then((m) => ({
    default: m.AdminOrdersHubPage,
  })),
)
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/orders/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
)
const AdminOrdersAreaPage = lazy(() =>
  import('@/pages/admin/orders/AdminOrdersAreaPage').then((m) => ({
    default: m.AdminOrdersAreaPage,
  })),
)
const AdminOrdersViewPage = lazy(() =>
  import('@/pages/admin/orders/AdminOrdersViewPage').then((m) => ({
    default: m.AdminOrdersViewPage,
  })),
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
const AdminHomeContentPage = lazy(() =>
  import('@/pages/admin/home/AdminHomeContentPage').then((m) => ({
    default: m.AdminHomeContentPage,
  })),
)
const AdminSearchPrepPage = lazy(() =>
  import('@/pages/admin/search/AdminSearchPrepPage').then((m) => ({
    default: m.AdminSearchPrepPage,
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
const AdminVehicleMasterImportPage = lazy(() =>
  import('@/pages/admin/vehicles/AdminVehicleMasterImportPage').then((m) => ({
    default: m.AdminVehicleMasterImportPage,
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
const AdminApplicationsPage = lazy(() =>
  import('@/pages/admin/products/AdminApplicationsPage').then((m) => ({
    default: m.AdminApplicationsPage,
  })),
)
const AdminHfBundleImportPage = lazy(() =>
  import('@/pages/admin/products/AdminHfBundleImportPage').then((m) => ({
    default: m.AdminHfBundleImportPage,
  })),
)
const AdminImageSkuImportPage = lazy(() =>
  import('@/pages/admin/products/AdminImageSkuImportPage').then((m) => ({
    default: m.AdminImageSkuImportPage,
  })),
)
const AdminImportsPage = lazy(() =>
  import('@/pages/admin/imports/AdminImportsPage').then((m) => ({
    default: m.AdminImportsPage,
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
const AdminLogisticsHubPage = lazy(() =>
  import('@/pages/admin/logistics/AdminLogisticsHubPage').then((m) => ({
    default: m.AdminLogisticsHubPage,
  })),
)
const AdminOwnDeliveryPage = lazy(() =>
  import('@/pages/admin/logistics/AdminOwnDeliveryPage').then((m) => ({
    default: m.AdminOwnDeliveryPage,
  })),
)
const AdminMelhorEnvioPage = lazy(() =>
  import('@/pages/admin/logistics/AdminMelhorEnvioPage').then((m) => ({
    default: m.AdminMelhorEnvioPage,
  })),
)
const AdminShippingBoxesPage = lazy(() =>
  import('@/pages/admin/logistics/AdminShippingBoxesPage').then((m) => ({
    default: m.AdminShippingBoxesPage,
  })),
)
const AdminShippingSettingsPage = lazy(() =>
  import('@/pages/admin/logistics/AdminShippingSettingsPage').then((m) => ({
    default: m.AdminShippingSettingsPage,
  })),
)
const AdminShippingEtaPolicyPage = lazy(() =>
  import('@/pages/admin/logistics/AdminShippingEtaPolicyPage').then((m) => ({
    default: m.AdminShippingEtaPolicyPage,
  })),
)
const AdminPaymentsHubPage = lazy(() =>
  import('@/pages/admin/payments/AdminPaymentsHubPage').then((m) => ({
    default: m.AdminPaymentsHubPage,
  })),
)
const AdminPaymentProvidersPage = lazy(() =>
  import('@/pages/admin/payments/AdminPaymentProvidersPage').then((m) => ({
    default: m.AdminPaymentProvidersPage,
  })),
)
const AdminPaymentMethodsPage = lazy(() =>
  import('@/pages/admin/payments/AdminPaymentMethodsPage').then((m) => ({
    default: m.AdminPaymentMethodsPage,
  })),
)
const AdminMercadoPagoPage = lazy(() =>
  import('@/pages/admin/payments/AdminMercadoPagoPage').then((m) => ({
    default: m.AdminMercadoPagoPage,
  })),
)
const AdminPaymentWebhooksPage = lazy(() =>
  import('@/pages/admin/payments/AdminPaymentWebhooksPage').then((m) => ({
    default: m.AdminPaymentWebhooksPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFound/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const AdminNotFoundPage = lazy(() =>
  import('@/pages/admin/AdminNotFoundPage').then((m) => ({ default: m.AdminNotFoundPage })),
)
const OrderConfirmationPage = lazy(() =>
  import('@/pages/Checkout/OrderConfirmationPage').then((m) => ({
    default: m.OrderConfirmationPage,
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
      <AppChrome>
        <AdminSuspend>
          <AdminLayout />
        </AdminSuspend>
      </AppChrome>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'produtos', element: <AdminProductsPage /> },
      { path: 'aplicacoes', element: <AdminApplicationsPage /> },
      { path: 'produtos/importar', element: <AdminProductImportPage /> },
      {
        path: 'produtos/importar-aplicacoes',
        element: <AdminApplicationsImportPage />,
      },
      {
        path: 'produtos/importar-hf',
        element: <AdminHfBundleImportPage />,
      },
      {
        path: 'produtos/importar-imagens',
        element: <AdminImageSkuImportPage />,
      },
      { path: 'produtos/novo', element: <AdminProductFormPage /> },
      { path: 'produtos/:id', element: <AdminProductFormPage /> },
      { path: 'precos', element: <AdminPriceListsPage /> },
      { path: 'precos/:id', element: <AdminPriceListDetailPage /> },
      { path: 'importacoes', element: <AdminImportsPage /> },
      { path: 'categorias', element: <AdminCategoriesPage /> },
      { path: 'home', element: <AdminHomeContentPage /> },
      { path: 'busca', element: <AdminSearchPrepPage /> },
      { path: 'montadoras', element: <AdminManufacturersPage /> },
      { path: 'veiculos', element: <AdminVehiclesPage /> },
      {
        path: 'veiculos/importar-mestre',
        element: <AdminVehicleMasterImportPage />,
      },
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
      { path: 'pedidos', element: <AdminOrdersHubPage /> },
      { path: 'pedidos/lista', element: <AdminOrdersPage /> },
      { path: 'pedidos/aguardando-pagamento', element: <AdminOrdersAreaPage /> },
      { path: 'pedidos/analise', element: <AdminOrdersAreaPage /> },
      { path: 'pedidos/separacao', element: <AdminOrdersAreaPage /> },
      { path: 'pedidos/expedicao', element: <AdminOrdersAreaPage /> },
      { path: 'pedidos/visao/:viewId', element: <AdminOrdersViewPage /> },
      { path: 'pedidos/:id', element: <AdminOrderDetailPage /> },
      { path: 'clientes', element: <AdminCustomersPage /> },
      { path: 'estoque', element: <AdminInventoryPage /> },
      { path: 'logistica', element: <AdminLogisticsHubPage /> },
      { path: 'logistica/origem', element: <AdminShippingOriginPage /> },
      { path: 'logistica/frete-proprio', element: <AdminOwnDeliveryPage /> },
      { path: 'logistica/melhor-envio', element: <AdminMelhorEnvioPage /> },
      { path: 'logistica/caixas', element: <AdminShippingBoxesPage /> },
      { path: 'logistica/prazos', element: <AdminShippingEtaPolicyPage /> },
      { path: 'logistica/configuracoes', element: <AdminShippingSettingsPage /> },
      {
        path: 'logistica/:slug',
        element: (
          <Suspend>
            <AdminNotFoundPage />
          </Suspend>
        ),
      },
      { path: 'frete', element: <Navigate to="/admin/logistica/origem" replace /> },
      { path: 'pagamentos', element: <AdminPaymentsHubPage /> },
      { path: 'pagamentos/provedores', element: <AdminPaymentProvidersPage /> },
      { path: 'pagamentos/metodos', element: <AdminPaymentMethodsPage /> },
      { path: 'pagamentos/metodos/mercado-pago', element: <AdminMercadoPagoPage /> },
      { path: 'pagamentos/webhooks', element: <AdminPaymentWebhooksPage /> },
      { path: 'relatorios', element: <AdminReportsPage /> },
      { path: 'operadores', element: <AdminOperatorsPage /> },
      {
        path: '*',
        element: (
          <Suspend>
            <AdminNotFoundPage />
          </Suspend>
        ),
      },
    ],
  },
  {
    path: '/',
    element: (
      <AppChrome>
        <MainLayout />
      </AppChrome>
    ),
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
        path: 'produto/:slugOrId',
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
        path: 'termos',
        element: (
          <Suspend>
            <TermsPage />
          </Suspend>
        ),
      },
      {
        path: 'privacidade',
        element: (
          <Suspend>
            <PrivacyPage />
          </Suspend>
        ),
      },
      {
        path: 'trocas-devolucoes',
        element: (
          <Suspend>
            <ReturnsPage />
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
      {
        path: 'redefinir-senha',
        element: (
          <Suspend>
            <ResetPasswordPage />
          </Suspend>
        ),
      },
      {
        path: 'pedido/:id/confirmacao',
        element: (
          <ProtectedRoute>
            <Suspend>
              <OrderConfirmationPage />
            </Suspend>
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <Suspend>
            <NotFoundPage />
          </Suspend>
        ),
      },
    ],
  },
])
