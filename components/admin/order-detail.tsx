'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCOP, formatDate } from '@/lib/utils'
import type { Order } from '@/types'

interface OrderDetailProps {
  order: Order
}

export function OrderDetail({ order }: OrderDetailProps) {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '')
  const [carrier, setCarrier] = useState(order.carrier ?? '')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Cliente</p>
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-sm">{order.customer_email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Estado</p>
          <Badge>{order.status}</Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Costo de fulfillment</p>
          <p className="font-medium">
            {order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fecha</p>
          <p className="font-medium">{formatDate(order.created_at)}</p>
        </div>
      </div>

      {order.shipping_address && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Dirección de envío</p>
          <p className="text-sm">
            {order.shipping_address.address1}, {order.shipping_address.city},{' '}
            {order.shipping_address.zip}, {order.shipping_address.country}
          </p>
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <p className="font-medium">Marcar como enviada</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Número de tracking</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="1Z999..."
            />
          </div>
          <div className="space-y-1">
            <Label>Carrier</Label>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="UPS, FedEx..."
            />
          </div>
        </div>
        <Button>
          {/* TODO: Fase 7 — actualizar estado a 'shipped' */}
          Guardar tracking
        </Button>
      </div>
    </div>
  )
}
