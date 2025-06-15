import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/clients
 * Get all clients for the authenticated user's business
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get clients for the user's business
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        business_id,
        businesses!inner(user_id)
      `)
      .eq('businesses.user_id', user.id)
      .order('name')

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: clients || []
    })

  } catch (error) {
    console.error('Error in clients GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 