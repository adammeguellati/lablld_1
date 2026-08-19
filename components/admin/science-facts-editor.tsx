'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import type { ScienceFact } from '@/types'

const TA = 'w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring'

interface Props {
  onChange: (facts: ScienceFact[]) => void
  initialData?: ScienceFact[]
}

export function ScienceFactsEditor({ onChange, initialData }: Props) {
  const [facts, setFacts] = useState<ScienceFact[]>(initialData ?? [])

  const update = (next: ScienceFact[]) => { setFacts(next); onChange(next) }
  const add = () => update([...facts, { title: '', content: '' }])
  const remove = (i: number) => update(facts.filter((_, idx) => idx !== i))
  const set = (i: number, field: keyof ScienceFact, value: string) =>
    update(facts.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))

  return (
    <div className="space-y-4">
      {facts.map((fact, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 relative">
          <Button type="button" variant="ghost" size="icon"
            className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          <Input placeholder="Título del estudio" value={fact.title} onChange={(e) => set(i, 'title', e.target.value)} />
          <textarea rows={2} placeholder="Resumen del hallazgo..." value={fact.content}
            onChange={(e) => set(i, 'content', e.target.value)} className={TA} />
          <Input placeholder="https://doi.org/... (opcional)" value={fact.source ?? ''}
            onChange={(e) => set(i, 'source', e.target.value)} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Agregar dato científico
      </Button>
    </div>
  )
}
