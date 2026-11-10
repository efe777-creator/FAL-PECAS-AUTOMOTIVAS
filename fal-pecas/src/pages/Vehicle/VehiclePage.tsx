import { Container } from '@/components/layout/Container'
import { VehiclePlateSearch } from '@/components/vehicle/VehiclePlateSearch'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function VehiclePage() {
  useDocumentTitle('Busca por veículo | FAL Peças Automotivas')
  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-fal-muted">Início / Veículo</p>
      <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">Busca por veículo</h1>
      <p className="mb-5 max-w-xl text-sm text-fal-muted">
        Digite a placa e pressione Enter — ou selecione o veículo manualmente.
      </p>
      <div className="max-w-md">
        <VehiclePlateSearch compact returnPath="/veiculo" />
      </div>
    </Container>
  )
}
