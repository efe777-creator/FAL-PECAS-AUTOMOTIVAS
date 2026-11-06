import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { SEARCH_INPUT_PLACEHOLDER } from '@/lib/searchCopy'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

/** 404 da loja — busca + atalhos (O1-H). */
export function NotFoundPage() {
  useDocumentTitle('Página não encontrada | FAL Peças Automotivas')
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/catalogo?q=${encodeURIComponent(term)}` : '/catalogo')
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-lg rounded-fal border border-fal-line bg-white p-8 text-center">
        <p className="m-0 text-sm font-extrabold uppercase tracking-wide text-fal-muted">Erro 404</p>
        <h1 className="mt-2 text-[32px] font-black text-fal-navy">Página não encontrada</h1>
        <p className="text-fal-muted">
          O endereço pode ter mudado ou o link está incompleto. Busque a peça no catálogo ou volte ao
          início.
        </p>

        <form onSubmit={onSearch} className="mt-6 text-left">
          <Input
            label="Buscar no catálogo"
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={SEARCH_INPUT_PLACEHOLDER}
            autoComplete="off"
          />
          <Button type="submit" variant="primary" fullWidth className="mt-3">
            Buscar
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/catalogo" variant="light">
            Ver catálogo
          </ButtonLink>
          <ButtonLink to="/" variant="outline">
            Ir para o início
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
