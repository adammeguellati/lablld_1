'use client'

import { useState } from 'react'

interface Props {
  images: string[]
  name: string
}

export function ProductGallery({ images, name }: Props) {
  const [selected, setSelected] = useState(0)

  if (images.length === 0) {
    return (
      <div className="w-full aspect-square bg-muted rounded-xl flex items-center justify-center">
        <span className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
          Tu diseño aquí
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[selected]}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                selected === i ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
