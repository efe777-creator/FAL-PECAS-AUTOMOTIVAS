import {
  getHomePresentationSettings,
  invalidateHomePresentationCache,
  type HomePresentationSettings,
} from '@/services/home/homeContentService'
import { useEffect, useState } from 'react'

const DEFAULT: HomePresentationSettings = {
  featuredDisplayLimit: 16,
  showOfertaBadge: true,
  showDiscountPercent: true,
}

/** HOME-07 — flags de selo/% na vitrine (não afetam preço). */
export function useHomePresentation(): HomePresentationSettings {
  const [settings, setSettings] = useState<HomePresentationSettings>(DEFAULT)

  useEffect(() => {
    let active = true

    function load(bustCache: boolean) {
      if (bustCache) invalidateHomePresentationCache()
      void getHomePresentationSettings().then((s) => {
        if (active) setSettings(s)
      })
    }

    load(false)
    function onFocus() {
      load(true)
    }
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return settings
}
