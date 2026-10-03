import { Footer } from '@/components/layout/Footer'
import { Topbar } from '@/components/layout/Topbar'
import { Header } from '@/components/navigation/Header'
import { MobileNav } from '@/components/navigation/MobileNav'
import { Outlet } from 'react-router-dom'

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
}
