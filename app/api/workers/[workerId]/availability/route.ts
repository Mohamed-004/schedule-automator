import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { workerId: string } }
) {
  try {
    const { workerId } = params
    
    if (!workerId) {
      return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 })
    }

    // Create the Supabase client - it's an async function
    const supabase = await createClient()
    
    // Query worker weekly availability
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('worker_weekly_availability')
      .select('*')
      .eq('worker_id', workerId)
    
    if (availabilityError) {
      console.error('Error fetching worker availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to fetch worker availability' }, 
        { status: 500 }
      )
    }
    
    // Return the availability data
    return NextResponse.json(availabilityData || [])
  } catch (error) {
    console.error('Unexpected error in worker availability API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 