'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabelPicker } from '@/components/merchant/label-picker'
import { saveMerchantProductAction } from '@/app/(merchant)/products/[id]/actions'
import { Check } from 'lucide-react'
import type { MerchantLabel, ThemeLabel } from '@/types'

interface ExistingConfig {
  labelUrl: string | null
  customName: string | null
  retailPrice: number | null
}

interface Props {
  productId: string
  existing: ExistingConfig | null
  approvedLabels: MerchantLabel[]
  themeLabelOptions?: ThemeLabel[]
}

export function ProductConfigureForm({ productId, existing, approvedLabels, themeLabelOptions = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedLabelUrl, setSelectedLabelUrl] = useState<string | null>(existing?.labelUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const customName = fd.get('custom_name') as string
    const retailPrice = Number(fd.get('retail_price'))
    setSaved(false)
    startTransition(async () => {
      try {
        const result = await saveMerchantProductAction(productId, selectedLabelUrl, customName, retailPrice)
        if (result.error) { setError(result.error); return }
        setSaved(true)
        router.refresh()
      } catch {
        setError('Error al guardar. Inténtalo de nuevo.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <Check className="h-4 w-4" /> Guardado correctamente
        </div>
      )}
      {themeLabelOptions.length > 0 && (
        <div className="space-y-2">
          <Label>Etiquetas de tema (auto-aprobadas)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {themeLabelOptions.map((tl) => {
              const isSelected = selectedLabelUrl === tl.file_url
              return (
                <button
                  key={tl.id}
                  type="button"
                  onClick={() => setSelectedLabelUrl(isSelected ? null : tl.file_url)}
                  className={`relative rounded-xl border-2 p-2 flex flex-col items-center gap-1 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tl.preview_url} alt={tl.name} className="w-full aspect-square object-cover rounded-lg" />
                  <p className="text-xs font-medium truncate w-full text-center">{tl.name}</p>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Etiqueta de marca (de tu biblioteca aprobada)</Label>
        <LabelPicker labels={approvedLabels} selected={selectedLabelUrl} onChange={setSelectedLabelUrl} />
      </div>
      <div className="space-y-1">
        <Label>Nombre personalizado</Label>
        <Input name="custom_name" defaultValue={existing?.customName ?? ''} placeholder="Nombre de tu producto" />
      </div>
      <div className="space-y-1">
        <Label>Precio de venta (COP)</Label>
        <Input name="retail_price" type="number" step="1" defaultValue={existing?.retailPrice ?? ''} placeholder="0" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : existing ? 'Actualizar producto' : 'Guardar producto'}
      </Button>
    </form>
  )
}
