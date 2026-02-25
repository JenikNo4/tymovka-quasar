<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">{{ t('notifications.title') }}</div>
      <q-btn
        flat
        color="primary"
        icon="done_all"
        :label="t('notifications.markAllRead')"
        :disable="!notifications.length || markReadLoading"
        :loading="markReadLoading"
        @click="markAllRead"
      />
    </div>

    <q-banner v-if="errorMessage" class="bg-negative text-white q-mb-md">
      {{ errorMessage }}
    </q-banner>

    <q-list v-if="notifications.length" bordered separator>
      <q-item v-for="n in notifications" :key="n.id">
        <q-item-section>
          <q-item-label class="text-weight-medium">
            {{ n.title || t('notifications.teamInviteTitle') }}
          </q-item-label>
          <q-item-label caption>
            {{ n.message || '-' }}
          </q-item-label>
          <q-item-label caption class="text-grey-7">
            {{ formatDateTime(n.createdAt) }}
          </q-item-label>
          <q-item-label v-if="n.resolvedAt" caption class="text-positive">
            {{ t('notifications.resolvedAt', { date: formatDateTime(n.resolvedAt), resolution: resolutionLabel(n.resolution) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row q-gutter-sm">
            <q-btn
              v-if="n.type === 'TEAM_INVITE' && n.teamId"
              dense
              :color="n.actionAvailable ? 'positive' : 'grey-6'"
              :label="t('notifications.acceptInvite')"
              :disable="!n.actionAvailable || isActionLoading(n.id)"
              :loading="actionLoadingId === `${n.id}:accept`"
              @click="acceptInvite(n.id, n.teamId)"
            />
            <q-btn
              v-if="n.type === 'TEAM_INVITE' && n.teamId"
              dense
              :flat="!n.actionAvailable"
              :color="n.actionAvailable ? 'negative' : 'grey-6'"
              :label="t('notifications.declineInvite')"
              :disable="!n.actionAvailable || isActionLoading(n.id)"
              :loading="actionLoadingId === `${n.id}:decline`"
              @click="declineInvite(n.id, n.teamId)"
            />
            <q-btn
              v-if="n.type !== 'TEAM_INVITE'"
              dense
              flat
              color="primary"
              :label="t('notifications.ok')"
              :disable="!n.actionAvailable || isActionLoading(n.id)"
              :loading="actionLoadingId === `${n.id}:ok`"
              @click="ackNotification(n.id)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <q-card v-else flat bordered>
      <q-card-section class="text-grey-7">
        {{ t('notifications.empty') }}
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useAuth } from 'src/stores/useAuth'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type NotificationType =
  | 'TEAM_INVITE'
  | 'EVENT_INVITE_MATCH'
  | 'EVENT_SERIES_INVITE_DIGEST'
  | 'EVENT_UPDATED'
  | 'EVENT_UPDATED_EARLIER'
  | 'EVENT_CANCELED'
type NotificationResolution = 'ACCEPTED' | 'DECLINED' | 'DISMISSED' | 'AUTO_RESOLVED'

type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  message?: string | null
  requiresAction: boolean
  actionAvailable: boolean
  readAt?: string | null
  resolution?: NotificationResolution | null
  resolvedAt?: string | null
  createdAt: string
  teamId?: string | null
}

const $q = useQuasar()
const { t } = useI18n()
const auth = useAuth()

const notifications = ref<NotificationItem[]>([])
const errorMessage = ref('')
const markReadLoading = ref(false)
const actionLoadingId = ref('')

async function gqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const json: GraphQlResponse<T> = await response.json()
  if (json.errors?.length) throw new Error(json.errors[0]?.message || 'GraphQL error')
  if (!json.data) throw new Error('Empty GraphQL response')
  return json.data
}

function formatDateTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString('cs-CZ')
}

function isActionLoading(notificationId: string): boolean {
  return actionLoadingId.value.startsWith(`${notificationId}:`)
}

function resolutionLabel(resolution: NotificationResolution | null | undefined): string {
  if (!resolution) return ''
  const key = `notifications.resolution.${resolution}`
  const translated = t(key)
  return translated === key ? resolution : translated
}

async function loadNotifications() {
  errorMessage.value = ''
  try {
    const data = await gqlRequest<{ notifications: NotificationItem[] }>(
      `
      query {
        notifications(limit: 50, unreadOnly: false) {
          id
          type
          title
          message
          requiresAction
          actionAvailable
          readAt
          resolution
          resolvedAt
          createdAt
          teamId
        }
      }
      `
    )
    notifications.value = data.notifications
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('notifications.loadFailed')
  }
}

async function markAllRead() {
  markReadLoading.value = true
  try {
    await markAllReadSilently()
    await loadNotifications()
    $q.notify({ type: 'positive', message: t('notifications.markAllReadSuccess') })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : t('notifications.markReadFailed'),
    })
  } finally {
    markReadLoading.value = false
  }
}

async function markAllReadSilently() {
  await gqlRequest<{ markAllNotificationsRead: boolean }>(
    `
    mutation {
      markAllNotificationsRead
    }
    `
  )
}

async function resolveNotification(notificationId: string, resolution: NotificationResolution) {
  await gqlRequest<{ resolveNotification: boolean }>(
    `
    mutation($notificationId: ID!, $resolution: NotificationResolution!) {
      resolveNotification(notificationId: $notificationId, resolution: $resolution)
    }
    `,
    { notificationId, resolution }
  )
}

async function acceptInvite(notificationId: string, teamId: string) {
  actionLoadingId.value = `${notificationId}:accept`
  try {
    await gqlRequest<{ acceptTeamInvite: boolean }>(
      `
      mutation($teamId: ID!) {
        acceptTeamInvite(teamId: $teamId)
      }
      `,
      { teamId }
    )
    await resolveNotification(notificationId, 'ACCEPTED')
    await loadNotifications()
    await auth.refreshMe()
    $q.notify({ type: 'positive', message: t('notifications.acceptSuccess') })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : t('notifications.actionFailed'),
    })
  } finally {
    actionLoadingId.value = ''
  }
}

async function declineInvite(notificationId: string, teamId: string) {
  actionLoadingId.value = `${notificationId}:decline`
  try {
    await gqlRequest<{ declineTeamInvite: boolean }>(
      `
      mutation($teamId: ID!) {
        declineTeamInvite(teamId: $teamId)
      }
      `,
      { teamId }
    )
    await resolveNotification(notificationId, 'DECLINED')
    await loadNotifications()
    $q.notify({ type: 'positive', message: t('notifications.declineSuccess') })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : t('notifications.actionFailed'),
    })
  } finally {
    actionLoadingId.value = ''
  }
}

async function ackNotification(notificationId: string) {
  actionLoadingId.value = `${notificationId}:ok`
  try {
    await resolveNotification(notificationId, 'DISMISSED')
    await loadNotifications()
    $q.notify({ type: 'positive', message: t('notifications.markAllReadSuccess') })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : t('notifications.markReadFailed'),
    })
  } finally {
    actionLoadingId.value = ''
  }
}

onMounted(() => {
  void loadNotifications()
})
</script>
