import Link from 'next/link'

interface Props {
  href?: string
  height?: number
}

export function Logo({ href = '/dashboard', height = 26 }: Props) {
  return (
    <Link href={href} className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="LABLLD" height={height} style={{ height }} />
    </Link>
  )
}
