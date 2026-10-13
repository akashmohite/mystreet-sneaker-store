import { useState } from 'react'

export const FALLBACK_IMAGE = '/sneakers/placeholder.svg'

export default function ProductImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      className={className}
      src={failed || !src ? FALLBACK_IMAGE : src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
