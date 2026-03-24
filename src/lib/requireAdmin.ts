import type { NextApiRequest } from 'next'
import { supabaseAdmin } from './supabaseAdmin'

type RequireAdminResult =
  | { ok: true; user: { id: string; email?: string | null } }
  | { ok: false; status: number; error: string }

export async function requireAdmin(
  req: NextApiRequest
): Promise<RequireAdminResult> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing authorization token' }
  }

  const token = authHeader.replace('Bearer ', '').trim()

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminError) {
    return { ok: false, status: 500, error: 'Unable to verify admin access' }
  }

  if (!adminRow) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
    },
  }
}