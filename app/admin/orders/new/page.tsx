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
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft className="h-4 w-4" /> Órdenes
      </Link>
      <h1 className="text-2xl font-bold mb-6">Nuevo pedido (admin)</h1>
      <AdminOrderForm merchants={merchants} products={products} />
    </div>
  )
}
