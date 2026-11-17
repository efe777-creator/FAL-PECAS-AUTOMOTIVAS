/**
 * Open Graph / Twitter card mínimos (prep Ads / share).
 * SPA: atualiza meta tags no client; crawlers que não executam JS ainda veem index.html.
 */

const OG_ATTR = 'data-fal-og'

function ensureMeta(attr: 'property' | 'name', key: string): HTMLMetaElement {
  const selector = `meta[${attr}="${key}"][${OG_ATTR}]`
  let el = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute(OG_ATTR, '1')
    document.head.appendChild(el)
  }
  return el
}

export type OpenGraphInput = {
  title: string
  description?: string
  url?: string
  image?: string | null
  type?: string
}

export function setOpenGraph(input: OpenGraphInput): void {
  if (typeof document === 'undefined') return
  const title = input.title.trim() || 'FAL Peças Automotivas'
  const description =
    (input.description ?? '').trim() ||
    'FAL Peças Automotivas — encontre a peça certa para o seu veículo.'
  const url =
    input.url?.trim() ||
    (typeof window !== 'undefined' ? window.location.href : '')
  const image = (input.image ?? '').trim()
  const type = input.type?.trim() || 'website'

  ensureMeta('property', 'og:title').setAttribute('content', title)
  ensureMeta('property', 'og:description').setAttribute('content', description)
  ensureMeta('property', 'og:type').setAttribute('content', type)
  if (url) ensureMeta('property', 'og:url').setAttribute('content', url)
  if (image) ensureMeta('property', 'og:image').setAttribute('content', image)

  ensureMeta('name', 'twitter:card').setAttribute(
    'content',
    image ? 'summary_large_image' : 'summary',
  )
  ensureMeta('name', 'twitter:title').setAttribute('content', title)
  ensureMeta('name', 'twitter:description').setAttribute('content', description)
  if (image) ensureMeta('name', 'twitter:image').setAttribute('content', image)
}
