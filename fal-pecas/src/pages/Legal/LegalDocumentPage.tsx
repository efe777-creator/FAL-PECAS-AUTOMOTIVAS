import { Container } from '@/components/layout/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { LEGAL_COPY } from '@/lib/legalCopy'
import { type LegalDocKind, legalVersionFor } from '@/lib/legalVersions'
import { getStoreIdentity } from '@/lib/storeIdentity'
import { Link } from 'react-router-dom'

export function LegalDocumentPage({ kind }: { kind: LegalDocKind }) {
  const doc = LEGAL_COPY[kind]
  const store = getStoreIdentity()
  const version = legalVersionFor(kind)
  useDocumentTitle(`${doc.title} | FAL Peças Automotivas`)

  const related = (doc.related ?? []).filter((r) => r.to !== '/suporte')

  return (
    <Container className="py-8 sm:py-10">
      <p className="mb-4 text-sm text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        {' / '}
        <Link to="/suporte" className="hover:underline">
          Suporte
        </Link>
        {' / '}
        <span className="text-fal-ink">{doc.title}</span>
      </p>
      <h1 className="m-0 text-[28px] font-black text-fal-navy dark:text-fal-fg sm:text-[32px]">
        {doc.title}
      </h1>
      <p className="mt-2 text-xs font-semibold tracking-wide text-fal-muted uppercase">
        Versão {version}
      </p>
      <p className="mt-3 max-w-2xl text-sm text-fal-muted sm:text-base">{doc.lead}</p>
      <ul className="mt-6 max-w-2xl list-disc space-y-2 pl-5 text-sm text-fal-ink sm:text-base">
        {doc.bullets.map((line) => (
          <li key={line.slice(0, 48)}>{line}</li>
        ))}
      </ul>

      {related.length > 0 ? (
        <nav className="mt-8 max-w-2xl" aria-label="Documentos relacionados">
          <p className="m-0 text-sm font-semibold text-fal-fg">Também veja</p>
          <ul className="mt-2 list-none space-y-1 p-0 text-sm">
            {related.map((r) => (
              <li key={r.to}>
                <Link
                  to={r.to}
                  className="font-semibold text-fal-navy dark:text-fal-fg hover:underline"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <p className="mt-8 max-w-2xl text-sm text-fal-muted">
        Dúvidas: use a Central de Suporte
        {store.email ? (
          <>
            {' '}
            ou o e-mail (
            <a
              className="font-semibold text-fal-navy dark:text-fal-fg hover:underline"
              href={`mailto:${store.email}`}
            >
              {store.email}
            </a>
            )
          </>
        ) : null}
        . Documento operacional da loja — revisão jurídica externa permanece recomendada antes do
        go-live comercial pleno.
      </p>
      <p className="mt-4 max-w-2xl text-sm">
        <Link
          to="/suporte"
          className="font-semibold text-fal-navy dark:text-fal-fg hover:underline"
        >
          ← Voltar à Central de Suporte
        </Link>
      </p>
    </Container>
  )
}

export function TermsPage() {
  return <LegalDocumentPage kind="termos" />
}

export function CommercialTermsPage() {
  return <LegalDocumentPage kind="termos-comerciais" />
}

export function PrivacyPage() {
  return <LegalDocumentPage kind="privacidade" />
}

export function CookiesPage() {
  return <LegalDocumentPage kind="cookies" />
}

export function ShippingPolicyPage() {
  return <LegalDocumentPage kind="frete-entrega" />
}

export function ReturnsPage() {
  return <LegalDocumentPage kind="trocas-devolucoes" />
}

export function WarrantyPage() {
  return <LegalDocumentPage kind="garantia" />
}

export function CompatibilityPolicyPage() {
  return <LegalDocumentPage kind="compatibilidade" />
}
