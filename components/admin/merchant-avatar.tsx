// The design's 38px circular initials avatar. Deterministic tint per merchant so
// the same account keeps the same colour between renders and between screens.
const TINTS = [
  'bg-[#E4A0B7] text-[#5A2434]', 'bg-[#8FC79A] text-[#20402A]',
  'bg-[#D9B27C] text-[#4A3418]', 'bg-[#8FB4E3] text-[#1D3B5F]',
  'bg-[#C4B0E8] text-[#332553]',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function MerchantAvatar({ name, id }: { name: string; id: string }) {
  let hash = 0
  for (const ch of id) hash = (hash + ch.charCodeAt(0)) % TINTS.length
  return (
    <span aria-hidden
      className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${TINTS[hash]}`}>
      {initials(name)}
    </span>
  )
}
