import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminOrderForm } from '@/components/admin/admin-order-form'
import { isAdmin } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import type { Product } from '@/types'

export default async function AdminNewOrderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const [merchantsRes, productsRes] = await Promise.all([
    db.from('merchants').select('id, full_name, email').eq('is_active', true).order('full_name'),
    db.from('products').select('id, name, wholesale_price_usd').eq('is_active', true).order('name'),
  ])

  const merchants = (merchantsRes.data ?? []) as { id: string; full_name: string; email: string }[]
  const products = (productsRes.data as unknown as Pick<Product, 'id' | 'name' | 'wholesale_price_usd'>[]) ?? []

  return (
    <div>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-[#86868B] transition-colors hover:text-[#1D1E20]">
        <ArrowLeft className="h-4 w-4" /> Órdenes
      </Link>
      {/* The title said "Nuevo pedido (admin)". An admin creating an order from
          the admin app does not need to be told which app they are in. */}
      <h1 className="mb-6 text-[36px] font-normal leading-[1.12] tracking-[0]">Nuevo pedido</h1>
      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <AdminOrderForm merchants={merchants} products={products} />
      </div>
    </div>
  )
}
