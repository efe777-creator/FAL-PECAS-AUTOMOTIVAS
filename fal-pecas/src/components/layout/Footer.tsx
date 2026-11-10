import { Link } from 'react-router-dom'
import { Container } from './Container'
import logoFal from '@/assets/logos/logo-fal-transparente.png'
import { useAuth } from '@/contexts/AuthContext'
import { getStoreIdentity } from '@/lib/storeIdentity'
import { storeWhatsAppPhone, whatsAppHref } from '@/lib/whatsapp'

export function Footer() {
  const { user } = useAuth()
  const store = getStoreIdentity()
  const wa = storeWhatsAppPhone()

  return (
    <footer className="mt-8 bg-fal-navy-dark py-[38px] text-[#dfe5e9] sm:mt-12">
      <Container className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <img
            src={logoFal}
            alt="FAL Peças Automotivas"
            className="mb-3 block h-[86px] w-auto max-w-[120px] object-contain object-left"
          />
          <p className="m-0 max-w-sm text-sm text-[#c5cbd1]">
            {store.legalName} — peça certa para o seu veículo.
          </p>
          {store.cnpjFormatted ? (
            <p className="mt-2 text-sm text-[#c5cbd1]">CNPJ {store.cnpjFormatted}</p>
          ) : null}
          {store.cityState ? (
            <p className="mt-1 text-sm text-[#c5cbd1]">{store.cityState}</p>
          ) : null}
          <div className="mt-3 space-y-1 text-[13px]">
            {store.phoneDisplay ? (
              <a
                className="block text-[#c5cbd1] hover:text-white"
                href={`tel:+55${store.phone}`}
              >
                Tel. {store.phoneDisplay}
              </a>
            ) : null}
            {store.email ? (
              <a
                className="block text-[#c5cbd1] hover:text-white"
                href={`mailto:${store.email}`}
              >
                {store.email}
              </a>
            ) : null}
            {wa ? (
              <a
                className="block font-semibold text-fal-yellow hover:text-white"
                href={whatsAppHref(wa, 'Olá! Vim pelo site da FAL.')}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Comprar</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/catalogo">
            Catálogo
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/carrinho">
            Carrinho
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/veiculo">
            Busca por veículo
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Minha FAL</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/conta">
            Minha conta
          </Link>
          <Link
            className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white"
            to="/conta/pedidos"
          >
            Pedidos
          </Link>
          {!user ? (
            <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/login">
              Entrar
            </Link>
          ) : null}
          <Link
            className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white"
            to="/conta/favoritos"
          >
            Favoritos
          </Link>
          <Link
            className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white"
            to="/conta/veiculos"
          >
            Meus carros
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Institucional</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/">
            Início
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/termos">
            Termos de uso
          </Link>
          <Link
            className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white"
            to="/privacidade"
          >
            Política de privacidade
          </Link>
          <Link
            className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white"
            to="/trocas-devolucoes"
          >
            Trocas e devoluções
          </Link>
        </div>
      </Container>
    </footer>
  )
}
