/**
 * Builder puro da query CarImages signed-url (testável sem Netlify).
 * A key/secret nunca entram no Vite — só na Function.
 */

export type CarImagesSignedUrlParams = {
  make: string
  model?: string | null
  year?: number | string | null
  view?: string | null
  color?: string | null
  width?: number | string | null
  format?: string | null
  type?: 'car' | 'moto' | null
}

/** Monta search params para GET /api/v1/signed-url (sem key). */
export function buildCarImagesSignedUrlQuery(
  params: CarImagesSignedUrlParams,
): URLSearchParams {
  const q = new URLSearchParams()
  q.set('make', params.make.trim())
  if (params.model?.toString().trim()) q.set('model', String(params.model).trim())
  if (params.year != null && String(params.year).trim() !== '') {
    q.set('year', String(params.year).trim())
  }
  if (params.view?.trim()) q.set('view', params.view.trim())
  if (params.color?.trim()) q.set('color', params.color.trim())
  q.set('width', String(params.width ?? 800))
  q.set('format', params.format?.trim() || 'webp')
  if (params.type === 'moto') q.set('type', 'moto')
  return q
}

export const CARIMAGES_SIGNED_URL_ENDPOINT = 'https://carimagesapi.com/api/v1/signed-url'

/** Path FAL (Netlify Function). */
export const FAL_CARIMAGES_SIGNED_URL_PATH = '/api/carimages-signed-url'
