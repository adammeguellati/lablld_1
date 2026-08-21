'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface Props {
  url: string
  alt: string
  className?: string
  children: React.ReactNode
}

// Supabase serves an object inline unless asked otherwise. `download` sets
// Content-Disposition on the signed URL, which is what actually saves the file:
// a bare <a download> on a cross-origin href is ignored and navigates instead.
function downloadHref(url: string, name: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('download', name)
    return u.toString()
  } catch {
    return url
  }
}

// The copy names the real format. "Descargar PNG" over a PDF is the same class
// of lie as a size limit the uploader does not enforce, and PDF is an accepted
// label format.
function fileMeta(url: string): { ext: string; isPdf: boolean } {
  const clean = url.split('?')[0]
  const ext = (clean.split('.').pop() ?? '').toLowerCase()
  const known = ['png', 'jpg', 'jpeg', 'webp', 'pdf'].includes(ext)
  return { ext: known ? ext : '', isPdf: ext === 'pdf' }
}

export function LabelLightbox({ url, alt, className, children }: Props) {
  const [open, setOpen] = useState(false)
  const { ext, isPdf } = fileMeta(url)
  const name = `etiqueta.${ext || 'png'}`

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={`Ver ${alt}`}>
        {children}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-full w-full max-w-3xl flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-medium text-white">{alt}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[18px] bg-white p-4">
              {isPdf ? (
                <object data={url} type="application/pdf" className="h-[65vh] w-full rounded-lg">
                  <p className="p-6 text-center text-[14px] text-[#6E6E73]">
                    Tu navegador no puede mostrar este PDF. Descárgalo para verlo.
                  </p>
                </object>
              ) : (
                // A signed, expiring URL is a fresh optimizer cache miss on every
                // render, so next/image would bill a transformation each time.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={alt} className="max-h-[65vh] w-auto object-contain" />
              )}
            </div>

            <a href={downloadHref(url, name)} download={name}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-[#1D1E20] transition-opacity hover:opacity-90">
              <Download className="h-4 w-4" />
              {ext ? `Descargar ${ext.toUpperCase()}` : 'Descargar archivo'}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
