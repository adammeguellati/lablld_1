import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCOP, formatDate } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  quote_pending: 'secondary', payment_pending: 'secondary',
  pending: 'secondary', paid: 'outline', payment_failed: 'destructive',
  in_production: 'default', shipped: 'default', delivered: 'default', cancelled: 'destructive',
}

const statusLabel: Record<OrderStatus, string> = {
  quote_pending: 'Cotización pendiente', payment_pending: 'Pendiente de pago',
  pending: 'Pendiente', paid: 'Pagada', payment_failed: 'Pago fallido',
  in_production: 'En producción', shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada',
}

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Orden</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Costo</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">#{order.shopify_order_number}</TableCell>
            <TableCell>{order.customer_name ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
            </TableCell>
            <TableCell>
              {order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}
            </TableCell>
            <TableCell>{formatDate(order.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
