import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCOP, formatDate, isAdmin } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  quote_pending: 'Cotización pendiente',
  payment_pending: 'Pendiente de pago',
  pending: 'Pendiente', paid: 'Pagada', payment_failed: 'Pago fallido',
  in_production: 'En producción', shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada',
}

const STATUS_VARIANTS: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  quote_pending: 'secondary',
  payment_pending: 'secondary',
  pending: 'secondary', paid: 'outline', payment_failed: 'destructive',
  in_production: 'default', shipped: 'default', delivered: 'default', cancelled: 'destructive',
}

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*, merchant:merchants(full_name)')
    .order('created_at', { ascending: false })

  type Row = Order & { merchant: { full_name: string } | null }
  const orders = (data as unknown as Row[]) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Órdenes</h1>
        <Link href="/admin/orders/new"
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          + Nuevo pedido
        </Link>
      </div>
      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  #{order.shopify_order_number ?? order.id.slice(0, 8)}
                </TableCell>
                <TableCell>{order.merchant?.full_name ?? '—'}</TableCell>
                <TableCell>{order.customer_name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[order.status]}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                <TableCell>
                  <Link href={`/admin/orders/${order.id}`}
                    className="text-sm text-blue-600 hover:underline">
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay órdenes aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
