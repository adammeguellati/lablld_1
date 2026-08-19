'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  total: number
  perPage: number
}

export function CatalogPagination({ currentPage, totalPages, total, perPage }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goTo = (page: number) => {
    const p = new URLSearchParams(searchParams.toString())
    if (page === 1) p.delete('page')
    else p.set('page', String(page))
    router.push(`/catalog?${p.toString()}`)
  }

  const start = (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, total)

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
  )

  const btnBase = 'min-w-[36px] h-9 text-sm rounded-xl border transition-colors'

  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
      <p className="text-sm text-gray-400">
        {start}–{end} de <span className="text-gray-600 font-medium">{total}</span> productos
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) => {
          const prev = pages[i - 1]
          return (
            <span key={p} className="flex items-center gap-1">
              {prev && p - prev > 1 && (
                <span className="px-1 text-gray-300 text-sm select-none">…</span>
              )}
              <button
                onClick={() => goTo(p)}
                className={`${btnBase} ${
                  p === currentPage
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {p}
              </button>
            </span>
          )
        })}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
