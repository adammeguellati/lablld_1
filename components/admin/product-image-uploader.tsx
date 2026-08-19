'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
}

export function ProductImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    const supabase = createClient()
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} supera los 5MB`)
        continue
      }
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false })

      if (uploadErr) { setError(uploadErr.message); continue }

      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      newUrls.push(data.publicUrl)
    }

    if (newUrls.length > 0) onChange([...images, ...newUrls])
    setUploading(false)
  }

  function remove(url: string) {
    onChange(images.filter((u) => u !== url))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="text-xs">{uploading ? 'Subiendo...' : 'Agregar'}</span>
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
