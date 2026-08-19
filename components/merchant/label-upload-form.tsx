'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveLabelAction } from '@/app/(merchant)/labels/actions'

interface Props { merchantId: string }

export function LabelUploadForm({ merchantId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { setError('El archivo no puede superar 2MB'); return }
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${merchantId}/brand/${Date.now()}.${ext}`
      const { data, error: uploadError } = await supabase.storage
        .from('labels').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('labels').getPublicUrl(data.path)
      setPreview(publicUrl)
      setPendingUrl(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  function handleSave() {
    if (!pendingUrl) { setError('Primero selecciona una imagen'); return }
    startTransition(async () => {
      try {
        const name = nameRef.current?.value ?? ''
        const result = await saveLabelAction(pendingUrl, name)
        if (result.error) { setError(result.error); return }
        setPreview(null)
        setPendingUrl(null)
        if (nameRef.current) nameRef.current.value = ''
        router.refresh()
      } catch {
        setError('Error al guardar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Imagen (máx. 2MB)</Label>
          <div
            onClick={() => inputRef.current?.click()}
            className="h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="h-full w-full object-contain p-2" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-400" />
                <p className="text-xs text-gray-500">{uploading ? 'Subiendo...' : 'Haz clic para seleccionar'}</p>
              </>
            )}
          </div>
          <input
            ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
        <div className="space-y-2">
          <Label>Nombre (opcional)</Label>
          <Input ref={nameRef} placeholder="Ej: Logo principal" />
          <p className="text-xs text-muted-foreground">Para identificarla fácilmente entre tus etiquetas.</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button" onClick={handleSave}
        disabled={isPending || uploading || !pendingUrl}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? 'Enviando...' : 'Enviar para aprobación'}
      </button>
    </div>
  )
}
