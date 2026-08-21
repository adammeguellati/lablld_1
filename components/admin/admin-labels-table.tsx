import { LabelActions } from './label-actions'
import { LabelLightbox } from './label-lightbox'
import { formatDate } from '@/lib/utils'
import type { MerchantLabel, Merchant } from '@/types'

export type LabelRow = MerchantLabel & {
  merchant: Pick<Merchant, 'id' | 'email' | 'full_name'> | null
  productName?: string | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-[#FDEFE0] text-[#B4690E]' },
  approved: { label: 'Aprobada', cls: 'bg-[#E6F6EB] text-[#16A34A]' },
  rejected: { label: 'Rechazada', cls: 'bg-[#FBE9E6] text-[#C0303B]' },
}

interface Props {
  rows: LabelRow[]
  viewUrls: (string | null)[]
  filtered: boolean
}

export function AdminLabelsTable({ rows, viewUrls, filtered }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-black/[.12] py-14 text-center">
        <p className="text-[15px] text-[#6E6E73]">
          {filtered ? 'Ninguna etiqueta coincide con tu búsqueda.' : 'No hay etiquetas todavía.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-black/[.08]">
            {['Etiqueta', 'Nombre', 'Producto', 'Merchant', 'Estado', 'Fecha', ''].map((h) => (
              <th key={h} className="whitespace-nowrap pb-3 pr-3 text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const url = viewUrls[i] ?? row.label_url
            const state = STATUS[row.status] ?? { label: row.status, cls: 'bg-[#F0F0F3] text-[#86868B]' }
            return (
              <tr key={row.id} className="border-b border-black/[.05] last:border-0">
                <td className="py-3 pr-3">
                  <LabelLightbox url={url} alt={row.name ?? 'Etiqueta'}
                    className="h-[62px] w-[46px] shrink-0 overflow-hidden rounded-[7px] border border-black/[.08] bg-[#F5F5F7] transition-opacity hover:opacity-80">
                    {/* A signed, expiring URL is a fresh optimizer cache miss on
                        every render, so next/image would bill a transformation
                        each time. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  </LabelLightbox>
                </td>
                <td className="py-3 pr-3 text-[14.5px] font-medium text-[#1D1E20]">{row.name ?? '—'}</td>
                <td className="py-3 pr-3 text-[14px] text-[#6E6E73]">{row.productName ?? '—'}</td>
                <td className="py-3 pr-3">
                  <p className="text-[14px] text-[#1D1E20]">{row.merchant?.full_name ?? '—'}</p>
                  <p className="text-[12.5px] text-[#86868B]">{row.merchant?.email}</p>
                </td>
                <td className="py-3 pr-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${state.cls}`}>{state.label}</span>
                  {row.status === 'rejected' && row.rejection_reason && (
                    <p className="mt-1 max-w-[180px] text-[12px] text-[#86868B]">{row.rejection_reason}</p>
                  )}
                </td>
                <td className="py-3 pr-3 text-[14px] text-[#86868B]">{formatDate(row.created_at)}</td>
                <td className="py-3">
                  {row.status === 'pending' && <LabelActions merchantProductId={row.id} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
