export type NotificationDelivery = {
  id: string
  channel: 'EMAIL' | 'PUSH'
  type: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED_DUPLICATE' | 'SKIPPED_PREFERENCE' | 'SKIPPED_RATE_LIMITED' | 'NOT_IMPLEMENTED'
  recipientEmail?: string | null
  teamId?: string | null
  eventId?: string | null
  seriesId?: string | null
  groupKey?: string | null
  attemptCount: number
  lastError?: string | null
  createdAt: string
  sentAt?: string | null
  lastAttemptAt?: string | null
}
