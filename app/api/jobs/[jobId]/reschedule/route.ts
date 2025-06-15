import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const generateOptionsSchema = z.object({
  daysAhead: z.number().min(1).max(30).optional().default(14),
})

const sendClientLinkSchema = z.object({
  method: z.enum(['sms', 'email']),
  message: z.string().optional(),
})

const manualRescheduleSchema = z.object({
  newDateTime: z.string().datetime(),
  newWorkerId: z.string().uuid().optional(),
  reason: z.string().optional(),
  notifyClient: z.boolean().optional().default(true),
})

/**
 * POST /api/jobs/[jobId]/reschedule/generate-options
 * Generate reschedule suggestions for a job
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
    const { action } = body

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
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (action === 'generate-options') {
      const validation = generateOptionsSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const { daysAhead } = validation.data

      // Generate reschedule options using database function
      const { data: rescheduleOptions, error: optionsError } = await supabase
        .rpc('generate_reschedule_options', {
          p_job_id: jobId,
          p_days_ahead: daysAhead
        })

      if (optionsError) {
        console.error('Error generating reschedule options:', optionsError)
        return NextResponse.json(
          { error: 'Failed to generate reschedule options' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          job: {
            id: job.id,
            title: job.title,
            scheduled_at: job.scheduled_at,
            duration_minutes: job.duration_minutes,
          },
          client: job.clients,
          rescheduleOptions: rescheduleOptions || [],
          generatedAt: new Date().toISOString(),
        }
      })
    }

    if (action === 'send-client-link') {
      const validation = sendClientLinkSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const { method, message } = validation.data
      const client = job.clients as any

      // Validate client has contact method
      const clientContact = method === 'sms' ? client.phone : client.email
      if (!clientContact) {
        return NextResponse.json(
          { error: `Client does not have ${method === 'sms' ? 'phone number' : 'email address'}` },
          { status: 400 }
        )
      }

      // Create reschedule token
      const { data: token, error: tokenError } = await supabase
        .rpc('create_reschedule_token', {
          p_job_id: jobId,
          p_expires_hours: 72
        })

      if (tokenError || !token) {
        console.error('Error creating reschedule token:', tokenError)
        return NextResponse.json(
          { error: 'Failed to create reschedule link' },
          { status: 500 }
        )
      }

      // Generate reschedule URL
      const rescheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reschedule/${token}`

      // Create notification message
      const defaultMessage = method === 'sms' 
        ? `Hi ${client.name}, we need to reschedule your ${job.title} appointment. Please choose a new time: ${rescheduleUrl}`
        : `Hi ${client.name},\n\nWe need to reschedule your ${job.title} appointment scheduled for ${new Date(job.scheduled_at).toLocaleString()}.\n\nPlease click the link below to choose a new time:\n${rescheduleUrl}\n\nThank you!`

      const finalMessage = message || defaultMessage

      // Log the notification (actual sending would be implemented with SMS/email service)
      const { error: notificationError } = await supabase
        .from('reschedule_notifications')
        .insert({
          job_id: jobId,
          notification_type: method,
          recipient_contact: clientContact,
          message_content: finalMessage,
          status: 'pending'
        })

      if (notificationError) {
        console.error('Error logging notification:', notificationError)
      }

      return NextResponse.json({
        success: true,
        data: {
          token,
          rescheduleUrl,
          method,
          recipient: clientContact,
          message: finalMessage,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          note: 'Notification logged. Actual SMS/email sending requires service integration.'
        }
      })
    }

    if (action === 'manual-reschedule') {
      const validation = manualRescheduleSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const { newDateTime, newWorkerId, reason, notifyClient } = validation.data
      const finalWorkerId = newWorkerId || job.worker_id

      // Validate new worker if specified
      if (newWorkerId && newWorkerId !== job.worker_id) {
        const { data: newWorker, error: workerError } = await supabase
          .from('workers')
          .select('id, name, status')
          .eq('id', newWorkerId)
          .eq('business_id', job.business_id)
          .single()

        if (workerError || !newWorker || newWorker.status !== 'active') {
          return NextResponse.json({ error: 'Invalid worker selected' }, { status: 400 })
        }
      }

      // Check worker availability for new time
      const newEndTime = new Date(newDateTime)
      newEndTime.setMinutes(newEndTime.getMinutes() + (job.duration_minutes || 60))

      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('is_worker_available', {
          p_worker_id: finalWorkerId,
          p_job_start_time: newDateTime,
          p_job_end_time: newEndTime.toISOString(),
          p_business_timezone: (job.businesses as any).timezone || 'UTC'
        })

      if (availabilityError) {
        console.error('Error checking availability:', availabilityError)
        return NextResponse.json(
          { error: 'Failed to check worker availability' },
          { status: 500 }
        )
      }

      if (!isAvailable) {
        return NextResponse.json(
          { error: 'Worker is not available for the new time slot' },
          { status: 400 }
        )
      }

      // Update the job
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          scheduled_at: newDateTime,
          worker_id: finalWorkerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (updateError) {
        console.error('Error updating job:', updateError)
        return NextResponse.json(
          { error: 'Failed to reschedule job' },
          { status: 500 }
        )
      }

      // Log notification if client should be notified
      if (notifyClient) {
        const client = job.clients as any
        const notificationMessage = `Your ${job.title} appointment has been rescheduled to ${new Date(newDateTime).toLocaleString()}. Thank you!`
        
        // Try SMS first, fallback to email
        const contactMethod = client.phone ? 'sms' : 'email'
        const contactInfo = client.phone || client.email

        if (contactInfo) {
          await supabase
            .from('reschedule_notifications')
            .insert({
              job_id: jobId,
              notification_type: contactMethod,
              recipient_contact: contactInfo,
              message_content: notificationMessage,
              status: 'pending'
            })
        }
      }

      // Get updated worker info
      const { data: workerInfo } = await supabase
        .from('workers')
        .select('id, name, email')
        .eq('id', finalWorkerId)
        .single()

      return NextResponse.json({
        success: true,
        data: {
          job: {
            id: job.id,
            title: job.title,
            scheduled_at: newDateTime,
            duration_minutes: job.duration_minutes,
          },
          worker: workerInfo,
          originalDateTime: job.scheduled_at,
          newDateTime,
          reason,
          clientNotified: notifyClient,
          message: 'Job successfully rescheduled'
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in reschedule endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 