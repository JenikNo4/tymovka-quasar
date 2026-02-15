<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-sm">
        <q-btn flat icon="arrow_back" :label="t('teamDetail.back')" @click="goBackToTeam" />
        <div class="text-h5">{{ team?.name || t('teamDetail.eventsTitle') }}</div>
      </div>
      <q-btn
        v-if="team?.viewerCanManage"
        color="primary"
        icon="add"
        :label="t('event.addEvent')"
        @click="openCreateDialog"
      />
    </div>

    <q-banner v-if="errorMessage" class="bg-red-1 text-red-9 q-mb-md">
      {{ errorMessage }}
    </q-banner>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>

    <q-card bordered flat>
      <q-card-section>
        <div class="text-subtitle1">{{ t('teamDetail.eventsTitle') }}</div>
      </q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="event in upcomingEvents" :key="event.id">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ event.title }}</q-item-label>
            <q-item-label caption>
              {{ eventTypeLabel(event.eventType) }} | {{ formatDateTime(event.startTime) }}
            </q-item-label>
            <q-item-label caption>{{ event.location }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn flat color="primary" :label="t('teamDetail.openEventDetail')" @click="openEventDetail(event.id)" />
              <q-btn
                v-if="event.viewerCanEdit"
                flat
                color="primary"
                :label="t('event.editEvent')"
                @click="openEditDialog(event)"
              />
              <q-btn
                v-if="event.viewerCanEdit"
                flat
                color="negative"
                :label="t('event.deleteEvent')"
                @click="openDeleteDialog(event)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!upcomingEvents.length && !pastEvents.length">
          <q-item-section>
            <q-item-label caption>{{ t('event.noEvents') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="pastEvents.length">
          <q-item-section>
            <q-item-label class="text-caption text-grey-7 text-uppercase">
              {{ t('teamDetail.pastEvents') }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-for="event in pastEvents" :key="`past-${event.id}`">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ event.title }}</q-item-label>
            <q-item-label caption>
              {{ eventTypeLabel(event.eventType) }} | {{ formatDateTime(event.startTime) }}
            </q-item-label>
            <q-item-label caption>{{ event.location }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn flat color="primary" :label="t('teamDetail.openEventDetail')" @click="openEventDetail(event.id)" />
              <q-btn
                v-if="event.viewerCanEdit"
                flat
                color="primary"
                :label="t('event.editEvent')"
                @click="openEditDialog(event)"
              />
              <q-btn
                v-if="event.viewerCanEdit"
                flat
                color="negative"
                :label="t('event.deleteEvent')"
                @click="openDeleteDialog(event)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-dialog v-model="createDialog">
      <q-card style="min-width: 460px; max-width: 96vw;">
        <q-card-section>
          <div class="text-h6">{{ t('event.createTitle') }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="createForm.title" outlined dense :label="t('event.title')" />
          <q-select v-model="createForm.eventType" :options="eventTypes" outlined dense :label="t('event.type')" @update:model-value="applyCreateTypeDefaults" />
          <q-input v-model="createForm.startLocal" outlined dense type="datetime-local" :label="t('event.start')" />
          <q-input v-model="createForm.endLocal" outlined dense type="datetime-local" :label="t('event.endOptional')" />
          <q-input v-model="createForm.location" outlined dense :label="t('event.location')" />
          <q-input v-model="createForm.note" outlined dense autogrow type="textarea" :label="t('event.noteOptional')" />
          <q-input v-model="createForm.maxPlayers" outlined dense type="number" min="0" :label="t('event.maxPlayers')" />
          <q-input v-model="createForm.maxGoalies" outlined dense type="number" min="0" :label="t('event.maxGoalies')" />
          <q-toggle v-model="createForm.inviteAllMembers" :label="t('event.inviteAll')" />
          <q-select
            v-if="!createForm.inviteAllMembers"
            v-model="createForm.invitedMembershipIds"
            :options="memberOptions"
            option-value="membershipId"
            option-label="label"
            emit-value
            map-options
            multiple
            use-chips
            outlined
            dense
            :label="t('event.inviteSelected')"
          />
          <q-toggle v-model="createForm.repeatWeekly" :label="t('event.repeatWeekly')" />
          <q-input
            v-if="createForm.repeatWeekly"
            v-model="createForm.repeatUntil"
            outlined
            dense
            type="date"
            :label="t('event.repeatUntil')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup :disable="createLoading" />
          <q-btn color="primary" :label="t('common.save')" :loading="createLoading" @click="createEvent" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="editDialog">
      <q-card style="min-width: 460px; max-width: 96vw;">
        <q-card-section>
          <div class="text-h6">{{ t('event.editTitle') }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editForm.title" outlined dense :label="t('event.title')" />
          <q-select v-model="editForm.eventType" :options="eventTypes" outlined dense :label="t('event.type')" @update:model-value="applyEditTypeDefaults" />
          <q-input v-model="editForm.startLocal" outlined dense type="datetime-local" :label="t('event.start')" />
          <q-input v-model="editForm.endLocal" outlined dense type="datetime-local" :label="t('event.endOptional')" />
          <q-input v-model="editForm.location" outlined dense :label="t('event.location')" />
          <q-input v-model="editForm.note" outlined dense autogrow type="textarea" :label="t('event.noteOptional')" />
          <q-input v-model="editForm.maxPlayers" outlined dense type="number" min="0" :label="t('event.maxPlayers')" />
          <q-input v-model="editForm.maxGoalies" outlined dense type="number" min="0" :label="t('event.maxGoalies')" />
          <q-option-group
            v-if="selectedEvent?.seriesId"
            v-model="editScope"
            :options="scopeOptions"
            color="primary"
            type="radio"
            :label="t('event.applyScope')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup :disable="editLoading" />
          <q-btn color="primary" :label="t('common.save')" :loading="editLoading" @click="saveEventEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 420px; max-width: 96vw;">
        <q-card-section>
          <div class="text-h6">{{ t('event.deleteTitle') }}</div>
        </q-card-section>
        <q-card-section>
          <div class="q-mb-md">{{ t('event.deleteMessage') }}</div>
          <q-option-group
            v-if="selectedEvent?.seriesId"
            v-model="deleteScope"
            :options="scopeOptions"
            color="primary"
            type="radio"
            :label="t('event.applyScope')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup :disable="deleteLoading" />
          <q-btn color="negative" :label="t('event.deleteEvent')" :loading="deleteLoading" @click="deleteEventWithScope" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type TeamDetail = {
  id: string
  name: string
  viewerCanManage: boolean
}
type TeamEvent = {
  id: string
  title: string
  eventType: string
  startTime: string
  endTime?: string | null
  seriesId?: string | null
  location: string
  note?: string | null
  maxPlayers?: number | null
  maxGoalies?: number | null
  viewerCanEdit: boolean
}
type EventType = 'TRAINING' | 'MATCH' | 'OTHER'
type EventChangeScope = 'SINGLE' | 'SERIES'
type TeamMembershipOption = { membershipId: string; label: string }

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

const teamId = String(route.params.id ?? '')
const loading = ref(false)
const errorMessage = ref('')
const team = ref<TeamDetail | null>(null)
const teamEvents = ref<TeamEvent[]>([])
const createDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)
const createLoading = ref(false)
const editLoading = ref(false)
const deleteLoading = ref(false)
const selectedEvent = ref<TeamEvent | null>(null)
const eventTypes: EventType[] = ['TRAINING', 'MATCH', 'OTHER']
const editScope = ref<EventChangeScope>('SINGLE')
const deleteScope = ref<EventChangeScope>('SINGLE')
const memberOptions = ref<TeamMembershipOption[]>([])
const scopeOptions = computed(() => [
  { label: t('event.applySingle'), value: 'SINGLE' as const },
  { label: t('event.applySeries'), value: 'SERIES' as const },
])
const upcomingEvents = computed(() =>
  teamEvents.value
    .filter((event) => !isPastEvent(event))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
)
const pastEvents = computed(() =>
  teamEvents.value
    .filter((event) => isPastEvent(event))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
)
const createForm = ref({
  title: '',
  eventType: 'TRAINING' as EventType,
  startLocal: '',
  endLocal: '',
  location: '',
  note: '',
  maxPlayers: '20',
  maxGoalies: '2',
  inviteAllMembers: true,
  invitedMembershipIds: [] as string[],
  repeatWeekly: false,
  repeatUntil: '',
})
const editForm = ref({
  title: '',
  eventType: 'TRAINING' as EventType,
  startLocal: '',
  endLocal: '',
  location: '',
  note: '',
  maxPlayers: '20',
  maxGoalies: '2',
})

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

function goBackToTeam() {
  void router.push({ name: 'teamDetail', params: { id: teamId } })
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

function isPastEvent(event: TeamEvent): boolean {
  const dt = new Date(event.startTime)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getTime() < Date.now()
}

function toIsoOrNull(localValue: string): string | null {
  if (!localValue) return null
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const INVALID_CAPACITY = Symbol('INVALID_CAPACITY')
type ParsedCapacity = number | null | typeof INVALID_CAPACITY

function defaultCapacitiesForType(eventType: EventType): { maxPlayers: string; maxGoalies: string } {
  if (eventType === 'TRAINING') return { maxPlayers: '20', maxGoalies: '2' }
  if (eventType === 'MATCH') return { maxPlayers: '15', maxGoalies: '1' }
  return { maxPlayers: '', maxGoalies: '' }
}

function applyCreateTypeDefaults() {
  const defaults = defaultCapacitiesForType(createForm.value.eventType)
  createForm.value.maxPlayers = defaults.maxPlayers
  createForm.value.maxGoalies = defaults.maxGoalies
}

function applyEditTypeDefaults() {
  const defaults = defaultCapacitiesForType(editForm.value.eventType)
  editForm.value.maxPlayers = defaults.maxPlayers
  editForm.value.maxGoalies = defaults.maxGoalies
}

function parseCapacity(rawValue: string): ParsedCapacity {
  const value = rawValue.trim()
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return INVALID_CAPACITY
  return parsed
}

function openEventDetail(eventId: string) {
  void router.push({ name: 'eventDetail', params: { id: eventId } })
}

async function loadTeam() {
  const teamData = await gqlRequest<{ teamById: TeamDetail }>(
    `
    query($teamId: ID!) {
      teamById(teamId: $teamId) {
        id
        name
        viewerCanManage
      }
    }
    `,
    { teamId }
  )
  team.value = teamData.teamById
}

async function loadEvents() {
  const eventsData = await gqlRequest<{ teamEvents: TeamEvent[] }>(
    `
    query($teamId: ID!) {
      teamEvents(teamId: $teamId) {
        id
        title
        eventType
        startTime
        endTime
        seriesId
        location
        note
        maxPlayers
        maxGoalies
        viewerCanEdit
      }
    }
    `,
    { teamId }
  )
  teamEvents.value = eventsData.teamEvents
}

async function loadMemberOptions() {
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
  memberOptions.value = data.teamMembers.map(m => ({
    membershipId: m.id,
    label: `${m.user.displayName} (${m.user.email})`,
  }))
}

function openCreateDialog() {
  createForm.value = {
    title: '',
    eventType: 'TRAINING',
    startLocal: '',
    endLocal: '',
    location: '',
    note: '',
    maxPlayers: '20',
    maxGoalies: '2',
    inviteAllMembers: true,
    invitedMembershipIds: [],
    repeatWeekly: false,
    repeatUntil: '',
  }
  createDialog.value = true
  void loadMemberOptions()
}

async function createEvent() {
  if (!createForm.value.title.trim() || !createForm.value.location.trim() || !createForm.value.startLocal) {
    $q.notify({ type: 'warning', message: t('event.createNeedRequiredFields') })
    return
  }
  const startIso = toIsoOrNull(createForm.value.startLocal)
  const endIso = toIsoOrNull(createForm.value.endLocal)
  const maxPlayers = parseCapacity(createForm.value.maxPlayers)
  const maxGoalies = parseCapacity(createForm.value.maxGoalies)
  if (!startIso) {
    $q.notify({ type: 'warning', message: t('event.createInvalidStart') })
    return
  }
  if (maxPlayers === INVALID_CAPACITY || maxGoalies === INVALID_CAPACITY) {
    $q.notify({ type: 'warning', message: t('event.createInvalidCapacity') })
    return
  }

  createLoading.value = true
  try {
    if (createForm.value.repeatWeekly) {
      if (!createForm.value.repeatUntil) throw new Error(t('event.createNeedRepeatUntil'))
      const repeatUntil = new Date(`${createForm.value.repeatUntil}T23:59:59`)
      if (Number.isNaN(repeatUntil.getTime())) throw new Error(t('event.createInvalidRepeatUntil'))
      const weekDay = ((new Date(startIso).getDay() + 6) % 7) + 1

      await gqlRequest<{ createRecurringEvents: Array<{ id: string }> }>(
        `
        mutation($input: CreateRecurringEventsInput!) {
          createRecurringEvents(input: $input) { id }
        }
        `,
        {
          input: {
            teamId,
            title: createForm.value.title.trim(),
            eventType: createForm.value.eventType,
            startTime: startIso,
            endTime: endIso,
            location: createForm.value.location.trim(),
            note: createForm.value.note.trim() || null,
            maxPlayers,
            maxGoalies,
            inviteAllMembers: createForm.value.inviteAllMembers,
            invitedMembershipIds: createForm.value.inviteAllMembers ? null : createForm.value.invitedMembershipIds,
            repeatUntil: repeatUntil.toISOString(),
            weekDay,
          },
        }
      )
    } else {
      await gqlRequest<{ createEvent: { id: string } }>(
        `
        mutation($input: CreateEventInput!) {
          createEvent(input: $input) { id }
        }
        `,
        {
          input: {
            teamId,
            title: createForm.value.title.trim(),
            eventType: createForm.value.eventType,
            startTime: startIso,
            endTime: endIso,
            location: createForm.value.location.trim(),
            note: createForm.value.note.trim() || null,
            maxPlayers,
            maxGoalies,
            inviteAllMembers: createForm.value.inviteAllMembers,
            invitedMembershipIds: createForm.value.inviteAllMembers ? null : createForm.value.invitedMembershipIds,
          },
        }
      )
    }
    createDialog.value = false
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.createSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.createFailed') })
  } finally {
    createLoading.value = false
  }
}

function openEditDialog(event: TeamEvent) {
  selectedEvent.value = event
  editScope.value = 'SINGLE'
  editForm.value = {
    title: event.title,
    eventType: (event.eventType as EventType) ?? 'TRAINING',
    startLocal: toLocalDateTimeInput(event.startTime),
    endLocal: toLocalDateTimeInput(event.endTime),
    location: event.location,
    note: event.note ?? '',
    maxPlayers: event.maxPlayers != null ? String(event.maxPlayers) : '',
    maxGoalies: event.maxGoalies != null ? String(event.maxGoalies) : '',
  }
  editDialog.value = true
}

async function saveEventEdit() {
  const event = selectedEvent.value
  if (!event) return
  if (!editForm.value.title.trim() || !editForm.value.location.trim() || !editForm.value.startLocal) {
    $q.notify({ type: 'warning', message: t('event.createNeedRequiredFields') })
    return
  }
  const startIso = toIsoOrNull(editForm.value.startLocal)
  const endIso = toIsoOrNull(editForm.value.endLocal)
  const maxPlayers = parseCapacity(editForm.value.maxPlayers)
  const maxGoalies = parseCapacity(editForm.value.maxGoalies)
  if (!startIso) {
    $q.notify({ type: 'warning', message: t('event.createInvalidStart') })
    return
  }
  if (maxPlayers === INVALID_CAPACITY || maxGoalies === INVALID_CAPACITY) {
    $q.notify({ type: 'warning', message: t('event.createInvalidCapacity') })
    return
  }

  editLoading.value = true
  try {
    await gqlRequest<{ updateEvent: { id: string } }>(
      `
      mutation($eventId: ID!, $scope: EventChangeScope!, $input: UpdateEventInput!) {
        updateEvent(eventId: $eventId, scope: $scope, input: $input) { id }
      }
      `,
      {
        eventId: event.id,
        scope: event.seriesId ? editScope.value : 'SINGLE',
        input: {
          title: editForm.value.title.trim(),
          eventType: editForm.value.eventType,
          startTime: startIso,
          endTime: endIso,
          location: editForm.value.location.trim(),
          note: editForm.value.note.trim() || null,
          maxPlayers,
          maxGoalies,
          reminderDaysBefore: null,
        },
      }
    )
    editDialog.value = false
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.editSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.editFailed') })
  } finally {
    editLoading.value = false
  }
}

function openDeleteDialog(event: TeamEvent) {
  selectedEvent.value = event
  deleteScope.value = 'SINGLE'
  deleteDialog.value = true
}

async function deleteEventWithScope() {
  const event = selectedEvent.value
  if (!event) return
  deleteLoading.value = true
  try {
    const res = await gqlRequest<{ deleteEvent: boolean }>(
      `
      mutation($eventId: ID!, $scope: EventChangeScope!) {
        deleteEvent(eventId: $eventId, scope: $scope)
      }
      `,
      {
        eventId: event.id,
        scope: event.seriesId ? deleteScope.value : 'SINGLE',
      }
    )
    if (!res.deleteEvent) throw new Error(t('event.deleteFailed'))
    deleteDialog.value = false
    selectedEvent.value = null
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.deleteSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.deleteFailed') })
  } finally {
    deleteLoading.value = false
  }
}

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    await loadTeam()
    await loadEvents()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : t('event.loadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!teamId) {
    await router.replace({ name: 'myTeams' })
    return
  }
  await loadPage()
})
</script>
