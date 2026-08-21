import { FileText } from 'lucide-react'

interface Props {
  url: string | null
  alt: string
  className: string
}

/** True for a stored or signed labels URL whose object is a PDF. */
export function isPdfLabel(url: string | null | undefined): boolean {
  return Boolean(url) && (url as string).split('?')[0].toLowerCase().endsWith('.pdf')
}

// PDF is an accepted label format, and every listing surface put the URL
// straight into an image element — so a PDF label rendered as the browser's
// broken-image glyph. The two uploaders already handled this at upload time and
// the admin lightbox handled it at full size; the thumbnails did not.
export function LabelThumb({ url, alt, className }: Props) {
  if (!url) {
    return (
      <div className={`${className} flex items-center justify-center border-dashed bg-[#FAFAFA]`}>
        <span className="text-center text-[10px] leading-tight text-[#C7C7CC]">sin<br />etiqueta</span>
      </div>
    )
  }
  if (isPdfLabel(url)) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1 bg-[#F5F5F7]`}>
        <FileText className="h-4 w-4 text-[#AEAEB2]" />
        <span className="text-[10px] text-[#86868B]">PDF</span>
      </div>
    )
  }
  // A signed, expiring URL is a fresh optimizer cache miss on every render, so
  // next/image would bill a transformation each time.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`${className} object-contain`} />
}
