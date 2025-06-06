import { NextResponse } from 'next/server'
import { reminderOperations } from '@/lib/db-operations'
import { requireAuth, checkJobAccess } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    
    // Check if the job belongs to the business
    await checkJobAccess(body.job_id)
    
    const reminder = await reminderOperations.create(body)
    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth()
    const reminders = await reminderOperations.getPending()
    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const reminderId = searchParams.get('id')

    if (!reminderId) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const reminder = await reminderOperations.update(reminderId, body)
    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 
 
 