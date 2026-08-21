'use client'

import { useState } from 'react'
import { ExternalLink, Upload } from 'lucide-react'
import { LabelUploader, LABEL_MAX_MB, LABEL_TYPES_COPY } from './label-uploader'
import type { ThemeLabel } from '@/types'

type Mode = 'plantilla' | 'propia' | 'lablld'

interface Props {
  productName: string
  dims: { width: number; height: number; unit: string } | null
  canvaUrl: string | null
  themeLabels: ThemeLabel[] | null
  labelUrl: string | null
  merchantId: string
  productId: string
  isPending: boolean
  onLabelChange: (url: string | null) => void
  onSubmit: () => void
  onBack: () => void
}

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors'

export function ProductStepLabel({ productName, dims, canvaUrl, themeLabels, labelUrl, merchantId, productId, isPending, onLabelChange, onSubmit, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('plantilla')
  const [selectedTemplate, setSelectedTemplate] = useState<{ name: string; url: string } | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [styleNotes, setStyleNotes] = useState('')

  const blankUrl = canvaUrl
  const hasTemplates = (themeLabels?.length ?? 0) > 0 || blankUrl

  function selectTemplate(name: string, url: string) {
    setSelectedTemplate({ name, url })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 mt-0.5">
          La zona regulatoria (INVIMA, lote, fechas) viene preimpresa.{' '}
          <a href="#" className="text-emerald-600 font-semibold hover:underline">Ver guía de zonas →</a>
        </p>
      </div>

      <div className="grid grid-cols-3 border-2 border-gray-200 rounded-xl overflow-hidden">
        {(['plantilla', 'propia', 'lablld'] as Mode[]).map((m, i) => (
          <button key={m} onClick={() => setMode(m)}
            className={`py-3.5 text-sm font-bold transition-colors relative ${mode === m ? 'bg-gray-50 text-gray-900' : 'text-gray-400 hover:text-gray-600'} ${i < 2 ? 'border-r-2 border-gray-200' : ''}`}>
            {m === 'plantilla' ? 'Usar plantilla' : m === 'propia' ? 'Subir etiqueta' : 'Diseño LABLLD'}
            {mode === m && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
          </button>
        ))}
      </div>

      {mode === 'plantilla' && (
        <div className="space-y-5">
          {!hasTemplates && (
            <p className="text-sm text-gray-400 text-center py-6 border border-gray-100 rounded-xl">Sin plantillas configuradas para este producto.</p>
          )}

          {blankUrl && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Plantilla en blanco</p>
              <button onClick={() => selectTemplate('Plantilla en blanco', blankUrl)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedTemplate?.url === blankUrl ? 'border-emerald-500 bg-emerald-50/40' : 'border-dashed border-gray-200 hover:border-gray-400'}`}>
                <div className="w-16 h-12 bg-white border border-gray-200 rounded flex flex-col items-center justify-center gap-1 shrink-0">
                  <div className="w-8 h-1.5 bg-gray-200 rounded" />
                  <div className="w-6 h-1 bg-gray-100 rounded" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Empezar desde cero</p>
                  <p className="text-xs text-gray-500">Plantilla blanca. Diseña libremente en Canva.</p>
                </div>
              </button>
            </>
          )}

          {(themeLabels?.length ?? 0) > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Estilos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themeLabels!.map((t) => (
                  <button key={t.id} onClick={() => selectTemplate(t.name, t.file_url)}
                    className={`rounded-xl border-2 overflow-hidden text-left transition-all ${selectedTemplate?.url === t.file_url ? 'border-emerald-500' : 'border-gray-200 hover:border-gray-400'}`}>
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {/* Correcting the reason given in PR #5, which was wrong: this src
                          is a THEME preview from the public product-images bucket
                          (theme-labels-editor.tsx uploads it there), not a label. It is
                          untouched by SEC-labels-bucket and stays public. Converting it
                          to next/image is an ordinary UI decision for the UI wave. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.preview_url && <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{t.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedTemplate && (
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <a href={selectedTemplate.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 hover:border-emerald-400 transition-colors group">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Abrir en Canva</p>
                  <p className="text-xs text-gray-400">{selectedTemplate.name}{dims ? ` · ${dims.width}×${dims.height} ${dims.unit}` : ''}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              </a>
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs text-gray-500"><Upload className="w-3 h-3" /> Cuando termines, exporta el archivo y súbelo aquí.</p>
                <p className="text-xs text-[#AEAEB2]">{LABEL_TYPES_COPY} · máx. {LABEL_MAX_MB} MB</p>
                <LabelUploader merchantId={merchantId} productId={productId} currentUrl={labelUrl} onUpload={onLabelChange} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={onBack} className="border border-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">← Atrás</button>
            <button onClick={onSubmit} disabled={!labelUrl || isPending}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Continuar →'}
            </button>
          </div>
        </div>
      )}

      {mode === 'propia' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Sube tu archivo de etiqueta. La zona regulatoria (INVIMA, lote, fechas) viene preimpresa.</p>
          <p className="text-xs text-[#AEAEB2]">{LABEL_TYPES_COPY} · máx. {LABEL_MAX_MB} MB</p>
          <LabelUploader merchantId={merchantId} productId={productId} currentUrl={labelUrl} onUpload={onLabelChange} />
          <div className="flex items-center justify-between pt-2">
            <button onClick={onBack} className="border border-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">← Atrás</button>
            <button onClick={onSubmit} disabled={!labelUrl || isPending}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Continuar →'}
            </button>
          </div>
        </div>
      )}

      {mode === 'lablld' && (
        <div className="space-y-4">
          {!requestSent ? (
            <>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 shrink-0">DS</div>
                <div>
                  <p className="text-sm font-semibold">Equipo de Diseño LABLLD</p>
                  <p className="text-xs text-gray-400">Responde en &lt;24h · Medellín · entrega 2–3 días hábiles</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre de tu marca / producto</label>
                <input className={ic} value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="ej. Luna Wellness · Colágeno Brillo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Colores, estilo o referencias visuales</label>
                <textarea className={`${ic} resize-y min-h-[80px]`} value={styleNotes} onChange={(e) => setStyleNotes(e.target.value)} placeholder="ej. Tonos verdes y dorados, minimalista. Referencia: @labella.co" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button onClick={onBack} className="border border-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shrink-0">← Atrás</button>
                <a
                  href={brandName.trim() ? `mailto:soporte@lablld.com?subject=${encodeURIComponent(`Solicitud de diseño: ${brandName}`)}&body=${encodeURIComponent(`Producto: ${productName}\nMarca: ${brandName}\n\nNotas de estilo:\n${styleNotes}`)}` : '#'}
                  onClick={(e) => { if (!brandName.trim()) { e.preventDefault(); return } setRequestSent(true) }}
                  className={`flex-1 text-center bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors ${!brandName.trim() ? 'opacity-60 pointer-events-none' : ''}`}>
                  Enviar solicitud de diseño
                </a>
              </div>
            </>
          ) : (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6 text-center space-y-2">
              <p className="text-3xl">✅</p>
              <p className="font-semibold text-emerald-800">Solicitud enviada</p>
              <p className="text-sm text-emerald-700">El equipo LABLLD te contactará en menos de 24 horas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
