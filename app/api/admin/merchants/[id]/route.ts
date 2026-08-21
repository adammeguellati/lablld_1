import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/utils'
import { collectMerchantLabelUrls, deleteLabelObjects } from '@/lib/storage-cleanup'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const { action } = await request.json() as { action: string }
  const db = createAdminClient()

  if (action === 'toggle_active') {
    const { data: merchant } = await db.from('merchants').select('is_active').eq('id', id).single()
    if (!merchant) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    await db.from('merchants').update({ is_active: !merchant.is_active }).eq('id', id)
    return NextResponse.json({ is_active: !merchant.is_active })
  }

  if (action === 'cancel_subscription') {
    const { data: merchant } = await db.from('merchants').select('plan').eq('id', id).single()
    if (!merchant?.plan) return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 })
    await db.from('merchants').update({
      plan: null, plan_status: 'cancelled', pending_plan: null,
      wompi_payment_source_id: null, subscription_next_billing_at: null,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const db = createAdminClient()

  const { data: merchant } = await db.from('merchants').select('id').eq('id', id).single()
  if (!merchant) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Collected BEFORE the rows go, because the URLs only exist on them. The
  // objects are removed after the rows, so a storage failure cannot leave a
  // merchant half-deleted.
  const labelUrls = await collectMerchantLabelUrls(id)

  const orderIds = await db.from('orders').select('id').eq('merchant_id', id)
  if (orderIds.data?.length) {
    await db.from('order_items').delete().in('order_id', orderIds.data.map(o => o.id))
    await db.from('orders').delete().eq('merchant_id', id)
  }
  await db.from('shopify_stores').delete().eq('merchant_id', id)
  await db.from('merchant_products').delete().eq('merchant_id', id)
  // merchant_labels was missing from this chain (schema notes C15). It has an FK
  // to merchants, so the delete below would either fail or orphan the rows
  // depending on that constraint's action — neither of which anyone had checked.
  await db.from('merchant_labels').delete().eq('merchant_id', id)

  const { error: merchantErr } = await db.from('merchants').delete().eq('id', id)
  if (merchantErr) return NextResponse.json({ error: merchantErr.message }, { status: 500 })

  const { error: authErr } = await db.auth.admin.deleteUser(id)
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  // Best-effort and last: the account is gone either way, and an orphaned object
  // is a cleanup problem rather than a broken delete.
  await deleteLabelObjects(labelUrls)

  return NextResponse.json({ ok: true })
}
