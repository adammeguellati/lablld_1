'use client'

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Item { image_url: string; link_url: string }
interface Settings {
  banners: [Item, Item]
  learn: [Item, Item, Item]
  order_button_url: string
}

const DEFAULT: Settings = {
  banners: [{ image_url: '', link_url: '' }, { image_url: '', link_url: '' }],
  learn:   [{ image_url: '', link_url: '' }, { image_url: '', link_url: '' }, { image_url: '', link_url: '' }],
  order_button_url: '/catalog',
}

function ItemFields({ label, value, onChange }: { label: string; value: Item; onChange: (v: Item) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const sb = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await sb.storage.from('product-images').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = sb.storage.from('product-images').getPublicUrl(path)
      onChange({ ...value, image_url: publicUrl })
      toast.success('Imagen actualizada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Imagen</label>
        <div className="flex gap-2">
          <input value={value.image_url} onChange={e => onChange({ ...value, image_url: e.target.value })}
            placeholder="https://..." className="flex-1 h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400 bg-white" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="h-9 px-3 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 shrink-0 transition-colors">
            {uploading ? '...' : 'Subir'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">URL de enlace</label>
        <input value={value.link_url} onChange={e => onChange({ ...value, link_url: e.target.value })}
          placeholder="https://..." className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400 bg-white" />
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [loading, setLoading]   = useState(true)
  const [, startSave]           = useTransition()
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.value && Object.keys(d.value).length) setSettings({ ...DEFAULT, ...d.value })
      setLoading(false)
    })
  }, [])

  function save() {
    startSave(async () => {
      await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  if (loading) return <p className="py-14 text-center text-[15px] text-[#86868B]">Cargando...</p>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Configuración del panel</h1>

      <section className="space-y-3 rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <h2 className="text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">Banners del dashboard</h2>
        <ItemFields label="Banner 1 (grande)" value={settings.banners[0]}
          onChange={v => setSettings(s => ({ ...s, banners: [v, s.banners[1]] }))} />
        <ItemFields label="Banner 2 (pequeño)" value={settings.banners[1]}
          onChange={v => setSettings(s => ({ ...s, banners: [s.banners[0], v] }))} />
      </section>

      <section className="space-y-3 rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <h2 className="text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">Sección Aprende</h2>
        {settings.learn.map((item, i) => (
          <ItemFields key={i} label={`Tarjeta ${i + 1}`} value={item}
            onChange={v => setSettings(s => {
              const learn = [...s.learn] as [Item, Item, Item]
              learn[i] = v
              return { ...s, learn }
            })} />
        ))}
      </section>

      <section className="space-y-3 rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <h2 className="text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">Botón &quot;Ordenar Productos&quot;</h2>
        <input value={settings.order_button_url}
          onChange={e => setSettings(s => ({ ...s, order_button_url: e.target.value }))}
          placeholder="/catalog o https://..."
          className="h-11 w-full rounded-[11px] border border-black/[.10] bg-white px-3.5 text-[14.5px] outline-none transition-colors placeholder:text-[#AEAEB2] focus:border-black/25" />
      </section>

      <button onClick={save}
        className="h-12 rounded-full bg-[#1D1E20] px-8 text-[15px] font-medium text-white transition-all hover:bg-[#F97316] active:scale-[0.98]">
        {saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>
    </div>
  )
}
