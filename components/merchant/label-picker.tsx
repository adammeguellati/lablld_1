'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { MerchantLabel } from '@/types'

interface Props {
  labels: MerchantLabel[]
  selected: string | null
  onChange: (url: string | null) => void
}

export function LabelPicker({ labels, selected, onChange }: Props) {
  if (labels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground space-y-1">
        <p>No tienes etiquetas aprobadas aún.</p>
        <p>
          <Link href="/labels" className="underline hover:text-foreground">
            Sube una etiqueta
          </Link>{' '}
          y espera aprobación del equipo.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {labels.map((label) => {
        const isSelected = selected === label.label_url
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onChange(isSelected ? null : label.label_url)}
            className={`relative rounded-xl border-2 p-2 flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
              isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <Image
              src={label.label_url}
              alt={label.name ?? 'Etiqueta'}
              width={80}
              height={80}
              className="object-contain rounded-lg"
            />
            <p className="text-xs text-center truncate w-full px-1">{label.name ?? 'Sin nombre'}</p>
            {isSelected && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
