/**
 * Generic notification utility for sending broadcast messages
 *
 * This module provides a simple function to send notifications via
 * the van-der-hub notification API with robust error handling.
 */

interface NotificationResponse {
  sent: boolean
}

/**
 * Send a broadcast notification message
 *
 * @param message The message content to broadcast
 * @returns Promise that resolves when the notification is sent
 * @throws Error if the API key is not configured or the request fails
 */
export async function sendNotification(message: string): Promise<void> {
  // Validate inputs
  if (!message || message.trim().length === 0) {
    throw new Error('Notification message cannot be empty')
  }

  // Check for API key
  const apiKey = process.env.NOTI_API_KEY
  if (!apiKey) {
    throw new Error('NOTI_API_KEY environment variable is not configured')
  }

  const API_URL = 'https://van-der-hub.flori.dev/noti/broadcast'

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message.trim(),
      }),
    })

    // Check if the response is ok
    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error'
      throw new Error(
        `Notification API error (${response.status}): ${statusText}`,
      )
    }

    // Validate the success response
    try {
      const responseData = (await response.json()) as NotificationResponse
      if (!responseData.sent) {
        throw new Error('Notification was not sent successfully')
      }
    } catch (parseError) {
      // If we can't parse the response but the status was ok, assume success
      if (
        parseError instanceof Error &&
        parseError.message === 'Notification was not sent successfully'
      ) {
        throw parseError
      }
      // Otherwise, ignore JSON parsing errors for successful requests
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof Error) {
      throw error
    }

    // Handle network errors and other unexpected issues
    throw new Error(`Failed to send notification: ${String(error)}`)
  }
}

/**
 * Send a notification with additional context for debugging
 *
 * This is a wrapper around sendNotification that adds error logging
 * and is useful for fire-and-forget notifications where you don't want
 * to handle errors in the calling code.
 *
 * @param message The message content to broadcast
 * @param context Optional context for logging (e.g., "iTunes price update")
 * @returns Promise that resolves regardless of success/failure
 */
export async function sendNotificationSafe(
  message: string,
  context?: string,
): Promise<void> {
  try {
    await sendNotification(message)
    console.log(
      `Notification sent successfully${context ? ` (${context})` : ''}`,
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      `Failed to send notification${context ? ` (${context})` : ''}: ${errorMessage}`,
    )
  }
}
