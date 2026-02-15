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
      <q-item v-for="event in events" :key="event.id" clickable @click="openEventDetail(event.id)">
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
            :label="t('event.team')"
          />
          <q-input v-model="createForm.title" outlined dense :label="t('event.title')" />
          <q-select
            v-model="createForm.eventType"
            :options="eventTypes"
            outlined
            dense
            :label="t('event.type')"
            @update:model-value="applyCreateTypeDefaults"
          />
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

    <q-dialog v-model="detailDialog" maximized>
      <q-card>
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-h6">{{ selectedEvent?.title || 'Detail události' }}</div>
            <div v-if="selectedEvent" class="text-caption text-grey-7">
              {{ selectedEvent.team.name }} | {{ eventTypeLabel(selectedEvent.eventType) }} | {{ formatDateTime(selectedEvent.startTime) }}
            </div>
          </div>
          <div class="row items-center q-gutter-sm">
            <q-btn
              v-if="selectedEvent?.viewerCanEdit"
              flat
              color="primary"
              icon="edit"
              :label="t('event.editEvent')"
              @click="openEditDialog"
            />
            <q-btn
              v-if="selectedEvent?.viewerCanEdit"
              flat
              color="negative"
              icon="delete"
              :label="t('event.deleteEvent')"
              @click="openDeleteDialog"
            />
            <q-btn flat round icon="close" :aria-label="t('common.close')" v-close-popup />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section v-if="selectedEvent">
          <div class="q-mb-sm"><b>{{ t('event.placeLabel') }}:</b> {{ selectedEvent.location }}</div>
          <div class="q-mb-sm"><b>{{ t('event.noteLabel') }}:</b> {{ selectedEvent.note || '-' }}</div>
        </q-card-section>

        <q-card-section v-if="selectedEvent && myParticipant">
          <div class="text-subtitle1 q-mb-sm">{{ t('event.myAttendance') }}</div>
          <div class="row q-gutter-sm">
            <q-btn
              v-for="status in participantStatuses"
              :key="status"
              :label="statusLabel(status)"
              :color="myParticipant.status === status ? 'primary' : 'grey-7'"
              :outline="myParticipant.status !== status"
              :disable="isPastEvent(selectedEvent)"
              :loading="attendanceLoading === status"
              @click="setMyAttendance(status)"
            />
          </div>
        </q-card-section>

        <q-card-section v-if="selectedEvent?.viewerCanSetAttendanceForOthers">
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
                :disable="isPastEvent(selectedEvent)"
                :label="t('event.selectMembers')"
              />
            </div>
            <div class="col-12 col-md-auto">
              <q-btn color="primary" :label="t('event.add')" :disable="isPastEvent(selectedEvent)" :loading="addParticipantsLoading" @click="addParticipants" />
            </div>
          </div>

          <div class="text-subtitle1 q-mb-sm">{{ t('event.participantManagement') }}</div>
          <q-list bordered separator>
            <q-item v-for="p in selectedEvent.participants" :key="p.id">
              <q-item-section>
                <q-item-label>{{ p.membership?.user.displayName || t('common.unknownMember') }}</q-item-label>
                <q-item-label caption>
                  {{ p.membership?.user.email || '-' }} | {{ t('teamDetail.statusLabel') }}: {{ statusLabel(p.status) }}
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
                    :disable="isPastEvent(selectedEvent)"
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
                    :disable="isPastEvent(selectedEvent)"
                    :loading="attendanceLoading === `${p.membership?.id}:${status}`"
                    @click="setAttendanceForMember(p.membership?.id, status)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from 'src/stores/useAuth'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type ParticipantStatus = 'INVITED' | 'GOING' | 'MAYBE' | 'DECLINED'

type EventParticipant = {
  id: string
  status: ParticipantStatus
  substituteName?: string | null
  membership?: {
    id: string
    user: {
      id: string
      email: string
      displayName: string
    }
  } | null
}

type EventItem = {
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
  viewerCanSetAttendanceForOthers: boolean
  viewerCanEdit: boolean
  team: { id: string; name: string }
  participants: EventParticipant[]
  myStatus: ParticipantStatus | null
}
type EventType = 'TRAINING' | 'MATCH' | 'OTHER'
type EventChangeScope = 'SINGLE' | 'SERIES'
type TeamOption = { id: string; name: string; viewerCanManage: boolean; isAdmin: boolean }
type TeamMembershipOption = { membershipId: string; label: string }

const auth = useAuth()
const $q = useQuasar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const events = ref<EventItem[]>([])
const detailDialog = ref(false)
const selectedEvent = ref<EventItem | null>(null)
const attendanceLoading = ref('')
const createDialog = ref(false)
const createLoading = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)
const editLoading = ref(false)
const deleteLoading = ref(false)
const addParticipantsLoading = ref(false)
const eventTypes: EventType[] = ['TRAINING', 'MATCH', 'OTHER']
const scopeOptions = computed(() => [
  { label: t('event.applySingle'), value: 'SINGLE' as const },
  { label: t('event.applySeries'), value: 'SERIES' as const },
])
const editScope = ref<EventChangeScope>('SINGLE')
const deleteScope = ref<EventChangeScope>('SINGLE')
const createMemberOptions = ref<TeamMembershipOption[]>([])
const detailMemberOptions = ref<TeamMembershipOption[]>([])
const addMembershipIds = ref<string[]>([])
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

const participantStatuses: ParticipantStatus[] = ['INVITED', 'GOING', 'MAYBE', 'DECLINED']
const manageableTeams = computed<TeamOption[]>(() =>
  (auth.user?.teams ?? []).filter(t => t.viewerCanManage || t.isAdmin)
)
const addableMemberOptions = computed(() => {
  const selected = selectedEvent.value
  if (!selected) return []
  const existingMembershipIds = new Set(
    selected.participants.map(p => p.membership?.id).filter((v): v is string => Boolean(v))
  )
  return detailMemberOptions.value.filter(o => !existingMembershipIds.has(o.membershipId))
})

const myParticipant = computed(() => {
  const event = selectedEvent.value
  const email = auth.user?.email
  if (!event || !email) return null
  return event.participants.find(p => p.membership?.user.email === email) || null
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

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function isPastEvent(event: EventItem | null): boolean {
  if (!event) return false
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
    void loadTeamMemberOptions(firstTeamId, createMemberOptions)
  }
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

function computeMyStatus(event: Omit<EventItem, 'myStatus'>): ParticipantStatus | null {
  const email = auth.user?.email
  if (!email) return null
  const mine = event.participants.find(p => p.membership?.user.email === email)
  return mine?.status ?? null
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
              seriesId
              location
              note
              maxPlayers
              maxGoalies
              viewerCanEdit
              viewerCanSetAttendanceForOthers
              team { id name }
              participants {
                id
                status
                substituteName
                membership {
                  id
                  user { id email displayName }
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

async function openEventDetail(eventId: string): Promise<boolean> {
  try {
    const data = await gqlRequest<{ event: Omit<EventItem, 'myStatus'> | null }>(
      `
      query($eventId: ID!) {
        event(eventId: $eventId) {
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
          viewerCanSetAttendanceForOthers
          team { id name }
          participants {
            id
            status
            substituteName
            membership {
              id
              user { id email displayName }
            }
          }
        }
      }
      `,
      { eventId }
    )
    if (!data.event) throw new Error(t('event.eventNotFound'))
    selectedEvent.value = { ...data.event, myStatus: computeMyStatus(data.event) }
    await loadTeamMemberOptions(data.event.team.id, detailMemberOptions)
    addMembershipIds.value = []
    detailDialog.value = true
    return true
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.detailLoadFailed') })
    return false
  }
}

function openEditDialog() {
  const event = selectedEvent.value
  if (!event || !event.viewerCanEdit) return
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

function openDeleteDialog() {
  const event = selectedEvent.value
  if (!event || !event.viewerCanEdit) return
  deleteScope.value = 'SINGLE'
  deleteDialog.value = true
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
    await openEventDetail(event.id)
    $q.notify({ type: 'positive', message: t('event.editSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.editFailed') })
  } finally {
    editLoading.value = false
  }
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
    detailDialog.value = false
    selectedEvent.value = null
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.deleteSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.deleteFailed') })
  } finally {
    deleteLoading.value = false
  }
}

function readOpenEventIdFromQuery(): string | null {
  const raw = route.query.openEventId
  if (typeof raw === 'string' && raw.trim()) return raw
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) return raw[0]
  return null
}

async function openEventFromQueryIfPresent() {
  const openEventId = readOpenEventIdFromQuery()
  if (!openEventId) return
  const opened = await openEventDetail(openEventId)
  if (!opened) return
  const nextQuery = { ...route.query }
  delete nextQuery.openEventId
  await router.replace({ query: nextQuery })
}

async function loadTeamMemberOptions(teamId: string, target: { value: TeamMembershipOption[] }) {
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
  target.value = data.teamMembers.map(m => ({
    membershipId: m.id,
    label: `${m.user.displayName} (${m.user.email})`,
  }))
}

async function setMyAttendance(status: ParticipantStatus) {
  const event = selectedEvent.value
  if (!event) return
  attendanceLoading.value = status
  try {
    await gqlRequest<{ setMyAttendance: { id: string } }>(
      `
      mutation($eventId: ID!, $status: ParticipantStatus!, $substituteName: String) {
        setMyAttendance(eventId: $eventId, status: $status, substituteName: $substituteName) { id }
      }
      `,
      { eventId: event.id, status, substituteName: null }
    )
    await openEventDetail(event.id)
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.attendanceUpdated') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.attendanceUpdateFailed') })
  } finally {
    attendanceLoading.value = ''
  }
}

async function setAttendanceForMember(membershipId: string | undefined, status: ParticipantStatus) {
  const event = selectedEvent.value
  if (!event || !membershipId) return
  attendanceLoading.value = `${membershipId}:${status}`
  try {
    await gqlRequest<{ adminSetAttendance: { id: string } }>(
      `
      mutation($eventId: ID!, $membershipId: ID!, $status: ParticipantStatus!, $substituteName: String) {
        adminSetAttendance(
          eventId: $eventId,
          membershipId: $membershipId,
          status: $status,
          substituteName: $substituteName
        ) { id }
      }
      `,
      { eventId: event.id, membershipId, status, substituteName: null }
    )
    await openEventDetail(event.id)
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.memberAttendanceUpdated') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.attendanceUpdateFailed') })
  } finally {
    attendanceLoading.value = ''
  }
}

async function addParticipants() {
  const event = selectedEvent.value
  if (!event || !addMembershipIds.value.length) return
  addParticipantsLoading.value = true
  try {
    await gqlRequest<{ addParticipants: { id: string } }>(
      `
      mutation($eventId: ID!, $membershipIds: [ID!]!) {
        addParticipants(eventId: $eventId, membershipIds: $membershipIds) { id }
      }
      `,
      { eventId: event.id, membershipIds: addMembershipIds.value }
    )
    addMembershipIds.value = []
    await openEventDetail(event.id)
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.addParticipantsSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.addParticipantsFailed') })
  } finally {
    addParticipantsLoading.value = false
  }
}

async function removeParticipantFromEvent(membershipId: string | undefined) {
  const event = selectedEvent.value
  if (!event || !membershipId) return
  attendanceLoading.value = `remove:${membershipId}`
  try {
    await gqlRequest<{ removeParticipant: { id: string } }>(
      `
      mutation($eventId: ID!, $membershipId: ID!) {
        removeParticipant(eventId: $eventId, membershipId: $membershipId) { id }
      }
      `,
      { eventId: event.id, membershipId }
    )
    await openEventDetail(event.id)
    await loadEvents()
    $q.notify({ type: 'positive', message: t('event.removeParticipantSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.removeParticipantFailed') })
  } finally {
    attendanceLoading.value = ''
  }
}

watch(
  () => createForm.value.teamId,
  (teamId) => {
    createForm.value.invitedMembershipIds = []
    createMemberOptions.value = []
    if (teamId) {
      void loadTeamMemberOptions(teamId, createMemberOptions)
    }
  }
)

onMounted(async () => {
  await loadEvents()
  await openEventFromQueryIfPresent()
})

watch(
  () => route.query.openEventId,
  () => {
    if (route.name === 'myEvents') {
      void openEventFromQueryIfPresent()
    }
  }
)
</script>
