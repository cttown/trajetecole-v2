import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { requireAdmin } from '../../../lib/requireAdmin'

type MessageStatus = 'new' | 'in_progress' | 'handled'

type MessageRow = {
  id: string
  parent_first_name?: string | null
  parent_last_name?: string | null
  email: string
  subject: string
  message: string
  status: MessageStatus
  admin_note?: string | null
  created_at: string
  handled_at?: string | null
  handled_by?: string | null
}

type ApiResponse =
  | { messages: MessageRow[] }
  | { message: MessageRow }
  | { error: string }

const ALLOWED_STATUSES: MessageStatus[] = ['new', 'in_progress', 'handled']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const adminCheck = await requireAdmin(req)

  if (!adminCheck.ok) {
    return res.status(adminCheck.status).json({ error: adminCheck.error })
  }

  if (req.method === 'GET') {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : 'all'

      let query = supabaseAdmin
        .from('admin_contact_messages')
        .select(
          'id, parent_first_name, parent_last_name, email, subject, message, status, admin_note, created_at, handled_at, handled_by'
        )
        .order('created_at', { ascending: false })

      if (status !== 'all') {
        if (!ALLOWED_STATUSES.includes(status as MessageStatus)) {
          return res.status(400).json({ error: 'Invalid status filter' })
        }

        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json({ messages: (data ?? []) as MessageRow[] })
    } catch (error) {
      console.error('Admin messages GET error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, status, admin_note } = req.body ?? {}

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing message id' })
      }

      const updatePayload: Record<string, any> = {}

      if (typeof status !== 'undefined') {
        if (!ALLOWED_STATUSES.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' })
        }

        updatePayload.status = status

        if (status === 'handled') {
          updatePayload.handled_at = new Date().toISOString()
          updatePayload.handled_by = adminCheck.user.id
        } else {
          updatePayload.handled_at = null
          updatePayload.handled_by = null
        }
      }

      if (typeof admin_note === 'string') {
        updatePayload.admin_note = admin_note
      }

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      const { data, error } = await supabaseAdmin
        .from('admin_contact_messages')
        .update(updatePayload)
        .eq('id', id)
        .select(
          'id, parent_first_name, parent_last_name, email, subject, message, status, admin_note, created_at, handled_at, handled_by'
        )
        .single()

      if (error) throw error

      return res.status(200).json({ message: data as MessageRow })
    } catch (error) {
      console.error('Admin messages PATCH error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}