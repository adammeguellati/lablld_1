import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductForm } from '@/components/admin/product-form'

export default function AdminNewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-[#86868B] transition-colors hover:text-[#1D1E20]">
        <ArrowLeft className="h-4 w-4" /> Productos
      </Link>
      <h1 className="mb-6 text-[36px] font-normal leading-[1.12] tracking-[0]">Nuevo producto</h1>
      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <ProductForm />
      </div>
    </div>
  )
}
