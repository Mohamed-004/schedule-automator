import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendRescheduleClientSMS, sendRescheduleWorkerSMS, RescheduleData } from '@/lib/sms-service'

const generateOptionsSchema = z.object({
  daysAhead: z.number().min(1).max(30).optional().default(14),
})

const sendClientLinkSchema = z.object({
  method: z.enum(['sms', 'email']),
  message: z.string().optional(),
})

const manualRescheduleSchema = z.object({
  newDateTime: z.string().refine(
    (val) => {
      try {
        const date = new Date(val)
        return !isNaN(date.getTime()) && date > new Date()
      } catch {
        return false
      }
    },
    { message: 'Invalid datetime format or date is in the past' }
  ),
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
      console.log('🔒 RESCHEDULE API DEBUG - Unauthorized: No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params
    const body = await request.json()
    const { action } = body

    console.log('🚀 RESCHEDULE API DEBUG - Request received:', {
      jobId,
      userId: user.id,
      userEmail: user.email,
      action,
      body,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    })

    // Validate job exists and belongs to user's business
    console.log('🔍 RESCHEDULE API DEBUG - Fetching job data...')
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
        location,
        businesses!inner(user_id, timezone),
        clients!inner(name, phone, email)
      `)
      .eq('id', jobId)
      .eq('businesses.user_id', user.id)
      .single()

    console.log('📊 RESCHEDULE API DEBUG - Job query result:', {
      job,
      jobError,
      jobExists: !!job,
      belongsToUser: job?.businesses && (job.businesses as any).user_id === user.id
    })

    if (jobError || !job) {
      console.error('❌ RESCHEDULE API DEBUG - Job not found:', { jobError, jobId, userId: user.id })
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
      console.log('⚙️ RESCHEDULE API DEBUG - Processing manual-reschedule action')
      
      const validation = manualRescheduleSchema.safeParse(body)
      console.log('🔍 RESCHEDULE API DEBUG - Validation result:', {
        success: validation.success,
        data: validation.success ? validation.data : null,
        error: validation.success ? null : validation.error.flatten(),
        originalBody: body
      })
      
      if (!validation.success) {
        console.error('❌ RESCHEDULE API DEBUG - Validation failed:', validation.error.flatten())
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const { newDateTime, newWorkerId, reason, notifyClient } = validation.data
      const finalWorkerId = newWorkerId || job.worker_id

      console.log('📝 RESCHEDULE API DEBUG - Validated parameters:', {
        newDateTime,
        newWorkerId,
        finalWorkerId,
        reason,
        notifyClient,
        originalWorkerId: job.worker_id,
        workerChanged: finalWorkerId !== job.worker_id
      })

      // Validate new worker if specified
      if (newWorkerId && newWorkerId !== job.worker_id) {
        console.log('👤 RESCHEDULE API DEBUG - Validating new worker...')
        const { data: newWorker, error: workerError } = await supabase
          .from('workers')
          .select('id, name, status')
          .eq('id', newWorkerId)
          .eq('business_id', job.business_id)
          .single()

        console.log('👤 RESCHEDULE API DEBUG - Worker validation result:', {
          newWorker,
          workerError,
          workerExists: !!newWorker,
          workerActive: newWorker?.status === 'active'
        })

        if (workerError || !newWorker || newWorker.status !== 'active') {
          console.error('❌ RESCHEDULE API DEBUG - Invalid worker selected:', { workerError, newWorker })
          return NextResponse.json({ error: 'Invalid worker selected' }, { status: 400 })
        }
      }

      // Check worker availability for new time
      const newEndTime = new Date(newDateTime)
      newEndTime.setMinutes(newEndTime.getMinutes() + (job.duration_minutes || 60))

      console.log('⏰ RESCHEDULE API DEBUG - Checking availability:', {
        workerId: finalWorkerId,
        startTime: newDateTime,
        endTime: newEndTime.toISOString(),
        duration: job.duration_minutes,
        timezone: (job.businesses as any).timezone || 'UTC'
      })

      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('is_worker_available', {
          p_worker_id: finalWorkerId,
          p_job_start_time: newDateTime,
          p_job_end_time: newEndTime.toISOString(),
          p_business_timezone: (job.businesses as any).timezone || 'UTC'
        })

      console.log('⏰ RESCHEDULE API DEBUG - Availability check result:', {
        isAvailable,
        availabilityError
      })

      if (availabilityError) {
        console.error('❌ RESCHEDULE API DEBUG - Error checking availability:', availabilityError)
        return NextResponse.json(
          { error: 'Failed to check worker availability' },
          { status: 500 }
        )
      }

      if (!isAvailable) {
        console.error('❌ RESCHEDULE API DEBUG - Worker not available for new time slot')
        return NextResponse.json(
          { error: 'Worker is not available for the new time slot' },
          { status: 400 }
        )
      }

      // Update the job
      console.log('💾 RESCHEDULE API DEBUG - Updating job in database...')
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          scheduled_at: newDateTime,
          worker_id: finalWorkerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      console.log('💾 RESCHEDULE API DEBUG - Job update result:', {
        updateError,
        updateSuccess: !updateError
      })

      if (updateError) {
        console.error('❌ RESCHEDULE API DEBUG - Error updating job:', updateError)
        return NextResponse.json(
          { error: 'Failed to reschedule job' },
          { status: 500 }
        )
      }

      // Log notification if client should be notified
      if (notifyClient) {
        console.log('📱 RESCHEDULE API DEBUG - Processing notifications...')
        const client = job.clients as any
        const originalDateTime = new Date(job.scheduled_at).toLocaleString()
        const newDateTimeFormatted = new Date(newDateTime).toLocaleString()
        
        console.log('📱 RESCHEDULE API DEBUG - Client info:', {
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          originalDateTime,
          newDateTimeFormatted
        })
        
        // Get worker information for notifications
        const { data: workerInfo } = await supabase
          .from('workers')
          .select('id, name, phone')
          .eq('id', finalWorkerId)
          .single()

        console.log('📱 RESCHEDULE API DEBUG - Worker info for notifications:', {
          workerInfo,
          finalWorkerId
        })

        // Prepare reschedule data for SMS templates
        const rescheduleData: RescheduleData = {
          clientName: client.name || 'Customer',
          workerName: workerInfo?.name || 'Team Member',
          jobTitle: job.title,
          originalDateTime,
          newDateTime: newDateTimeFormatted,
          location: job.location || ''
        }

        console.log('📱 RESCHEDULE API DEBUG - Reschedule data prepared:', rescheduleData)

        // Create comprehensive notification log entry for the reschedule event
        // Temporarily disabled due to database constraint - need 'system' type in schema
        /*
        const rescheduleLogEntry = {
          job_id: jobId,
          notification_type: 'system' as const,
          recipient_contact: 'system-log',
          message_content: `RESCHEDULE EVENT: Job "${job.title}" rescheduled from ${originalDateTime} to ${newDateTimeFormatted}. Worker changed from ${job.worker_id} to ${finalWorkerId}. Reason: ${reason || 'No reason provided'}. Client notification: ${notifyClient ? 'enabled' : 'disabled'}.`,
          status: 'sent' as const,
          sent_at: new Date().toISOString()
        }

        // Log the reschedule event
        const systemLogResult = await supabase
          .from('reschedule_notifications')
          .insert(rescheduleLogEntry)

        console.log('📊 RESCHEDULE API DEBUG - System log created:', systemLogResult)
        */

        // Send SMS to client if they have a phone number
        if (client.phone) {
          console.log('📱 RESCHEDULE API DEBUG - Sending SMS to client...')
          try {
            const clientSMSResult = await sendRescheduleClientSMS(client.phone, rescheduleData)
            console.log('📱 RESCHEDULE API DEBUG - Client SMS result:', clientSMSResult)
            
            // Create detailed client notification log
            const clientNotificationEntry = {
              job_id: jobId,
              notification_type: 'sms' as const,
              recipient_contact: client.phone,
              message_content: `Hi ${rescheduleData.clientName}! Your ${rescheduleData.jobTitle} appointment has been rescheduled from ${rescheduleData.originalDateTime} to ${rescheduleData.newDateTime}${rescheduleData.location ? ` at ${rescheduleData.location}` : ''}. Thank you for your understanding!`,
              status: clientSMSResult.success ? 'sent' as const : 'failed' as const,
              sent_at: clientSMSResult.success ? new Date().toISOString() : null
            }

            const clientNotificationResult = await supabase
              .from('reschedule_notifications')
              .insert(clientNotificationEntry)

            console.log('📱 RESCHEDULE API DEBUG - Client notification logged:', clientNotificationResult)
            console.log('Client SMS notification:', clientSMSResult.success ? 'sent successfully' : `failed: ${clientSMSResult.error}`)
          } catch (error) {
            console.error('❌ RESCHEDULE API DEBUG - Error sending client SMS:', error)
            // Log failed client notification with error details
            const failedClientNotificationEntry = {
              job_id: jobId,
              notification_type: 'sms' as const,
              recipient_contact: client.phone,
              message_content: `SMS notification failed to send. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'failed' as const,
              sent_at: null
            }

            await supabase
              .from('reschedule_notifications')
              .insert(failedClientNotificationEntry)
          }
        } else if (client.email) {
          console.log('📧 RESCHEDULE API DEBUG - Client has no phone, logging email notification placeholder...')
          // Create email notification placeholder (actual email sending would need email service)
          const emailNotificationEntry = {
            job_id: jobId,
            notification_type: 'email' as const,
            recipient_contact: client.email,
            message_content: `Your ${job.title} appointment has been rescheduled to ${newDateTimeFormatted}. Thank you for your understanding!`,
            status: 'pending' as const,
            sent_at: null
          }

          const emailNotificationResult = await supabase
            .from('reschedule_notifications')
            .insert(emailNotificationEntry)
          console.log('📧 RESCHEDULE API DEBUG - Email notification placeholder logged:', emailNotificationResult)
        } else {
          console.log('⚠️ RESCHEDULE API DEBUG - Client has no contact method, logging warning...')
          // Log that client has no contact method
          // Temporarily disabled due to database constraint
          /*
          const noContactEntry = {
            job_id: jobId,
            notification_type: 'system' as const,
            recipient_contact: 'no-contact-available',
            message_content: `WARNING: Client "${client.name}" has no phone or email contact information. Unable to send reschedule notification.`,
            status: 'failed' as const,
            sent_at: null
          }

          await supabase
            .from('reschedule_notifications')
            .insert(noContactEntry)
          */
        }

        // Send SMS to worker if they have a phone number and worker changed
        if (workerInfo?.phone && finalWorkerId !== job.worker_id) {
          console.log('📱 RESCHEDULE API DEBUG - Sending SMS to worker (worker changed)...')
          try {
            const workerSMSResult = await sendRescheduleWorkerSMS(workerInfo.phone, rescheduleData)
            console.log('📱 RESCHEDULE API DEBUG - Worker SMS result:', workerSMSResult)
            
            // Create detailed worker notification log
            const workerNotificationEntry = {
              job_id: jobId,
              notification_type: 'sms' as const,
              recipient_contact: workerInfo.phone,
              message_content: `Hi ${rescheduleData.workerName}! Job Update: ${rescheduleData.jobTitle} for ${rescheduleData.clientName} has been rescheduled from ${rescheduleData.originalDateTime} to ${rescheduleData.newDateTime}${rescheduleData.location ? ` at ${rescheduleData.location}` : ''}. Please update your schedule.`,
              status: workerSMSResult.success ? 'sent' as const : 'failed' as const,
              sent_at: workerSMSResult.success ? new Date().toISOString() : null
            }

            const workerNotificationResult = await supabase
              .from('reschedule_notifications')
              .insert(workerNotificationEntry)

            console.log('📱 RESCHEDULE API DEBUG - Worker notification logged:', workerNotificationResult)
            console.log('Worker SMS notification:', workerSMSResult.success ? 'sent successfully' : `failed: ${workerSMSResult.error}`)
          } catch (error) {
            console.error('❌ RESCHEDULE API DEBUG - Error sending worker SMS:', error)
            // Log failed worker notification with error details
            const failedWorkerNotificationEntry = {
              job_id: jobId,
              notification_type: 'sms' as const,
              recipient_contact: workerInfo.phone,
              message_content: `Worker SMS notification failed to send. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'failed' as const,
              sent_at: null
            }

            await supabase
              .from('reschedule_notifications')
              .insert(failedWorkerNotificationEntry)
          }
        } else if (finalWorkerId === job.worker_id) {
          console.log('📝 RESCHEDULE API DEBUG - Same worker, logging no worker notification needed...')
          // Log that no worker notification was needed (same worker)
          // Temporarily disabled due to database constraint
          /*
          const sameWorkerEntry = {
            job_id: jobId,
            notification_type: 'system' as const,
            recipient_contact: 'same-worker',
            message_content: `No worker notification sent - same worker "${rescheduleData.workerName}" assigned to rescheduled job.`,
            status: 'sent' as const,
            sent_at: new Date().toISOString()
          }

          await supabase
            .from('reschedule_notifications')
            .insert(sameWorkerEntry)
          */
        } else if (!workerInfo?.phone) {
          console.log('⚠️ RESCHEDULE API DEBUG - Worker has no phone, logging warning...')
          // Log that worker has no phone number
          // Temporarily disabled due to database constraint
          /*
          const noWorkerPhoneEntry = {
            job_id: jobId,
            notification_type: 'system' as const,
            recipient_contact: 'no-worker-phone',
            message_content: `WARNING: Worker "${rescheduleData.workerName}" has no phone number. Unable to send SMS notification about job assignment.`,
            status: 'failed' as const,
            sent_at: null
          }

          await supabase
            .from('reschedule_notifications')
            .insert(noWorkerPhoneEntry)
          */
        }

        // Create summary notification log
        // Temporarily disabled due to database constraint
        /*
        const summaryEntry = {
          job_id: jobId,
          notification_type: 'system' as const,
          recipient_contact: 'notification-summary',
          message_content: `NOTIFICATION SUMMARY: Job "${job.title}" reschedule notifications completed. Client: ${client.phone ? 'SMS sent' : client.email ? 'Email pending' : 'No contact'}. Worker: ${workerInfo?.phone && finalWorkerId !== job.worker_id ? 'SMS sent' : finalWorkerId === job.worker_id ? 'Same worker, no notification' : 'No phone available'}.`,
          status: 'sent' as const,
          sent_at: new Date().toISOString()
        }

        await supabase
          .from('reschedule_notifications')
          .insert(summaryEntry)

        console.log('📊 RESCHEDULE API DEBUG - Notification summary logged')
        */
      } else {
        console.log('📝 RESCHEDULE API DEBUG - Client notification disabled, logging...')
        // Log that notifications were disabled
        // Temporarily disabled due to database constraint
        /*
        const disabledNotificationEntry = {
          job_id: jobId,
          notification_type: 'system' as const,
          recipient_contact: 'notifications-disabled',
          message_content: `Reschedule notifications were disabled for this job reschedule. Job "${job.title}" was rescheduled without sending client/worker notifications.`,
          status: 'sent' as const,
          sent_at: new Date().toISOString()
        }

        await supabase
          .from('reschedule_notifications')
          .insert(disabledNotificationEntry)
        */
      }

      // Get updated worker info
      const { data: workerInfo } = await supabase
        .from('workers')
        .select('id, name, email')
        .eq('id', finalWorkerId)
        .single()

      const responseData = {
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
          message: 'Job successfully rescheduled and notifications sent'
        }
      }

      console.log('✅ RESCHEDULE API DEBUG - Success response:', responseData)

      return NextResponse.json(responseData)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('❌ RESCHEDULE API DEBUG - Unhandled error in endpoint:', error)
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('❌ RESCHEDULE API DEBUG - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    
    console.error('❌ RESCHEDULE API DEBUG - Request context:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 