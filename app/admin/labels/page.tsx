import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signLabelUrls } from '@/lib/storage'
import { ListingControls } from '@/components/admin/listing-controls'
import { AdminLabelsTable, type LabelRow as Row } from '@/components/admin/admin-labels-table'
import { isAdmin } from '@/lib/utils'

const FACETS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
]

interface PageProps {
  searchParams: Promise<{ q?: string; estado?: string }>
}

export default async function AdminLabelsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('merchant_labels')
    .select('*, merchant:merchants(id,email,full_name)')
    .order('created_at', { ascending: false })

  let rows = (data as unknown as Row[]) ?? []

  if (rows.length > 0) {
    const merchantIds = [...new Set(rows.map((r) => r.merchant_id))]
    const { data: mps } = await db
      .from('merchant_products')
      .select('merchant_id, label_url, product:products(name)')
      .in('merchant_id', merchantIds)

    type MPRow = { merchant_id: string; label_url: string | null; product: { name: string } | null }
    const nameMap = new Map<string, string>()
    for (const mp of (mps as unknown as MPRow[]) ?? []) {
      if (mp.label_url) nameMap.set(`${mp.merchant_id}:${mp.label_url}`, mp.product?.name ?? '')
    }
    rows.forEach((r) => { r.productName = nameMap.get(`${r.merchant_id}:${r.label_url}`) ?? null })
  }

  const totalAll = rows.length
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)

  if (params.estado) rows = rows.filter((r) => r.status === params.estado)
  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((r) =>
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.productName ?? '').toLowerCase().includes(q) ||
      (r.merchant?.full_name ?? '').toLowerCase().includes(q) ||
      (r.merchant?.email ?? '').toLowerCase().includes(q))
  }

  // nameMap above keys on the STORED label_url, so signing must not touch it.
  const viewUrls = await signLabelUrls(rows.map((r) => r.label_url))

  return (
    <div className="space-y-6">
      <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Aprobación de etiquetas</h1>
      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <Suspense fallback={null}>
          <ListingControls basePath="/admin/labels" placeholder="Buscar por etiqueta, producto o merchant"
            facetKey="estado" total={totalAll}
            facets={FACETS.map((f) => ({ ...f, count: counts.get(f.value) ?? 0 }))} />
        </Suspense>
        <div className="mt-6">
          <AdminLabelsTable rows={rows} viewUrls={viewUrls} filtered={Boolean(params.q || params.estado)} />
        </div>
      </div>
    </div>
  )
}
