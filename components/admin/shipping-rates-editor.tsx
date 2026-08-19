'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'

export interface RateInput {
  country: string
  country_code: string
  rate: string
  rate_cop: string
}

interface Props {
  rates: RateInput[]
  onChange: (rates: RateInput[]) => void
}

export function ShippingRatesEditor({ rates, onChange }: Props) {
  const add = () => onChange([...rates, { country: '', country_code: '', rate: '', rate_cop: '' }])
  const remove = (i: number) => onChange(rates.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof RateInput, value: string) =>
    onChange(rates.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

  return (
    <div className="space-y-2">
      {rates.map((rate, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">País</Label>
            <Input placeholder="Colombia" value={rate.country} onChange={(e) => update(i, 'country', e.target.value)} required />
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-xs">Código</Label>
            <Input placeholder="CO" maxLength={2} value={rate.country_code} onChange={(e) => update(i, 'country_code', e.target.value)} required />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Tarifa (USD)</Label>
            <Input type="number" step="0.01" placeholder="5.00" value={rate.rate} onChange={(e) => update(i, 'rate', e.target.value)} required />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Tarifa (COP)</Label>
            <Input type="number" step="1" placeholder="20000" value={rate.rate_cop} onChange={(e) => update(i, 'rate_cop', e.target.value)} />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Agregar tarifa
      </Button>
    </div>
  )
}
