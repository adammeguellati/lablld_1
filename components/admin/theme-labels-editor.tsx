'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, Link } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ThemeLabel } from '@/types'

interface Props {
  initialData?: ThemeLabel[]
  onChange: (labels: ThemeLabel[]) => void
}

function emptyLabel(): ThemeLabel {
  return { id: crypto.randomUUID(), name: '', preview_url: '', file_url: '' }
}

function ThemeLabelCard({
  label, onUpdate, onRemove,
}: {
  label: ThemeLabel
  onUpdate: (field: keyof ThemeLabel, value: string) => void
  onRemove: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors bg-white'

  async function handleImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { setUploadError('Máximo 5MB'); return }
    setUploading(true)
    setUploadError(null)
    const db = createClient()
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-tl.${ext}`
    const { error } = await db.storage.from('product-images').upload(path, file, { upsert: false })
    if (error) {
      setUploadError(error.message)
    } else {
      const { data } = db.storage.from('product-images').getPublicUrl(path)
      onUpdate('preview_url', data.publicUrl)
    }
    setUploading(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
      <div
        className="relative aspect-video bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-center"
        onClick={() => fileRef.current?.click()}
      >
        {label.preview_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={label.preview_url} alt={label.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload className="w-6 h-6" />
            <span className="text-xs font-medium">Subir imagen</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs text-gray-500">Subiendo...</span>
          </div>
        )}
        {label.preview_url && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Upload className="w-5 h-5 text-white" />
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
      </div>

      <div className="p-3 space-y-2">
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        <input
          value={label.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="Nombre del estilo"
          className={ic + ' font-semibold'}
        />
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={label.file_url}
            onChange={(e) => onUpdate('file_url', e.target.value)}
            placeholder="Enlace de Canva"
            className={ic + ' pl-8 text-xs'}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors mt-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
    </div>
  )
}

export function ThemeLabelsEditor({ initialData = [], onChange }: Props) {
  const [labels, setLabels] = useState<ThemeLabel[]>(initialData)

  function update(index: number, field: keyof ThemeLabel, value: string) {
    const next = labels.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    setLabels(next)
    onChange(next)
  }

  function add() {
    const next = [...labels, emptyLabel()]
    setLabels(next)
    onChange(next)
  }

  function remove(index: number) {
    const next = labels.filter((_, i) => i !== index)
    setLabels(next)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {labels.map((label, i) => (
          <ThemeLabelCard
            key={label.id}
            label={label}
            onUpdate={(field, value) => update(i, field, value)}
            onRemove={() => remove(i)}
          />
        ))}
        <button
          type="button"
          onClick={add}
          className="aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs font-medium">Agregar estilo</span>
        </button>
      </div>
    </div>
  )
}
