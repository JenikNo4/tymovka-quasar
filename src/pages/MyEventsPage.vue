<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">{{ t('event.myEventsTitle') }}</div>
      <q-btn
        color="primary"
        icon="add"
        :label="t('event.addEvent')"
        :disable="!manageableTeams.length"
        @click="openCreateDialog"
      />
    </div>

    <q-banner v-if="loadError" class="bg-red-1 text-red-9 q-mb-md">
      {{ loadError }}
    </q-banner>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>

    <q-list v-if="events.length" bordered separator>
      <q-item v-for="event in events" :key="event.id" clickable @click="goToEventDetail(event.id)">
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ event.title }}</q-item-label>
          <q-item-label caption>
            {{ event.team.name }} | {{ eventTypeLabel(event.eventType) }} | {{ formatDateTime(event.startTime) }}
          </q-item-label>
          <q-item-label caption>
            {{ event.location }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge :color="statusColor(event.myStatus)" :label="statusLabel(event.myStatus)" />
        </q-item-section>
      </q-item>
    </q-list>

    <q-banner v-else-if="!loading" class="bg-grey-2 q-pa-md">
      {{ t('event.noEvents') }}
    </q-banner>

    <q-dialog v-model="createDialog">
      <q-card style="min-width: 460px; max-width: 96vw;">
        <q-card-section>
          <div class="text-h6">{{ t('event.createTitle') }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-select
            v-model="createForm.teamId"
            :options="manageableTeams"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            outlined
            dense
            :label="requiredLabel(t('event.team'))"
          />
          <q-input v-model="createForm.title" outlined dense :label="requiredLabel(t('event.title'))" />
          <q-select
            v-model="createForm.eventType"
            :options="eventTypes"
            outlined
            dense
            :label="t('event.type')"
            @update:model-value="applyCreateTypeDefaults"
          />
          <q-input v-model="createForm.startLocal" outlined dense type="datetime-local" :label="requiredLabel(t('event.start'))" />
          <q-input v-model="createForm.endLocal" outlined dense type="datetime-local" :label="t('event.endOptional')" />
          <q-input v-model="createForm.location" outlined dense :label="requiredLabel(t('event.location'))" />
          <q-input v-model="createForm.note" outlined dense autogrow type="textarea" :label="t('event.noteOptional')" />
          <q-input v-model="createForm.maxPlayers" outlined dense type="number" min="0" :label="t('event.maxPlayers')" />
          <q-input v-model="createForm.maxGoalies" outlined dense type="number" min="0" :label="t('event.maxGoalies')" />
          <q-toggle v-model="createForm.inviteAllMembers" :label="t('event.inviteAll')" />
          <q-select
            v-if="!createForm.inviteAllMembers"
            v-model="createForm.invitedMembershipIds"
            :options="createMemberOptions"
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from 'src/stores/useAuth'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type ParticipantStatus = 'INVITED' | 'GOING' | 'MAYBE' | 'DECLINED'
type EventType = 'TRAINING' | 'MATCH' | 'OTHER'
type TeamOption = { id: string; name: string; viewerCanManage: boolean; isAdmin: boolean }
type TeamMembershipOption = { membershipId: string; label: string }

type EventParticipant = {
  id: string
  status: ParticipantStatus
  membership?: {
    user: {
      email: string
    }
  } | null
}

type EventItem = {
  id: string
  title: string
  eventType: string
  startTime: string
  endTime?: string | null
  location: string
  team: { id: string; name: string }
  participants: EventParticipant[]
  myStatus: ParticipantStatus | null
}

const auth = useAuth()
const $q = useQuasar()
const { t } = useI18n()
const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const events = ref<EventItem[]>([])
const createDialog = ref(false)
const createLoading = ref(false)
const eventTypes: EventType[] = ['TRAINING', 'MATCH', 'OTHER']
const createMemberOptions = ref<TeamMembershipOption[]>([])

const createForm = ref({
  teamId: '',
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

const manageableTeams = computed<TeamOption[]>(() =>
  (auth.user?.teams ?? []).filter(t => t.viewerCanManage || t.isAdmin)
)

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

function statusColor(status: ParticipantStatus | null): string {
  if (status === 'GOING') return 'positive'
  if (status === 'MAYBE') return 'warning'
  if (status === 'DECLINED') return 'negative'
  return 'grey-7'
}

function statusLabel(status: ParticipantStatus | null): string {
  if (!status) return t('event.noStatus')
  return t(`event.statusLabel.${status}`)
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

function requiredLabel(label: string): string {
  return `${label} *`
}

function toIsoOrNull(localValue: string): string | null {
  if (!localValue) return null
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
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

function parseCapacity(rawValue: string): ParsedCapacity {
  const value = rawValue.trim()
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return INVALID_CAPACITY
  return parsed
}

function computeMyStatus(event: Omit<EventItem, 'myStatus'>): ParticipantStatus | null {
  const email = auth.user?.email
  if (!email) return null
  const mine = event.participants.find(p => p.membership?.user.email === email)
  return mine?.status ?? null
}

function goToEventDetail(eventId: string) {
  void router.push({ name: 'eventDetail', params: { id: eventId } })
}

function openCreateDialog() {
  createForm.value = {
    teamId: manageableTeams.value[0]?.id || '',
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
  createMemberOptions.value = []
  createDialog.value = true
  const firstTeamId = createForm.value.teamId
  if (firstTeamId) {
    void loadTeamMemberOptions(firstTeamId)
  }
}

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
  createMemberOptions.value = data.teamMembers.map(m => ({
    membershipId: m.id,
    label: `${m.user.displayName} (${m.user.email})`,
  }))
}

async function createEvent() {
  if (!createForm.value.teamId) {
    $q.notify({ type: 'warning', message: t('event.createNeedTeam') })
    return
  }
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
      if (!createForm.value.repeatUntil) {
        throw new Error(t('event.createNeedRepeatUntil'))
      }
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
            teamId: createForm.value.teamId,
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
            teamId: createForm.value.teamId,
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

async function loadEvents() {
  loading.value = true
  loadError.value = ''
  try {
    if (!auth.meLoaded) await auth.fetchMe()
    const teamIds = (auth.user?.teams ?? []).map(t => t.id)
    if (!teamIds.length) {
      events.value = []
      return
    }

    const responses = await Promise.all(
      teamIds.map(teamId =>
        gqlRequest<{ teamEvents: Omit<EventItem, 'myStatus'>[] }>(
          `
          query($teamId: ID!) {
            teamEvents(teamId: $teamId) {
              id
              title
              eventType
              startTime
              endTime
              location
              team { id name }
              participants {
                id
                status
                membership {
                  user { email }
                }
              }
            }
          }
          `,
          { teamId }
        )
      )
    )

    const flattened = responses.flatMap(r => r.teamEvents)
    const dedup = new Map<string, EventItem>()
    for (const ev of flattened) {
      dedup.set(ev.id, { ...ev, myStatus: computeMyStatus(ev) })
    }
    events.value = Array.from(dedup.values()).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : t('event.loadFailed')
  } finally {
    loading.value = false
  }
}

watch(
  () => createForm.value.teamId,
  (teamId) => {
    createForm.value.invitedMembershipIds = []
    createMemberOptions.value = []
    if (teamId) {
      void loadTeamMemberOptions(teamId)
    }
  }
)

onMounted(async () => {
  await loadEvents()
})
</script>
