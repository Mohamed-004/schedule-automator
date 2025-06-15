import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/job-types
 * Get all job types (global table - no business filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all job types (global table)
    const { data: jobTypes, error } = await supabase
      .from('job_types')
      .select(`
        id,
        name,
        description,
        required_skills
      `)
      .order('name')

    if (error) {
      console.error('Error fetching job types:', error)
      return NextResponse.json(
        { error: 'Failed to fetch job types' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: jobTypes || []
    })

  } catch (error) {
    console.error('Error in job-types GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/job-types
 * Create a new job type
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, required_skills } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Job type name is required' },
        { status: 400 }
      )
    }

    // Create job type (global table - no business_id needed)
    const { data: jobType, error } = await supabase
      .from('job_types')
      .insert({
        name,
        description,
        required_skills: required_skills || []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating job type:', error)
      return NextResponse.json(
        { error: 'Failed to create job type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: jobType
    })

  } catch (error) {
    console.error('Error in job-types POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 