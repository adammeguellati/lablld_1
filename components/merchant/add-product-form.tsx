'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { saveMerchantProductAction } from '@/app/(merchant)/products/[id]/actions'

interface Props {
  productId: string
}

export function AddProductForm({ productId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const customName = fd.get('custom_name') as string
    const retailPrice = Number(fd.get('retail_price') ?? 0)
    startTransition(async () => {
      const result = await saveMerchantProductAction(productId, null, customName, retailPrice)
      if (result.error) { setError(result.error); return }
      router.push('/products')
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md bg-gray-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        Agregar a mis productos
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-4 space-y-3 bg-white w-full max-w-sm">
      <p className="text-sm font-semibold">Agregar a mis productos</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-1">
        <Label className="text-xs">Nombre de tu producto</Label>
        <Input name="custom_name" placeholder="Ej: Suplemento XYZ" className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Precio de venta (COP)</Label>
        <Input name="retail_price" type="number" step="1" placeholder="0" className="h-8 text-sm" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Agregar'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
