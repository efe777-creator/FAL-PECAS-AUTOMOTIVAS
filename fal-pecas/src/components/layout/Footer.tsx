import { Link } from 'react-router-dom'
import { Container } from './Container'
import logoFal from '@/assets/logos/logo-fal-transparente.png'

export function Footer() {
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
            Plataforma digital FAL Peças Automotivas — peça certa para o seu veículo.
          </p>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Comprar</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/catalogo">
            Catálogo
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/carrinho">
            Carrinho
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/veiculo">
            Busca por veículo
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Minha FAL</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/conta">
            Minha conta
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/pedidos">
            Pedidos
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/login">
            Entrar
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Projeto</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1]" to="/">
            Home
          </Link>
          <span className="mb-2 block text-[13px] text-[#c5cbd1]">Privacidade</span>
          <span className="mb-2 block text-[13px] text-[#c5cbd1]">Termos</span>
        </div>
      </Container>
    </footer>
  )
}
