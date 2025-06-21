import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRescheduleOptions } from '@/lib/rescheduling-logic'

const smartRescheduleSchema = z.object({
  searchDays: z.number().min(1).max(30).optional().default(14),
  preferredDateTime: z.string().datetime().optional(),
})

/**
 * Smart Reschedule API Endpoint
 * Provides AI-powered reschedule suggestions with worker utilization optimization
 * Finds optimal time slots and handles no-availability scenarios
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params
    const body = await request.json()
    
    const validation = smartRescheduleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { searchDays, preferredDateTime } = validation.data

    // Validate job exists and belongs to user's business
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        worker_id,
        client_id,
        business_id,
        businesses!inner(user_id, timezone),
        clients!inner(name, phone, email)
      `)
      .eq('id', jobId)
      .eq('businesses.user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found', details: jobError }, { status: 404 })
    }

    // Generate comprehensive reschedule options using our smart logic
    const rescheduleOptions = await generateRescheduleOptions(
      jobId,
      preferredDateTime,
      searchDays
    )

    // Format the response for the frontend
    const response = {
      job: {
        id: job.id,
        title: job.title,
        scheduled_at: job.scheduled_at,
        duration_minutes: job.duration_minutes,
        worker_id: job.worker_id,
        client: job.clients
      },
      suggestedSlots: rescheduleOptions.suggestedSlots,
      nearestAvailableSlot: rescheduleOptions.nearestAvailableSlot,
      searchedDays: rescheduleOptions.searchedDays,
      noAvailabilityReason: rescheduleOptions.noAvailabilityReason,
      generatedAt: new Date().toISOString(),
      summary: {
        totalSuggestions: rescheduleOptions.suggestedSlots.length,
        aiSuggestions: rescheduleOptions.suggestedSlots.filter(slot => slot.isAiSuggested).length,
        hasNearestSlot: !!rescheduleOptions.nearestAvailableSlot,
        searchPeriod: `${searchDays} days`
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating smart reschedule options:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        error: 'Failed to generate reschedule options',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 