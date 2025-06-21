/**
 * SMS Send API Route
 * Handles SMS sending requests with validation and error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, validatePhoneNumber, SMSMessage } from '@/lib/sms-service'
import { z } from 'zod'

// Validation schema for SMS requests
const smsSchema = z.object({
  to: z.string().min(10, 'Phone number must be at least 10 digits'),
  message: z.string().min(1, 'Message cannot be empty').max(1600, 'Message too long'),
  type: z.enum(['reschedule_client', 'reschedule_worker', 'test', 'custom']).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate request data
    const validation = smsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: validation.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { to, message, type } = validation.data

    // Additional phone number validation
    if (!validatePhoneNumber(to)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid phone number format. Please use a valid phone number.' 
        },
        { status: 400 }
      )
    }

    // Prepare SMS data
    const smsData: SMSMessage = {
      to,
      message,
      type: type || 'custom'
    }

    // Send SMS
    const result = await sendSMS(smsData)

    // Return response based on result
    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        status: result.status,
        message: 'SMS sent successfully'
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send SMS' 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('SMS API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'SMS API is running',
    endpoints: {
      POST: '/api/sms/send - Send SMS messages'
    }
  })
} 