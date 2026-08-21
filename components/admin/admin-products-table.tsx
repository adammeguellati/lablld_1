import Link from 'next/link'
import { ProductToggleButton } from './product-toggle-button'
import { CATEGORY_LABELS, CATEGORY_DOTS } from '@/lib/product-category'
import { formatCOP, formatDate } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  rows: Product[]
  merchantCount: Record<string, number>
  filtered: boolean
}

function stockCell(stock: number | null) {
  if (stock === null) return <span className="text-[#AEAEB2]">Ilimitado</span>
  if (stock === 0) return <span className="font-medium text-[#C0303B]">Agotado</span>
  if (stock < 10) return <span className="font-medium text-[#B4690E]">{stock}</span>
  return <span className="text-[#1D1E20]">{stock}</span>
}

export function AdminProductsTable({ rows, merchantCount, filtered }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-black/[.12] py-14 text-center">
        <p className="text-[15px] text-[#6E6E73]">
          {filtered ? 'Ningún producto coincide con tu búsqueda.' : 'No hay productos. Crea el primero.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-black/[.08]">
            {['Nombre', 'Categoría', 'Costo', 'Stock', 'Merchants', 'Estado', 'Creado', ''].map((h) => (
              <th key={h} className="whitespace-nowrap pb-3 pr-3 text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-black/[.05] last:border-0">
              <td className="py-3.5 pr-3">
                <Link href={`/admin/products/${p.id}`}
                  className="text-[14.5px] font-medium text-[#1D1E20] underline-offset-4 hover:underline">
                  {p.name}
                </Link>
                {p.sku && <p className="text-[12px] text-[#AEAEB2]">{p.sku}</p>}
              </td>
              <td className="py-3.5 pr-3">
                <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[#6E6E73]">
                  <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: CATEGORY_DOTS[p.category] }} />
                  {CATEGORY_LABELS[p.category]}
                </span>
              </td>
              <td className="py-3.5 pr-3 text-[14px] text-[#1D1E20]">{formatCOP(p.base_price)}</td>
              <td className="py-3.5 pr-3 text-[14px]">{stockCell(p.stock)}</td>
              <td className="py-3.5 pr-3 text-[14px] text-[#1D1E20]">{merchantCount[p.id] ?? 0}</td>
              <td className="py-3.5 pr-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
                  p.is_active ? 'bg-[#E6F6EB] text-[#16A34A]' : 'bg-[#F0F0F3] text-[#86868B]'
                }`}>
                  {p.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="py-3.5 pr-3 text-[14px] text-[#86868B]">{formatDate(p.created_at)}</td>
              <td className="py-3.5">
                <ProductToggleButton productId={p.id} isActive={p.is_active} merchantCount={merchantCount[p.id] ?? 0} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
