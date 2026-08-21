import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signLabelUrls } from '@/lib/storage'
import { Badge } from '@/components/ui/badge'
import { LabelUploadForm } from '@/components/merchant/label-upload-form'
import { formatDate } from '@/lib/utils'
import type { MerchantLabel } from '@/types'
import { LabelThumb } from '@/components/shared/label-thumb'

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary', approved: 'default', rejected: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de aprobación', approved: 'Aprobada', rejected: 'Rechazada',
}

export default async function LabelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('merchant_labels')
    .select('*')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  const labels = (data as unknown as MerchantLabel[]) ?? []
  // Signed for display only. label_url itself is left alone: it is matched on
  // for equality elsewhere, so it is an identity, not just a locator.
  const viewUrls = await signLabelUrls(labels.map((l) => l.label_url))

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mis Etiquetas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube tu logo o etiqueta de marca. Una vez aprobada podrás usarla en cualquier producto.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Subir nueva etiqueta</h2>
        <LabelUploadForm merchantId={user.id} />
      </div>

      {labels.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Tus etiquetas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {labels.map((label, i) => (
              <div key={label.id} className="bg-white border rounded-xl p-4 flex gap-4 items-start">
                <a href={viewUrls[i] ?? label.label_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <LabelThumb url={viewUrls[i] ?? label.label_url} alt={label.name ?? 'Etiqueta'}
                    className="h-[72px] w-[72px] rounded-lg border bg-gray-50" />
                </a>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-medium text-sm truncate">{label.name ?? 'Sin nombre'}</p>
                  <Badge variant={STATUS_VARIANTS[label.status]}>{STATUS_LABELS[label.status]}</Badge>
                  {label.status === 'rejected' && label.rejection_reason && (
                    <p className="text-xs text-red-600">{label.rejection_reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(label.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {labels.length === 0 && (
        <p className="text-center py-12 text-sm text-muted-foreground">
          No tienes etiquetas aún. Sube tu primera etiqueta arriba.
        </p>
      )}
    </div>
  )
}
