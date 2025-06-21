import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user's business
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch business information
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (businessError) {
      return NextResponse.json({ error: 'Failed to fetch business information' }, { status: 500 })
    }

    if (!business) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 })
    }

    // Return business hours configuration
    const businessHours = {
      timezone: business.timezone || 'America/New_York',
      workingDays: business.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: business.start_time || '08:00',
      endTime: business.end_time || '18:00',
      breakStart: business.break_start || '12:00',
      breakEnd: business.break_end || '13:00',
      isFlexible: business.flexible_hours || false,
      allowWeekends: business.allow_weekends || false,
      minimumNotice: business.minimum_notice_hours || 24,
      maxAdvanceBooking: business.max_advance_booking_days || 90
    }

    return NextResponse.json({ 
      success: true, 
      businessHours,
      businessName: business.name,
      businessId: business.id
    })

  } catch (error) {
    console.error('Error fetching business hours:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user's business
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      timezone,
      workingDays,
      startTime,
      endTime,
      breakStart,
      breakEnd,
      isFlexible,
      allowWeekends,
      minimumNotice,
      maxAdvanceBooking
    } = body

    // Update business hours
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        timezone,
        working_days: workingDays,
        start_time: startTime,
        end_time: endTime,
        break_start: breakStart,
        break_end: breakEnd,
        flexible_hours: isFlexible,
        allow_weekends: allowWeekends,
        minimum_notice_hours: minimumNotice,
        max_advance_booking_days: maxAdvanceBooking,
        updated_at: new Date().toISOString()
      })
      .eq('owner_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update business hours' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Business hours updated successfully' 
    })

  } catch (error) {
    console.error('Error updating business hours:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 