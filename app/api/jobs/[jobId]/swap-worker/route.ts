import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const swapWorkerSchema = z.object({
  newWorkerId: z.string().uuid('Invalid worker ID'),
  reason: z.string().optional(),
})

const getCompatibleWorkersSchema = z.object({
  includeUnavailable: z.boolean().optional().default(false),
})

/**
 * GET /api/jobs/[jobId]/swap-worker
 * Get compatible workers for job swap
 */
export async function GET(
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
    const { searchParams } = new URL(request.url)
    const includeUnavailable = searchParams.get('includeUnavailable') === 'true'

    // Validate job exists and belongs to user's business
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        worker_id,
        business_id,
        businesses!inner(user_id)
      `)
      .eq('id', jobId)
      .eq('businesses.user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get compatible workers using the database function
    const { data: compatibleWorkers, error: compatibilityError } = await supabase
      .rpc('get_compatible_workers_for_job', { p_job_id: jobId })

    if (compatibilityError) {
      console.error('Error getting compatible workers:', compatibilityError)
      return NextResponse.json(
        { error: 'Failed to get compatible workers' },
        { status: 500 }
      )
    }

    // Filter out unavailable workers if requested
    const filteredWorkers = includeUnavailable 
      ? compatibleWorkers 
      : compatibleWorkers?.filter((w: any) => w.availability_status === 'available') || []

    // Get current worker info
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('id, name, email')
      .eq('id', job.worker_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          scheduled_at: job.scheduled_at,
          duration_minutes: job.duration_minutes,
        },
        currentWorker,
        compatibleWorkers: filteredWorkers,
        totalOptions: compatibleWorkers?.length || 0,
        availableOptions: filteredWorkers.length,
      }
    })

  } catch (error) {
    console.error('Error in swap-worker GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/jobs/[jobId]/swap-worker
 * Execute worker swap
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
    const validation = swapWorkerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { newWorkerId, reason } = validation.data

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
        businesses!inner(user_id, timezone)
      `)
      .eq('id', jobId)
      .eq('businesses.user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Validate new worker exists and belongs to same business
    const { data: newWorker, error: workerError } = await supabase
      .from('workers')
      .select('id, name, email, status')
      .eq('id', newWorkerId)
      .eq('business_id', job.business_id)
      .single()

    if (workerError || !newWorker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    if (newWorker.status !== 'active') {
      return NextResponse.json({ error: 'Worker is not active' }, { status: 400 })
    }

    // Check if new worker is available for the job time
    const jobEndTime = new Date(job.scheduled_at)
    jobEndTime.setMinutes(jobEndTime.getMinutes() + (job.duration_minutes || 60))

    const { data: isAvailable, error: availabilityError } = await supabase
      .rpc('is_worker_available', {
        p_worker_id: newWorkerId,
        p_job_start_time: job.scheduled_at,
        p_job_end_time: jobEndTime.toISOString(),
        p_business_timezone: (job.businesses as any).timezone || 'UTC'
      })

    if (availabilityError) {
      console.error('Error checking worker availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to check worker availability' },
        { status: 500 }
      )
    }

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'New worker is not available for the scheduled time' },
        { status: 400 }
      )
    }

    // Get compatibility score
    const { data: compatibility } = await supabase
      .rpc('calculate_worker_compatibility', {
        p_job_id: jobId,
        p_original_worker_id: job.worker_id,
        p_candidate_worker_id: newWorkerId
      })

    const compatibilityScore = compatibility?.[0]?.compatibility_score || 0

    // Start transaction: Create swap request and update job
    const { data: swapRequest, error: swapError } = await supabase
      .from('worker_swap_requests')
      .insert({
        job_id: jobId,
        original_worker_id: job.worker_id,
        requested_worker_id: newWorkerId,
        status: 'auto_approved', // Auto-approve for now
        swap_reason: reason,
        compatibility_score: compatibilityScore,
        created_by: user.id,
      })
      .select()
      .single()

    if (swapError) {
      console.error('Error creating swap request:', swapError)
      return NextResponse.json(
        { error: 'Failed to create swap request' },
        { status: 500 }
      )
    }

    // Update the job with new worker
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        worker_id: newWorkerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('Error updating job:', updateError)
      // Rollback swap request
      await supabase
        .from('worker_swap_requests')
        .delete()
        .eq('id', swapRequest.id)
      
      return NextResponse.json(
        { error: 'Failed to update job assignment' },
        { status: 500 }
      )
    }

    // Get original worker info for response
    const { data: originalWorker } = await supabase
      .from('workers')
      .select('id, name, email')
      .eq('id', job.worker_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        swapRequest: {
          id: swapRequest.id,
          status: swapRequest.status,
          compatibility_score: compatibilityScore,
          created_at: swapRequest.created_at,
        },
        job: {
          id: job.id,
          title: job.title,
          scheduled_at: job.scheduled_at,
        },
        originalWorker,
        newWorker,
        message: `Successfully swapped worker from ${originalWorker?.name} to ${newWorker.name}`,
      }
    })

  } catch (error) {
    console.error('Error in swap-worker POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 