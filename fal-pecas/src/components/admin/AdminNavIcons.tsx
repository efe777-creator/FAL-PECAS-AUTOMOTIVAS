import type { ReactNode } from 'react'

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Ícones distintos por rota — pensados para o trilho compacto. */
export function adminNavIcon(to: string): ReactNode {
  switch (to) {
    case '/admin':
      return (
        <Svg>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </Svg>
      )
    case '/admin/pedidos':
      return (
        <Svg>
          <path d="M9 6h11" />
          <path d="M9 12h11" />
          <path d="M9 18h11" />
          <path d="M4 6h.01" />
          <path d="m3.5 12 1.5 1.5 2.5-3" />
          <path d="M4 18h.01" />
        </Svg>
      )
    case '/admin/avisos':
      return (
        <Svg>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
        </Svg>
      )
    case '/admin/estoque':
      return (
        <Svg>
          <path d="M4 7h16v4H4z" />
          <path d="M4 13h16v4H4z" />
          <path d="M8 7v10" />
        </Svg>
      )
    case '/admin/logistica':
      return (
        <Svg>
          <path d="M3 17h2V9h8v8h2" />
          <path d="M13 12h4l3 3v2h-7" />
          <circle cx="7" cy="17" r="1.5" />
          <circle cx="17" cy="17" r="1.5" />
        </Svg>
      )
    case '/admin/clientes':
      return (
        <Svg>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20v-1a5 5 0 0 1 14 0v1" />
        </Svg>
      )
    case '/admin/pagamentos':
      return (
        <Svg>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </Svg>
      )
    case '/admin/relatorios':
      return (
        <Svg>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-6" />
          <path d="M22 20V8" />
        </Svg>
      )
    case '/admin/produtos':
      return (
        <Svg>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </Svg>
      )
    case '/admin/categorias':
      return (
        <Svg>
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
        </Svg>
      )
    case '/admin/precos':
      return (
        <Svg>
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </Svg>
      )
    case '/admin/aplicacoes':
      return (
        <Svg>
          <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
        </Svg>
      )
    case '/admin/importacoes':
      return (
        <Svg>
          <path d="M12 3v11" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 20h14" />
        </Svg>
      )
    case '/admin/montadoras':
      return (
        <Svg>
          <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7z" />
          <path d="M9 12h6" />
        </Svg>
      )
    case '/admin/veiculos':
      return (
        <Svg>
          <path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5L5 16z" />
          <path d="M7 16v2M17 16v2" />
          <circle cx="8" cy="16" r="1.2" />
          <circle cx="16" cy="16" r="1.2" />
          <path d="M8 9 9.5 6h5L16 9" />
        </Svg>
      )
    case '/admin/fabricantes':
      return (
        <Svg>
          <path d="M3 21h18" />
          <path d="M5 21V10l5-3v14" />
          <path d="M10 21V8l9 4v9" />
          <path d="M14 12v.01M14 15v.01M17 13v.01M17 16v.01" />
        </Svg>
      )
    case '/admin/fornecedores':
      return (
        <Svg>
          <path d="M12 3v7" />
          <path d="m8 7 4 4 4-4" />
          <path d="M5 14h14v6H5z" />
        </Svg>
      )
    case '/admin/home':
      return (
        <Svg>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </Svg>
      )
    case '/admin/home/promocoes':
      return (
        <Svg>
          <path d="M12 3 3.5 8.5 12 14l8.5-5.5L12 3z" />
          <path d="M3.5 12.5 12 18l8.5-5.5" />
          <path d="M3.5 16.5 12 22l8.5-5.5" />
        </Svg>
      )
    case '/admin/busca':
      return (
        <Svg>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.2-3.2" />
        </Svg>
      )
    case '/admin/operadores':
      return (
        <Svg>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3 20v-1a5 5 0 0 1 10 0v1" />
          <path d="M14 20v-.5a4 4 0 0 1 7 0V20" />
        </Svg>
      )
    case '/':
      return (
        <Svg>
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
        </Svg>
      )
    default:
      return (
        <Svg>
          <circle cx="12" cy="12" r="7" />
        </Svg>
      )
  }
}
