'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LABEL_MAX_MB, LABEL_EXTENSIONS, LABEL_TYPES_COPY, LABEL_ACCEPT_ATTR } from '@/lib/limits'

interface LabelUploaderProps {
  merchantId: string
  productId: string
  currentUrl: string | null
  onUpload: (url: string) => void
}

// The limit, the accepted types and the copy that states them all live in
// lib/limits.ts now. They used to be declared here, which was fine while this
// uploader was the only one that agreed with itself — but the /labels uploader
// enforced a different number, and Adam's ruling of 2026-08-21 made the two
// agree at 10 MB. One value, one place.

export function LabelUploader({ merchantId, productId, currentUrl, onUpload }: LabelUploaderProps) {
  const [preview, setPreview] = useState(currentUrl)
  // Same reason as label-upload-form.tsx: PDF is accepted and is not an image.
  const [previewIsPdf, setPreviewIsPdf] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!(LABEL_EXTENSIONS as readonly string[]).includes(ext)) {
      setError(`Solo se permiten archivos ${LABEL_TYPES_COPY}`)
      return
    }
    if (file.size > LABEL_MAX_MB * 1024 * 1024) {
      setError(`El archivo no puede superar ${LABEL_MAX_MB} MB`)
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
      setPreviewIsPdf(ext === 'pdf')
      onUpload(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {preview && previewIsPdf ? (
        <div className="h-24 border rounded-md flex flex-col items-center justify-center gap-1.5 px-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <p className="text-xs text-muted-foreground">PDF cargado</p>
        </div>
      ) : preview ? (
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
        accept={LABEL_ACCEPT_ATTR}
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
