import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's business ID
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

    const body = await request.json()
    
    // Map frontend field names to database field names and filter for DB columns
    const {
      clientId,
      workerId,
      assignedWorkerId,
      jobTypeId,
      scheduledAt,
      scheduledEndAt,
      title,
      description,
      status,
      duration,
      location,
      workItems, // This is an example of a field to ignore
    } = body;

    const jobData: { [key: string]: any } = {
      business_id: business.id,
      client_id: clientId || null,
      worker_id: assignedWorkerId || workerId || null,
      job_type_id: jobTypeId || null,
      scheduled_at: scheduledAt,
      scheduled_end_at: scheduledEndAt,
      title,
      description,
      status,
      duration,
      location,
    };
    
    // Remove undefined or null values to avoid inserting them into the database
    Object.keys(jobData).forEach(
      (key) => (jobData[key] === undefined || jobData[key] === null) && delete jobData[key]
    );

    console.log('Attempting to insert job with data:', jobData);

    // Create job with business_id
    const { data: job, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json(
        { message: 'Failed to create job', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: job
    })
  } catch (error) {
    console.error('Internal Server Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get user's business ID
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

    // If jobId is provided, fetch single job
    if (jobId) {
      const { data: job, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients(name, phone, email),
          workers!jobs_worker_id_fkey(name, email)
        `)
        .eq('id', jobId)
        .eq('business_id', business.id)
        .single()

      if (error) {
        console.error('Error fetching job:', error)
        return NextResponse.json(
          { error: 'Failed to fetch job' },
          { status: 500 }
        )
      }

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      // Flatten the nested structure for easier access
      const flattenedJob = {
        ...job,
        client_name: job.clients?.name || null,
        client_phone: job.clients?.phone || null,
        client_email: job.clients?.email || null,
        worker_name: job.workers?.name || null,
        worker_email: job.workers?.email || null,
      }

      return NextResponse.json({
        success: true,
        jobs: [flattenedJob]
      })
    }

    // Otherwise, fetch jobs by date range
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required when not fetching a specific job' },
        { status: 400 }
      )
    }

    // Get jobs for the business with client and worker information
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(name, phone, email),
        workers!jobs_worker_id_fkey(name, email)
      `)
      .eq('business_id', business.id)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    // Flatten the nested structure for easier access
    const flattenedJobs = (jobs || []).map(job => ({
      ...job,
      client_name: job.clients?.name || null,
      client_phone: job.clients?.phone || null,
      client_email: job.clients?.email || null,
      worker_name: job.workers?.name || null,
      worker_email: job.workers?.email || null,
    }))

    return NextResponse.json({
      success: true,
      data: flattenedJobs
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Check if user has access to this job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('business_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', job.business_id)
      .eq('user_id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Unauthorized access to job' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Map frontend field names to database field names and filter for DB columns
    const {
      clientId,
      workerId,
      assignedWorkerId,
      jobTypeId,
      scheduledAt,
      scheduledEndAt,
      title,
      description,
      status,
      duration,
      location,
    } = body;

    const updateData = {
      client_id: clientId || null,
      worker_id: assignedWorkerId || workerId || null,
      job_type_id: jobTypeId || null,
      scheduled_at: scheduledAt,
      scheduled_end_at: scheduledEndAt,
      title,
      description,
      status,
      duration,
      location,
    };

    // Update job
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating job:', updateError)
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedJob
    })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Check if user has access to this job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('business_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', job.business_id)
      .eq('user_id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Unauthorized access to job' },
        { status: 403 }
      )
    }

    // Delete job
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      console.error('Error deleting job:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 
 
 