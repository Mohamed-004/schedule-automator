import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const confirmRescheduleSchema = z.object({
  selectedDateTime: z.string().datetime(),
  selectedWorkerId: z.string().uuid(),
})

/**
 * GET /api/reschedule/[token]
 * Validate reschedule token and return job details with available options
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const { token } = params

    // Validate token and get job details
    const { data: tokenData, error: tokenError } = await supabase
      .from('client_reschedule_tokens')
      .select(`
        id,
        job_id,
        expires_at,
        used_at,
        client_name,
        client_contact,
        jobs!inner(
          id,
          title,
          description,
          scheduled_at,
          duration_minutes,
          location,
          business_id,
          worker_id,
          businesses!inner(name, timezone),
          workers!inner(name, email),
          clients!inner(name, phone, email)
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid reschedule link' }, { status: 404 })
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Reschedule link has expired' }, { status: 410 })
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      return NextResponse.json({ error: 'Reschedule link has already been used' }, { status: 410 })
    }

    const job = tokenData.jobs as any

    // Generate reschedule options
    const { data: rescheduleOptions, error: optionsError } = await supabase
      .rpc('generate_reschedule_options', {
        p_job_id: tokenData.job_id,
        p_days_ahead: 14
      })

    if (optionsError) {
      console.error('Error generating reschedule options:', optionsError)
      return NextResponse.json(
        { error: 'Failed to load available times' },
        { status: 500 }
      )
    }

    // Get business info for branding
    const business = job.businesses

    return NextResponse.json({
      success: true,
      data: {
        token: {
          id: tokenData.id,
          expires_at: tokenData.expires_at,
          client_name: tokenData.client_name,
          client_contact: tokenData.client_contact,
        },
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          scheduled_at: job.scheduled_at,
          duration_minutes: job.duration_minutes,
          location: job.location,
        },
        business: {
          name: business.name,
          timezone: business.timezone || 'UTC',
        },
        currentWorker: job.workers,
        client: job.clients,
        rescheduleOptions: rescheduleOptions || [],
        availableSlots: (rescheduleOptions || []).length,
      }
    })

  } catch (error) {
    console.error('Error in reschedule token GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reschedule/[token]
 * Process client reschedule selection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const { token } = params
    const body = await request.json()

    const validation = confirmRescheduleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { selectedDateTime, selectedWorkerId } = validation.data

    // Validate token and get job details
    const { data: tokenData, error: tokenError } = await supabase
      .from('client_reschedule_tokens')
      .select(`
        id,
        job_id,
        expires_at,
        used_at,
        client_name,
        jobs!inner(
          id,
          title,
          scheduled_at,
          duration_minutes,
          business_id,
          businesses!inner(timezone)
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid reschedule link' }, { status: 404 })
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Reschedule link has expired' }, { status: 410 })
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      return NextResponse.json({ error: 'Reschedule link has already been used' }, { status: 410 })
    }

    const job = tokenData.jobs as any

    // Validate selected worker belongs to the business
    const { data: selectedWorker, error: workerError } = await supabase
      .from('workers')
      .select('id, name, email, status')
      .eq('id', selectedWorkerId)
      .eq('business_id', job.business_id)
      .single()

    if (workerError || !selectedWorker || selectedWorker.status !== 'active') {
      return NextResponse.json({ error: 'Selected worker is not available' }, { status: 400 })
    }

    // Check worker availability for selected time
    const selectedEndTime = new Date(selectedDateTime)
    selectedEndTime.setMinutes(selectedEndTime.getMinutes() + (job.duration_minutes || 60))

    const { data: isAvailable, error: availabilityError } = await supabase
      .rpc('is_worker_available', {
        p_worker_id: selectedWorkerId,
        p_job_start_time: selectedDateTime,
        p_job_end_time: selectedEndTime.toISOString(),
        p_business_timezone: job.businesses.timezone || 'UTC'
      })

    if (availabilityError) {
      console.error('Error checking availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to verify availability' },
        { status: 500 }
      )
    }

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available' },
        { status: 400 }
      )
    }

    // Update the job with new schedule
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        scheduled_at: selectedDateTime,
        worker_id: selectedWorkerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.job_id)

    if (updateError) {
      console.error('Error updating job:', updateError)
      return NextResponse.json(
        { error: 'Failed to reschedule appointment' },
        { status: 500 }
      )
    }

    // Mark token as used
    const { error: tokenUpdateError } = await supabase
      .from('client_reschedule_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    if (tokenUpdateError) {
      console.error('Error updating token:', tokenUpdateError)
    }

    // Log confirmation notification
    const confirmationMessage = `Thank you! Your ${job.title} appointment has been rescheduled to ${new Date(selectedDateTime).toLocaleString()} with ${selectedWorker.name}.`
    
    await supabase
      .from('reschedule_notifications')
      .insert({
        job_id: tokenData.job_id,
        notification_type: 'email', // Default to email for confirmation
        recipient_contact: 'client-portal',
        message_content: confirmationMessage,
        status: 'sent'
      })

    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          scheduled_at: selectedDateTime,
          duration_minutes: job.duration_minutes,
        },
        worker: selectedWorker,
        originalDateTime: job.scheduled_at,
        newDateTime: selectedDateTime,
        confirmationMessage,
        message: 'Appointment successfully rescheduled!'
      }
    })

  } catch (error) {
    console.error('Error in reschedule token POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 