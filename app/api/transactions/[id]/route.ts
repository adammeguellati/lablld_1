import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTransaction } from '@/lib/wompi'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    const { status } = await getTransaction(id)
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar el pago' }, { status: 500 })
  }
}
