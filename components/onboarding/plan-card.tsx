'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { formatCOP } from '@/lib/utils'
import type { Plan } from '@/types'

interface PlanCardProps {
  id: Plan
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
  disabled?: boolean
}

export function PlanCard({ id, name, price, description, features, popular, disabled }: PlanCardProps) {
  return (
    <Card className={`${popular ? 'border-primary' : ''} ${disabled ? 'opacity-50' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          {disabled ? <Badge variant="outline">Próximamente</Badge> : popular && <Badge>Más popular</Badge>}
        </div>
        <CardDescription>{description}</CardDescription>
        <p className="text-3xl font-bold">
          {formatCOP(price)}
          <span className="text-sm font-normal text-muted-foreground">/mes</span>
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {disabled ? (
          <span className={buttonVariants({ variant: 'outline', className: 'w-full cursor-not-allowed opacity-50' })}>
            No disponible
          </span>
        ) : (
          <Link
            href={`/onboarding/payment?plan=${id}`}
            className={buttonVariants({ variant: popular ? 'default' : 'outline', className: 'w-full' })}
          >
            Elegir {name}
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
