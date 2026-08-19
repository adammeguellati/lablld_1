'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import type { BenefitBlock } from '@/types'

interface Props {
  onChange: (blocks: BenefitBlock[]) => void
  initialData?: BenefitBlock[]
}

export function BenefitBlocksEditor({ onChange, initialData }: Props) {
  const [blocks, setBlocks] = useState<BenefitBlock[]>(initialData ?? [])

  const update = (next: BenefitBlock[]) => { setBlocks(next); onChange(next) }
  const add = () => update([...blocks, { icon: '', title: '', description: '' }])
  const remove = (i: number) => update(blocks.filter((_, idx) => idx !== i))
  const set = (i: number, field: keyof BenefitBlock, value: string) =>
    update(blocks.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)))

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="grid grid-cols-[3rem_1fr_1fr_auto] gap-2 items-center">
          <Input placeholder="🔥" value={block.icon} onChange={(e) => set(i, 'icon', e.target.value)}
            className="text-center text-lg px-1" />
          <Input placeholder="Título" value={block.title} onChange={(e) => set(i, 'title', e.target.value)} />
          <Input placeholder="Descripción corta" value={block.description} onChange={(e) => set(i, 'description', e.target.value)} />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Ícono · Título · Descripción</p>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Agregar benefit
      </Button>
    </div>
  )
}
