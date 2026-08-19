'use client'

import { Check } from 'lucide-react'
import type { ThemeLabel } from '@/types'

interface Props {
  options: ThemeLabel[]
  selected: string | null
  onChange: (url: string | null) => void
}

export function ThemeLabelSelector({ options, selected, onChange }: Props) {
  if (options.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">Etiquetas de tema (auto-aprobadas)</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((tl) => {
          const isSelected = selected === tl.file_url
          return (
            <button
              key={tl.id}
              type="button"
              onClick={() => onChange(isSelected ? null : tl.file_url)}
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
  )
}
