import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { action, reason } = parsed.data
  const db = createAdminClient()

  const { data: label } = await db
    .from('merchant_labels')
    .select('merchant_id, label_url')
    .eq('id', id)
    .single()

  const { error } = await db
    .from('merchant_labels')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      rejection_reason: action === 'reject' ? (reason ?? null) : null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (label) {
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const update: Record<string, unknown> = { label_status: newStatus }
    if (action === 'reject') update.label_rejection_reason = reason ?? null
    if (action === 'approve') update.mockup_url = null

    await db
      .from('merchant_products')
      .update(update)
      .eq('merchant_id', label.merchant_id)
      .eq('label_url', label.label_url)
      .eq('label_status', 'pending')
  }

  return NextResponse.json({ success: true })
}
