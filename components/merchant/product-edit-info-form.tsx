'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'
import { saveMerchantProductAction } from '@/app/(merchant)/products/[id]/actions'

interface Props {
  productId: string
  defaultName: string
  defaultPrice: number
}

export function ProductEditInfoForm({ productId, defaultName, defaultPrice }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const customName = fd.get('custom_name') as string
    const retailPrice = Number(fd.get('retail_price') ?? 0)
    setSaved(false)
    startTransition(async () => {
      const result = await saveMerchantProductAction(productId, null, customName, retailPrice)
      if (result.error) { setError(result.error); return }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <Check className="h-4 w-4" /> Guardado correctamente
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Nombre del producto</Label>
        <Input name="custom_name" defaultValue={defaultName} placeholder="Nombre de tu producto" />
      </div>
      <div className="space-y-1.5">
        <Label>Precio de venta (COP)</Label>
        <Input name="retail_price" type="number" step="1" defaultValue={defaultPrice || ''} placeholder="0" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
