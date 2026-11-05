import { useEffect } from 'react'

const DEFAULT_TITLE = 'FAL Peças Automotivas'

/**
 * Define `document.title` na montagem e restaura o título anterior ao desmontar.
 * Se `title` for vazio, usa o padrão da loja.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const prev = document.title
    const next = (title ?? '').trim() || DEFAULT_TITLE
    document.title = next
    return () => {
      document.title = prev || DEFAULT_TITLE
    }
  }, [title])
}

export { DEFAULT_TITLE as FAL_DEFAULT_DOCUMENT_TITLE }
