<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-sm">
        <q-btn flat icon="arrow_back" :label="t('teamDetail.back')" @click="goBack" />
        <div class="text-h5">{{ event?.title || t('event.eventDetailTitle') }}</div>
      </div>
    </div>

    <q-banner v-if="errorMessage" class="bg-red-1 text-red-9 q-mb-md">
      {{ errorMessage }}
    </q-banner>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>

    <q-card v-if="event" bordered flat>
      <q-card-section>
        <div class="text-subtitle1">{{ event.team.name }} | {{ eventTypeLabel(event.eventType) }}</div>
        <div class="text-caption text-grey-7">{{ formatDateTime(event.startTime) }}</div>
        <div class="text-caption text-grey-8 q-mt-xs">{{ attendanceSummary(event) }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="q-mb-sm"><b>{{ t('event.placeLabel') }}:</b> {{ event.location }}</div>
        <div class="q-mb-sm"><b>{{ t('event.noteLabel') }}:</b> {{ event.note || '-' }}</div>
      </q-card-section>

      <q-card-section v-if="canSetMyAttendance">
        <div class="text-subtitle1 q-mb-sm">{{ t('event.myAttendance') }}</div>
        <div class="row q-gutter-sm">
          <q-btn
            v-for="status in participantStatuses"
            :key="status"
            :label="statusLabel(status)"
            :color="myParticipant?.status === status ? 'primary' : 'grey-7'"
            :outline="myParticipant?.status !== status"
            :disable="isPastEvent(event)"
            :loading="attendanceLoading === status"
            @click="setMyAttendance(status)"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">{{ t('event.addGuestTitle') }}</div>
        <div class="row q-gutter-sm items-center">
          <div class="col-12 col-md-5">
            <q-input
              v-model="guestDisplayName"
              dense
              outlined
              :disable="isPastEvent(event)"
              :label="t('event.guestName')"
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="guestPlayerRole"
              dense
              outlined
              emit-value
              map-options
              :disable="isPastEvent(event)"
              :options="guestRoleOptions"
              :label="t('event.guestRole')"
            />
          </div>
          <div class="col-12 col-md-auto">
            <q-btn
              color="primary"
              :label="t('event.addGuest')"
              :disable="isPastEvent(event) || !guestDisplayName.trim()"
              :loading="guestLoading === 'add'"
              @click="addGuest"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-section v-if="event.guests.length">
        <div class="text-subtitle1 q-mb-sm">{{ t('event.guestsList') }}</div>
        <q-list bordered separator>
          <q-item v-for="g in event.guests" :key="g.id">
            <q-item-section>
              <q-item-label>
                {{ g.displayName }}
                <q-badge class="q-ml-sm" color="secondary" :label="t('event.guestBadge')" />
              </q-item-label>
              <q-item-label caption>
                {{ t('event.addedBy') }}: {{ g.addedByUser?.displayName || '-' }}
                <span class="q-ml-sm">{{ t('event.guestRole') }}: {{ playerRoleLabel(g.playerRole) }}</span>
                <q-badge
                  class="q-ml-sm"
                  :color="statusColor(g.status)"
                  :label="statusLabel(g.status)"
                />
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="g.viewerCanRemove" side>
              <q-btn
                dense
                flat
                color="negative"
                :label="t('teamDetail.remove')"
                :disable="isPastEvent(event)"
                :loading="guestLoading === `remove:${g.id}`"
                @click="removeGuest(g.id)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="!event.viewerCanSetAttendanceForOthers">
        <div class="text-subtitle1 q-mb-sm">{{ t('event.participantsList') }}</div>
        <q-list bordered separator>
          <q-item v-for="p in event.participants" :key="p.id">
            <q-item-section>
              <q-item-label>{{ p.membership?.user.displayName || t('common.unknownMember') }}</q-item-label>
              <q-item-label caption>
                {{ p.membership?.user.email || '-' }}
                <q-badge
                  class="q-ml-sm"
                  :color="statusColor(p.status)"
                  :label="statusLabel(p.status)"
                />
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="event.viewerCanSetAttendanceForOthers">
        <div class="text-subtitle1 q-mb-sm">{{ t('event.addParticipants') }}</div>
        <div class="row q-gutter-sm items-center q-mb-md">
          <div class="col-12 col-md-8">
            <q-select
              v-model="addMembershipIds"
              :options="addableMemberOptions"
              option-value="membershipId"
              option-label="label"
              emit-value
              map-options
              multiple
              use-chips
              outlined
              dense
              :disable="isPastEvent(event)"
              :label="t('event.selectMembers')"
            />
          </div>
          <div class="col-12 col-md-auto">
            <q-btn color="primary" :label="t('event.add')" :disable="isPastEvent(event)" :loading="addParticipantsLoading" @click="addParticipants" />
          </div>
          <div v-if="event.seriesId" class="col-12 col-md-auto">
            <q-btn
              color="secondary"
              :label="t('event.addParticipantsToFutureSeries')"
              :disable="isPastEvent(event) || !addMembershipIds.length"
              :loading="addParticipantsLoading"
              @click="addParticipantsToFutureSeries"
            />
          </div>
        </div>

        <div class="text-subtitle1 q-mb-sm">{{ t('event.participantManagement') }}</div>
        <q-list bordered separator>
          <q-item v-for="p in event.participants" :key="p.id">
            <q-item-section>
              <q-item-label>{{ p.membership?.user.displayName || t('common.unknownMember') }}</q-item-label>
              <q-item-label caption>
                {{ p.membership?.user.email || '-' }}
                <q-badge
                  class="q-ml-sm"
                  :color="statusColor(p.status)"
                  :label="statusLabel(p.status)"
                />
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-xs">
                <q-btn
                  v-if="p.membership?.id"
                  dense
                  flat
                  color="negative"
                  :label="t('teamDetail.remove')"
                  :disable="isPastEvent(event)"
                  :loading="attendanceLoading === `remove:${p.membership?.id}`"
                  @click="removeParticipantFromEvent(p.membership?.id)"
                />
                <q-btn
                  v-for="status in participantStatuses"
                  :key="`${p.id}-${status}`"
                  dense
                  flat
                  :color="p.status === status ? 'primary' : 'grey-7'"
                  :label="statusLabel(status)"
                  :disable="isPastEvent(event)"
                  :loading="attendanceLoading === `${p.membership?.id}:${status}`"
                  @click="setAttendanceForMember(p.membership?.id, status)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="event.viewerCanViewLogs">
        <div class="text-subtitle1 q-mb-sm">{{ t('event.activityLogTitle') }}</div>
        <q-list v-if="sortedLogs.length" bordered separator>
          <q-item v-for="log in sortedLogs" :key="log.id">
            <q-item-section>
              <q-item-label>{{ logActionLabel(log.action) }}</q-item-label>
              <q-item-label caption>{{ log.message || '-' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption>{{ formatDateTime(log.createdAt) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="text-caption text-grey-7">
          {{ t('event.noActivityLogs') }}
        </div>
      </q-card-section>

      <q-card-section v-if="event.viewerCanViewLogs">
        <NotificationDeliveryTable
          :title="t('event.deliveryTitle')"
          :subtitle="t('event.deliverySubtitle')"
          :empty-text="t('event.noDeliveries')"
          :deliveries="notificationDeliveries"
          :loading="deliveryLoading"
          :page="deliveryPage"
          :total-pages="deliveryTotalPages"
          :total-elements="deliveryTotalElements"
          @refresh="loadNotificationDeliveries"
          @prev="prevDeliveryPage"
          @next="nextDeliveryPage"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from 'src/stores/useAuth'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import NotificationDeliveryTable from 'src/components/NotificationDeliveryTable.vue'
import type { NotificationDelivery } from 'src/types/notification-delivery'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type ParticipantStatus = 'INVITED' | 'GOING' | 'MAYBE' | 'WAITLIST' | 'DECLINED'
type EventParticipant = {
  id: string
  status: ParticipantStatus
  substituteName?: string | null
  membership?: {
    id: string
    playerRole?: 'PLAYER' | 'GOALKEEPER'
    user: { id: string; email: string; displayName: string }
  } | null
}
type EventGuest = {
  id: string
  displayName: string
  playerRole: 'PLAYER' | 'GOALKEEPER'
  status: ParticipantStatus
  viewerCanRemove: boolean
  addedByUser?: { id: string; email: string; displayName: string } | null
}
type EventLogItem = {
  id: string
  action: string
  message?: string | null
  createdAt: string
}
type EventItem = {
  id: string
  title: string
  eventType: string
  seriesId?: string | null
  startTime: string
  endTime?: string | null
  location: string
  note?: string | null
  maxPlayers?: number | null
  maxGoalies?: number | null
  viewerCanSetAttendanceForOthers: boolean
  viewerCanViewLogs: boolean
  team: { id: string; name: string }
  participants: EventParticipant[]
  guests: EventGuest[]
  logs: EventLogItem[]
}
type TeamMembershipOption = { membershipId: string; label: string }
type NotificationDeliveryPage = {
  items: NotificationDelivery[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const $q = useQuasar()
const { t } = useI18n()

const eventId = String(route.params.id ?? '')
const loading = ref(false)
const errorMessage = ref('')
const event = ref<EventItem | null>(null)
const attendanceLoading = ref('')
const guestLoading = ref('')
const addParticipantsLoading = ref(false)
const detailMemberOptions = ref<TeamMembershipOption[]>([])
const addMembershipIds = ref<string[]>([])
const guestDisplayName = ref('')
const guestPlayerRole = ref<'PLAYER' | 'GOALKEEPER'>('PLAYER')
const notificationDeliveries = ref<NotificationDelivery[]>([])
const deliveryLoading = ref(false)
const deliveryPage = ref(0)
const deliveryPageSize = ref(25)
const deliveryTotalElements = ref(0)
const deliveryTotalPages = ref(0)
const participantStatuses: ParticipantStatus[] = ['INVITED', 'GOING', 'MAYBE', 'DECLINED']
const guestRoleOptions = computed(() => [
  { label: t('teamDetail.playerRolePlayer'), value: 'PLAYER' },
  { label: t('teamDetail.playerRoleGoalkeeper'), value: 'GOALKEEPER' },
])

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

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  void router.push({ name: 'myEvents' })
}

function isPastEvent(value: EventItem | null): boolean {
  if (!value) return false
  const dt = new Date(value.startTime)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getTime() < Date.now()
}

function statusLabel(status: ParticipantStatus | null): string {
  if (!status) return t('event.noStatus')
  return t(`event.statusLabel.${status}`)
}

function statusColor(status: ParticipantStatus | null): string {
  if (status === 'GOING') return 'positive'
  if (status === 'MAYBE') return 'warning'
  if (status === 'WAITLIST') return 'deep-orange'
  if (status === 'DECLINED') return 'negative'
  return 'grey-7'
}

function attendanceSummary(value: EventItem): string {
  const goingPlayers = value.participants.filter(
    (p) => p.status === 'GOING' && p.membership?.playerRole === 'PLAYER'
  ).length + value.guests.filter((g) => g.status === 'GOING' && g.playerRole === 'PLAYER').length
  const goingGoalies = value.participants.filter(
    (p) => p.status === 'GOING' && p.membership?.playerRole === 'GOALKEEPER'
  ).length + value.guests.filter((g) => g.status === 'GOING' && g.playerRole === 'GOALKEEPER').length
  const maxPlayers = value.maxPlayers != null ? String(value.maxPlayers) : '-'
  const maxGoalies = value.maxGoalies != null ? String(value.maxGoalies) : '-'
  return `${t('event.signedSummary')} ${goingPlayers}/${maxPlayers} + ${goingGoalies}/${maxGoalies} ${t('event.goalies')}`
}

function playerRoleLabel(role: 'PLAYER' | 'GOALKEEPER'): string {
  return role === 'GOALKEEPER' ? t('teamDetail.playerRoleGoalkeeper') : t('teamDetail.playerRolePlayer')
}

function eventTypeLabel(eventType: string): string {
  if (eventType === 'TRAINING' || eventType === 'MATCH' || eventType === 'OTHER') {
    return t(`event.typeLabel.${eventType}`)
  }
  return eventType
}

function formatDateTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString('cs-CZ')
}

function logActionLabel(action: string): string {
  const key = `event.logAction.${action}`
  const translated = t(key)
  return translated === key ? action : translated
}

const myParticipant = computed(() => {
  const value = event.value
  const email = auth.user?.email
  if (!value || !email) return null
  return value.participants.find((p) => p.membership?.user.email === email) || null
})

const canSetMyAttendance = computed(() => {
  const value = event.value
  return Boolean(value && !value.viewerCanSetAttendanceForOthers)
})

const addableMemberOptions = computed(() => {
  const value = event.value
  if (!value) return []
  const existingMembershipIds = new Set(
    value.participants.map((p) => p.membership?.id).filter((v): v is string => Boolean(v))
  )
  return detailMemberOptions.value.filter((o) => !existingMembershipIds.has(o.membershipId))
})

const sortedLogs = computed(() => {
  const value = event.value
  if (!value) return []
  return [...value.logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

async function loadTeamMemberOptions(teamId: string) {
  const data = await gqlRequest<{ teamMembers: Array<{ id: string; user: { displayName: string; email: string } }> }>(
    `
    query($teamId: ID!) {
      teamMembers(teamId: $teamId) {
        id
        user { displayName email }
      }
    }
    `,
    { teamId }
  )
  detailMemberOptions.value = data.teamMembers.map((m) => ({
    membershipId: m.id,
    label: `${m.user.displayName} (${m.user.email})`,
  }))
}

async function loadEvent() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await gqlRequest<{ event: EventItem | null }>(
      `
      query($eventId: ID!) {
        event(eventId: $eventId) {
          id
          title
          eventType
          seriesId
          startTime
          endTime
          location
          note
          maxPlayers
          maxGoalies
          viewerCanSetAttendanceForOthers
          viewerCanViewLogs
          team { id name }
          logs {
            id
            action
            message
            createdAt
          }
          participants {
            id
            status
            substituteName
            membership {
              id
              playerRole
              user { id email displayName }
            }
          }
          guests {
            id
            displayName
            playerRole
            status
            viewerCanRemove
            addedByUser { id email displayName }
          }
        }
      }
      `,
      { eventId }
    )
    if (!data.event) throw new Error(t('event.eventNotFound'))
    event.value = data.event
    await loadTeamMemberOptions(data.event.team.id)
    if (data.event.viewerCanViewLogs) {
      await loadNotificationDeliveries()
    } else {
      notificationDeliveries.value = []
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : t('event.detailLoadFailed')
  } finally {
    loading.value = false
  }
}

async function loadNotificationDeliveries() {
  if (!event.value?.viewerCanViewLogs) return
  deliveryLoading.value = true
  try {
    const data = await gqlRequest<{ eventNotificationDeliveries: NotificationDeliveryPage }>(
      `
      query($eventId: ID!, $page: Int, $size: Int) {
        eventNotificationDeliveries(eventId: $eventId, page: $page, size: $size) {
          items {
            id
            channel
            type
            status
            recipientEmail
            teamId
            eventId
            seriesId
            groupKey
            attemptCount
            lastError
            createdAt
            sentAt
            lastAttemptAt
          }
          totalElements
          totalPages
          page
          size
        }
      }
      `,
      { eventId, page: deliveryPage.value, size: deliveryPageSize.value }
    )
    notificationDeliveries.value = data.eventNotificationDeliveries.items
    deliveryTotalElements.value = data.eventNotificationDeliveries.totalElements
    deliveryTotalPages.value = data.eventNotificationDeliveries.totalPages
    deliveryPage.value = data.eventNotificationDeliveries.page
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.deliveryLoadFailed') })
  } finally {
    deliveryLoading.value = false
  }
}

function prevDeliveryPage() {
  if (deliveryPage.value <= 0) return
  deliveryPage.value -= 1
  void loadNotificationDeliveries()
}

function nextDeliveryPage() {
  if (deliveryPage.value + 1 >= deliveryTotalPages.value) return
  deliveryPage.value += 1
  void loadNotificationDeliveries()
}

async function setMyAttendance(status: ParticipantStatus) {
  const value = event.value
  if (!value) return
  attendanceLoading.value = status
  try {
    await gqlRequest<{ setMyAttendance: { id: string } }>(
      `
      mutation($eventId: ID!, $status: ParticipantStatus!, $substituteName: String) {
        setMyAttendance(eventId: $eventId, status: $status, substituteName: $substituteName) { id }
      }
      `,
      { eventId: value.id, status, substituteName: null }
    )
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.attendanceUpdated') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.attendanceUpdateFailed') })
  } finally {
    attendanceLoading.value = ''
  }
}

async function setAttendanceForMember(membershipId: string | undefined, status: ParticipantStatus) {
  const value = event.value
  if (!value || !membershipId) return
  attendanceLoading.value = `${membershipId}:${status}`
  try {
    await gqlRequest<{ adminSetAttendance: { id: string } }>(
      `
      mutation($eventId: ID!, $membershipId: ID!, $status: ParticipantStatus!, $substituteName: String) {
        adminSetAttendance(eventId: $eventId, membershipId: $membershipId, status: $status, substituteName: $substituteName) { id }
      }
      `,
      { eventId: value.id, membershipId, status, substituteName: null }
    )
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.memberAttendanceUpdated') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.attendanceUpdateFailed') })
  } finally {
    attendanceLoading.value = ''
  }
}

async function addParticipants() {
  const value = event.value
  if (!value || !addMembershipIds.value.length) return
  addParticipantsLoading.value = true
  try {
    await gqlRequest<{ addParticipants: { id: string } }>(
      `
      mutation($eventId: ID!, $membershipIds: [ID!]!) {
        addParticipants(eventId: $eventId, membershipIds: $membershipIds) { id }
      }
      `,
      { eventId: value.id, membershipIds: addMembershipIds.value }
    )
    addMembershipIds.value = []
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.addParticipantsSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.addParticipantsFailed') })
  } finally {
    addParticipantsLoading.value = false
  }
}

async function addParticipantsToFutureSeries() {
  const value = event.value
  if (!value || !addMembershipIds.value.length) return
  addParticipantsLoading.value = true
  try {
    await gqlRequest<{ addParticipantsToFutureSeries: Array<{ id: string }> }>(
      `
      mutation($eventId: ID!, $membershipIds: [ID!]!) {
        addParticipantsToFutureSeries(eventId: $eventId, membershipIds: $membershipIds) { id }
      }
      `,
      { eventId: value.id, membershipIds: addMembershipIds.value }
    )
    addMembershipIds.value = []
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.addParticipantsToFutureSeriesSuccess') })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : t('event.addParticipantsToFutureSeriesFailed'),
    })
  } finally {
    addParticipantsLoading.value = false
  }
}

async function addGuest() {
  const value = event.value
  const displayName = guestDisplayName.value.trim()
  if (!value || !displayName) return
  guestLoading.value = 'add'
  try {
    await gqlRequest<{ addEventGuest: { id: string } }>(
      `
      mutation($eventId: ID!, $displayName: String!, $playerRole: PlayerRole!, $status: ParticipantStatus!) {
        addEventGuest(eventId: $eventId, displayName: $displayName, playerRole: $playerRole, status: $status) { id }
      }
      `,
      { eventId: value.id, displayName, playerRole: guestPlayerRole.value, status: 'GOING' }
    )
    guestDisplayName.value = ''
    guestPlayerRole.value = 'PLAYER'
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.addGuestSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.addGuestFailed') })
  } finally {
    guestLoading.value = ''
  }
}

async function removeGuest(guestId: string) {
  const value = event.value
  if (!value) return
  guestLoading.value = `remove:${guestId}`
  try {
    await gqlRequest<{ removeEventGuest: { id: string } }>(
      `
      mutation($eventId: ID!, $guestId: ID!) {
        removeEventGuest(eventId: $eventId, guestId: $guestId) { id }
      }
      `,
      { eventId: value.id, guestId }
    )
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.removeGuestSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.removeGuestFailed') })
  } finally {
    guestLoading.value = ''
  }
}

async function removeParticipantFromEvent(membershipId: string | undefined) {
  const value = event.value
  if (!value || !membershipId) return
  attendanceLoading.value = `remove:${membershipId}`
  try {
    await gqlRequest<{ removeParticipant: { id: string } }>(
      `
      mutation($eventId: ID!, $membershipId: ID!) {
        removeParticipant(eventId: $eventId, membershipId: $membershipId) { id }
      }
      `,
      { eventId: value.id, membershipId }
    )
    await loadEvent()
    $q.notify({ type: 'positive', message: t('event.removeParticipantSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.removeParticipantFailed') })
  } finally {
    attendanceLoading.value = ''
  }
}

onMounted(async () => {
  if (!eventId) {
    await router.replace({ name: 'myEvents' })
    return
  }
  if (!auth.meLoaded) await auth.fetchMe()
  await loadEvent()
})
</script>
