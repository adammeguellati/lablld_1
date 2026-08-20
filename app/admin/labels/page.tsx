import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signLabelUrls } from '@/lib/storage'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LabelActions } from '@/components/admin/label-actions'
import { formatDate, isAdmin } from '@/lib/utils'
import type { MerchantLabel, Merchant } from '@/types'

type Row = MerchantLabel & {
  merchant: Pick<Merchant, 'id' | 'email' | 'full_name'> | null
  productName?: string | null
}

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary', approved: 'default', rejected: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
}

export default async function AdminLabelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('merchant_labels')
    .select('*, merchant:merchants(id,email,full_name)')
    .order('created_at', { ascending: false })

  const rows = (data as unknown as Row[]) ?? []

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

  // nameMap above keys on the STORED label_url, so signing must not touch it.
  const viewUrls = await signLabelUrls(rows.map((r) => r.label_url))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Aprobación de etiquetas</h1>
      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Etiqueta</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id}>
                <TableCell>
                  <a href={viewUrls[i] ?? row.label_url} target="_blank" rel="noopener noreferrer">
                    <Image src={viewUrls[i] ?? row.label_url} alt="Etiqueta" width={60} height={60}
                      unoptimized
                      className="rounded border object-contain bg-gray-50" />
                  </a>
                </TableCell>
                <TableCell className="font-medium">{row.name ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.productName ?? '—'}</TableCell>
                <TableCell>
                  <p className="text-sm">{row.merchant?.full_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{row.merchant?.email}</p>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                    {row.status === 'rejected' && row.rejection_reason && (
                      <p className="text-xs text-muted-foreground max-w-[150px]">{row.rejection_reason}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(row.created_at)}</TableCell>
                <TableCell>
                  {row.status === 'pending' && <LabelActions merchantProductId={row.id} />}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay etiquetas pendientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
