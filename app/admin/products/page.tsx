import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LinkButton } from '@/components/shared/link-button'
import { ProductToggleButton } from '@/components/admin/product-toggle-button'
import { formatCOP, formatDate, isAdmin } from '@/lib/utils'
import type { Product } from '@/types'

export default async function AdminProductsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const [{ data: products }, { data: mpCounts }] = await Promise.all([
    db.from('products').select('*').order('created_at', { ascending: false }),
    db.from('merchant_products').select('product_id, merchant_id'),
  ])

  const merchantCountMap = new Map<string, number>()
  for (const row of (mpCounts ?? [])) {
    merchantCountMap.set(row.product_id, (merchantCountMap.get(row.product_id) ?? 0) + 1)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <LinkButton href="/admin/products/new">Nuevo producto</LinkButton>
      </div>
      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio base</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {((products as Product[]) ?? []).map((p) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">
                  <Link href={`/admin/products/${p.id}`} className="block">{p.name}</Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.category}</Badge>
                </TableCell>
                <TableCell>{formatCOP(p.base_price)}</TableCell>
                <TableCell>
                  {p.stock === null ? (
                    <span className="text-xs text-gray-400">Ilimitado</span>
                  ) : p.stock === 0 ? (
                    <span className="text-xs font-semibold text-red-600">Agotado</span>
                  ) : p.stock < 10 ? (
                    <span className="text-xs font-semibold text-orange-500">{p.stock}</span>
                  ) : (
                    <span className="text-xs text-gray-700">{p.stock}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? 'default' : 'outline'}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                <TableCell>
                  <ProductToggleButton
                    productId={p.id}
                    isActive={p.is_active}
                    merchantCount={merchantCountMap.get(p.id) ?? 0}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!products?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay productos. Crea el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
