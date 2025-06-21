/**
 * SMS Service Module
 * Handles SMS sending using Twilio API with proper error handling and message templates
 */

import twilio from 'twilio'

// Types for SMS functionality
export interface SMSMessage {
  to: string
  message: string
  type?: 'reschedule_client' | 'reschedule_worker' | 'test' | 'custom'
}

export interface SMSResponse {
  success: boolean
  messageId?: string
  error?: string
  status?: string
}

export interface RescheduleData {
  clientName: string
  workerName: string
  jobTitle: string
  originalDateTime: string
  newDateTime: string
  location?: string
}

// Environment variable validation
function validateTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid) {
    throw new Error('TWILIO_ACCOUNT_SID environment variable is not set')
  }

  if (!authToken) {
    throw new Error('TWILIO_AUTH_TOKEN environment variable is not set')
  }

  if (!phoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER environment variable is not set')
  }

  if (!accountSid.startsWith('AC')) {
    throw new Error('TWILIO_ACCOUNT_SID must start with "AC". Please check your Twilio Account SID.')
  }

  if (authToken.length < 32) {
    throw new Error('TWILIO_AUTH_TOKEN appears to be invalid. Please check your Twilio Auth Token.')
  }

  if (!phoneNumber.startsWith('+')) {
    throw new Error('TWILIO_PHONE_NUMBER must start with "+" and include country code (e.g., +1234567890)')
  }

  return { accountSid, authToken, phoneNumber }
}

// Initialize Twilio client with validation
let twilioClient: any = null
let TWILIO_PHONE_NUMBER: string | null = null

function initializeTwilioClient() {
  if (twilioClient) return { client: twilioClient, phoneNumber: TWILIO_PHONE_NUMBER }
  
  try {
    const { accountSid, authToken, phoneNumber } = validateTwilioCredentials()
    
    twilioClient = twilio(accountSid, authToken)
    TWILIO_PHONE_NUMBER = phoneNumber
    
    return { client: twilioClient, phoneNumber: TWILIO_PHONE_NUMBER }
  } catch (error) {
    console.error('Twilio initialization error:', error)
    throw error
  }
}

/**
 * Validates phone number format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Check if it's a valid length (10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false
  }
  
  // Must start with country code or area code
  return true
}

/**
 * Formats phone number for Twilio (ensures + prefix)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // If it doesn't start with country code, assume US (+1)
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }
  
  // If it already has country code but no +
  if (!phoneNumber.startsWith('+')) {
    return `+${cleaned}`
  }
  
  return phoneNumber
}

/**
 * Message Templates
 */
export const messageTemplates = {
  rescheduleClient: (data: RescheduleData): string => {
    return `Hi ${data.clientName}! Your ${data.jobTitle} appointment has been rescheduled from ${data.originalDateTime} to ${data.newDateTime}${data.location ? ` at ${data.location}` : ''}. Thank you for your understanding!`
  },
  
  rescheduleWorker: (data: RescheduleData): string => {
    return `Hi ${data.workerName}! Job Update: ${data.jobTitle} for ${data.clientName} has been rescheduled from ${data.originalDateTime} to ${data.newDateTime}${data.location ? ` at ${data.location}` : ''}. Please update your schedule.`
  },
  
  test: (message: string): string => {
    return `Test SMS: ${message}`
  }
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS(smsData: SMSMessage): Promise<SMSResponse> {
  try {
    // Initialize Twilio client with validation
    const { client, phoneNumber } = initializeTwilioClient()

    // Validate phone number
    if (!validatePhoneNumber(smsData.to)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      }
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(smsData.to)

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: smsData.message,
      from: phoneNumber,
      to: formattedNumber
    })

    return {
      success: true,
      messageId: message.sid,
      status: message.status
    }

  } catch (error: any) {
    console.error('SMS sending error:', error)
    
    // Provide more specific error messages
    if (error.message.includes('TWILIO_')) {
      return {
        success: false,
        error: `Configuration Error: ${error.message}`
      }
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    }
  }
}

/**
 * Send reschedule notification to client
 */
export async function sendRescheduleClientSMS(
  phoneNumber: string, 
  rescheduleData: RescheduleData
): Promise<SMSResponse> {
  const message = messageTemplates.rescheduleClient(rescheduleData)
  
  return sendSMS({
    to: phoneNumber,
    message,
    type: 'reschedule_client'
  })
}

/**
 * Send reschedule notification to worker
 */
export async function sendRescheduleWorkerSMS(
  phoneNumber: string, 
  rescheduleData: RescheduleData
): Promise<SMSResponse> {
  const message = messageTemplates.rescheduleWorker(rescheduleData)
  
  return sendSMS({
    to: phoneNumber,
    message,
    type: 'reschedule_worker'
  })
}

/**
 * Send test SMS
 */
export async function sendTestSMS(
  phoneNumber: string, 
  message: string
): Promise<SMSResponse> {
  const testMessage = messageTemplates.test(message)
  
  return sendSMS({
    to: phoneNumber,
    message: testMessage,
    type: 'test'
  })
} 