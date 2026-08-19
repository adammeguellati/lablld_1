'use client'

import { useState, useTransition } from 'react'
import { toggleProductAction } from '@/app/admin/products/actions'

interface Props {
  productId: string
  isActive: boolean
  merchantCount: number
}

export function ProductToggleButton({ productId, isActive, merchantCount }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isActive) {
      run()
      return
    }
    setShowConfirm(true)
  }

  function run() {
    setShowConfirm(false)
    startTransition(async () => {
      await toggleProductAction(productId, !isActive)
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors ${
          isPending
            ? 'opacity-50 cursor-wait border-gray-200 text-gray-400'
            : isActive
              ? 'border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600'
              : 'border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
        }`}
      >
        {isPending ? '...' : isActive ? 'Desactivar' : 'Activar'}
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-2">¿Desactivar producto?</h3>
            <p className="text-sm text-gray-500 mb-6">
              {merchantCount > 0
                ? `Afectará a ${merchantCount} merchant${merchantCount > 1 ? 's' : ''} que lo ${merchantCount > 1 ? 'tienen' : 'tiene'} configurado.`
                : 'El producto será marcado como inactivo.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-sm px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={run}
                className="text-sm px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
