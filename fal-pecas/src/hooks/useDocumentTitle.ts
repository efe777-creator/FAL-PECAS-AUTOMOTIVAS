import { useEffect } from 'react'

const DEFAULT_TITLE = 'FAL Peças Automotivas'

/**
 * Define `document.title` enquanto a página está montada.
 * Não restaura o título anterior no cleanup — em SPA o cleanup da rota
 * que sai roda antes do efeito da rota que entra e apagaria o título novo.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const next = (title ?? '').trim() || DEFAULT_TITLE
    document.title = next
  }, [title])
}

export { DEFAULT_TITLE as FAL_DEFAULT_DOCUMENT_TITLE }
