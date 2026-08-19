'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import type { SupplementFacts, SupplementFactRow } from '@/types'

interface Props {
  onChange: (facts: SupplementFacts | null) => void
  initialData?: SupplementFacts | null
}

export function SupplementFactsEditor({ onChange, initialData }: Props) {
  const [servingSize, setServingSize] = useState(initialData?.serving_size ?? '')
  const [servings, setServings] = useState(initialData ? String(initialData.servings_per_container) : '')
  const [rows, setRows] = useState<SupplementFactRow[]>(initialData?.rows ?? [])

  function notify(r: SupplementFactRow[], ss = servingSize, sp = servings) {
    onChange(ss && sp && r.length > 0 ? { serving_size: ss, servings_per_container: Number(sp), rows: r } : null)
  }

  const addRow = () => { const next = [...rows, { name: '', amount: '' }]; setRows(next); notify(next) }
  const removeRow = (i: number) => { const next = rows.filter((_, idx) => idx !== i); setRows(next); notify(next) }
  const updateRow = (i: number, field: keyof SupplementFactRow, value: string | boolean) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    setRows(next); notify(next)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tamaño de porción</Label>
          <Input placeholder="1 capsule" value={servingSize}
            onChange={(e) => { setServingSize(e.target.value); notify(rows, e.target.value, servings) }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Porciones por envase</Label>
          <Input type="number" placeholder="30" value={servings}
            onChange={(e) => { setServings(e.target.value); notify(rows, servingSize, e.target.value) }} />
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="checkbox" checked={row.indent ?? false}
              onChange={(e) => updateRow(i, 'indent', e.target.checked)} title="Indentar" className="shrink-0" />
            <Input placeholder="Vitamina C" value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} className="flex-1" />
            <Input placeholder="500mg" value={row.amount} onChange={(e) => updateRow(i, 'amount', e.target.value)} className="w-24" />
            <Input placeholder="55%" value={row.dv ?? ''} onChange={(e) => updateRow(i, 'dv', e.target.value)} className="w-20" />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1" /> Agregar nutriente
      </Button>
    </div>
  )
}
