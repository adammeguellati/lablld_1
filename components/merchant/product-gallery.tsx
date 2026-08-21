'use client'

interface Props {
  images: string[]
  name: string
}

// The design's full-bleed hero: a 2-up row over a 3-up row, every tile 4:5,
// square corners, 14px gutters. Fed from products.images, which is an ordered
// array, so tile order follows the order an admin uploaded them in. Missing
// tiles stay as empty plates rather than collapsing the grid, because the
// composition is the point and a 3-up row with two tiles reads as broken.
const PLATE = 'relative aspect-[4/5] overflow-hidden bg-[#EDEDEF]'

function Tile({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className={PLATE}>
      {src ? (
        // Catalogue photography from the public product-images bucket. Kept as a
        // plain img for consistency with the rest of the catalogue surfaces and
        // to avoid per-image optimizer cost on a five-tile hero.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
    </div>
  )
}

export function ProductGallery({ images, name }: Props) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] max-h-[420px] w-full items-center justify-center bg-[#EDEDEF]">
        <span className="text-sm font-medium uppercase tracking-widest text-[#AEAEB2]">
          Tu diseño aquí
        </span>
      </div>
    )
  }

  const [a, b, c, d, e] = images

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5">
        <Tile src={a} alt={name} />
        <Tile src={b} alt={name} />
      </div>
      {(c || d || e) && (
        <div className="grid grid-cols-3 gap-3.5">
          <Tile src={c} alt={name} />
          <Tile src={d} alt={name} />
          <Tile src={e} alt={name} />
        </div>
      )}
    </div>
  )
}
