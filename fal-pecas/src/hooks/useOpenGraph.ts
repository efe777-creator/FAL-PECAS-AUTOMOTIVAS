import { setOpenGraph, type OpenGraphInput } from '@/lib/openGraph'
import { useEffect } from 'react'

/** Aplica Open Graph enquanto a página está montada. */
export function useOpenGraph(input: OpenGraphInput | null | undefined) {
  const title = input?.title
  const description = input?.description
  const url = input?.url
  const image = input?.image
  const type = input?.type

  useEffect(() => {
    if (!title?.trim()) return
    setOpenGraph({ title, description, url, image, type })
  }, [title, description, url, image, type])
}
