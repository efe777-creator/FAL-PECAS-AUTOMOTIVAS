import type { ImportContract, ImportKind } from './types'

export const IMPORT_MAX_ROWS = 2000

const catalogContract: ImportContract = {
  kind: 'catalog',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['codigo', 'codigo_fal', 'sku', 'cod', 'code'],
      required: true,
    },
    {
      key: 'name',
      aliases: ['descricao', 'description', 'nome', 'name', 'produto'],
      required: true,
    },
    {
      key: 'grupo',
      aliases: ['grupo', 'group', 'categoria', 'category'],
      required: false,
    },
    {
      key: 'montadora',
      aliases: ['montadora', 'oem', 'fabricante_veiculo', 'vehicle_make'],
      required: false,
    },
  ],
}

const supplierConversionContract: ImportContract = {
  kind: 'supplier_conversion',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['codigo_fal', 'codigo', 'sku', 'cod_fal'],
      required: true,
    },
    {
      key: 'supplier_sku',
      aliases: ['codigo_fornecedor', 'cod_fornecedor', 'supplier_sku', 'sku_fornecedor'],
      required: true,
    },
  ],
}

const supplierCostContract: ImportContract = {
  kind: 'supplier_cost',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'supplier_sku',
      aliases: ['codigo_fornecedor', 'cod_fornecedor', 'supplier_sku', 'codigo', 'sku'],
      required: true,
    },
    {
      key: 'cost',
      aliases: ['custo', 'cost', 'preco_custo', 'valor_custo'],
      required: true,
    },
  ],
}

const priceListContract: ImportContract = {
  kind: 'price_list',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['sku', 'codigo', 'codigo_fal', 'cod'],
      required: true,
    },
    {
      key: 'price',
      aliases: ['preco', 'preço', 'price', 'valor', 'venda'],
      required: true,
    },
  ],
}

const CONTRACTS: Record<ImportKind, ImportContract> = {
  catalog: catalogContract,
  supplier_conversion: supplierConversionContract,
  supplier_cost: supplierCostContract,
  price_list: priceListContract,
}

export function getImportContract(kind: ImportKind): ImportContract {
  return CONTRACTS[kind]
}

export function listImportKinds(): ImportKind[] {
  return Object.keys(CONTRACTS) as ImportKind[]
}
