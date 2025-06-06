import { NextResponse } from 'next/server'
import { businessOperations } from '@/lib/db-operations'
import { requireAuth, checkBusinessAccess } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const business = await businessOperations.create({
      ...body,
      id: session.user.id
    })

    return NextResponse.json(business)
  } catch (error) {
    console.error('Error creating business:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth()
    const business = await businessOperations.get(session.user.id)
    return NextResponse.json(business)
  } catch (error) {
    console.error('Error fetching business:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth()
    await checkBusinessAccess(session.user.id)
    
    const body = await request.json()
    const business = await businessOperations.update(session.user.id, body)
    return NextResponse.json(business)
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth()
    await checkBusinessAccess(session.user.id)
    
    await businessOperations.delete(session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting business:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 