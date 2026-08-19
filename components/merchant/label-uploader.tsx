'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LabelUploaderProps {
  merchantId: string
  productId: string
  currentUrl: string | null
  onUpload: (url: string) => void
}

export function LabelUploader({ merchantId, productId, currentUrl, onUpload }: LabelUploaderProps) {
  const [preview, setPreview] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) {
      setError('Solo se permiten archivos JPG, PNG, WebP o PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10MB')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const path = `${merchantId}/${productId}/${Date.now()}.${ext}`
      const { data, error: uploadError } = await supabase.storage
        .from('labels')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = supabase.storage.from('labels').getPublicUrl(data.path)
      setPreview(publicUrl)
      onUpload(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Etiqueta" className="h-24 object-contain border rounded-md p-2" />
      ) : (
        <div className="h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Sin etiqueta</p>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Subiendo...' : 'Subir etiqueta'}
      </Button>
    </div>
  )
}
