import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Workers API
 * Fetches all workers for the current business
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user's business
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get business for the current user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Fetch all workers for this business
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, email, status')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('name')

    if (workersError) {
      console.error('Error fetching workers:', workersError)
      return NextResponse.json(
        { error: 'Failed to fetch workers' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      workers: workers || [],
      count: workers?.length || 0
    })

  } catch (error) {
    console.error('Error in workers API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 