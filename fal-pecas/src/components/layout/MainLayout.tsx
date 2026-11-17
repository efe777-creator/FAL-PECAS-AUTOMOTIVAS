import { StorefrontAnalytics } from '@/components/analytics/StorefrontAnalytics'
import { Footer } from '@/components/layout/Footer'
import { Topbar } from '@/components/layout/Topbar'
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner'
import { Header } from '@/components/navigation/Header'
import { MobileNav } from '@/components/navigation/MobileNav'
import { ScrollToTop } from '@/components/navigation/ScrollToTop'
import {
  readStoreTheme,
  toggleStoreTheme,
  writeStoreTheme,
  type StoreTheme,
} from '@/lib/storeTheme'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'

export function MainLayout() {
  const [theme, setTheme] = useState<StoreTheme>(() => readStoreTheme())

  const onThemeToggle = () => {
    setTheme((t) => {
      const next = toggleStoreTheme(t)
      writeStoreTheme(next)
      return next
    })
  }

  return (
    <div
      className={`flex min-h-screen flex-col bg-fal-bg text-fal-fg ${theme === 'dark' ? 'dark' : ''}`}
    >
      <ScrollToTop />
      <StorefrontAnalytics />
      <Topbar />
      <Header theme={theme} onThemeToggle={onThemeToggle} />
      <main className="flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <CookieConsentBanner />
      <MobileNav />
    </div>
  )
}
