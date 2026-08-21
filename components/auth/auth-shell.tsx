import Image from 'next/image'
import { Logo } from '@/components/shared/logo'

interface Props {
  heading: React.ReactNode
  lede?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

export const authInput =
  'w-full h-12 rounded-[11px] border border-black/10 bg-white px-4 text-[14.5px] outline-none transition-colors focus:border-black/25 placeholder:text-[#AEAEB2]'

export const authButton =
  'mt-1 h-12 w-full rounded-full bg-[#1D1E20] text-[15px] font-medium text-white transition-all hover:bg-[#F97316] active:scale-[0.98] disabled:opacity-60'

// The split-screen chrome /login and /register already use, extracted so the
// two recovery routes cannot drift from them.
export function AuthShell({ heading, lede, children, footer }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F5F5F7] anim-page">
      <div className="flex flex-col justify-center px-10 md:px-20 py-12">
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-10 el-0"><Logo href="/" /></div>
          <div className="el-1">
            <h1 className="mb-2 text-[36px] font-normal leading-[1.12] tracking-[-0.008em] text-[#1D1E20]">{heading}</h1>
            {lede && <p className="mb-5 text-[14.5px] text-[#86868B]">{lede}</p>}
            <hr className="border-gray-300 mb-6" />
          </div>
          {children}
          {footer && <div className="el-3 mt-5 text-center text-[14px] text-[#6E6E73]">{footer}</div>}
        </div>
      </div>
      <div className="hidden lg:block p-4 bg-[#F5F5F7] el-0">
        <div className="h-full rounded-3xl overflow-hidden relative">
          <Image src="/onboarding/primera_foto_-.png" alt="" fill className="object-cover" priority sizes="50vw" />
        </div>
      </div>
    </div>
  )
}
