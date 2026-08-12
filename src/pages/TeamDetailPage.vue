<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-sm">
        <q-btn flat icon="arrow_back" :label="t('teamDetail.back')" @click="goBack" />
        <div class="text-h5">{{ team?.name ?? t('teamDetail.title') }}</div>
      </div>
      <div class="row items-center q-gutter-sm">
        <q-btn
          v-if="team?.viewerCanManage"
          color="primary"
          icon="add"
          :label="t('event.addEvent')"
          @click="openCreateEventDialog"
        />
        <q-btn
          flat
          color="primary"
          icon="event"
          :label="t('teamDetail.eventsTitle')"
          @click="goToTeamEvents"
        />
      </div>
    </div>

    <q-banner v-if="errorMessage" class="bg-red-1 text-red-9 q-mb-md">
      {{ errorMessage }}
    </q-banner>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>

    <q-card v-if="team" bordered flat class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">{{ team.name }}</div>
        <div class="text-caption text-grey-7 q-mt-xs">{{ team.description || t('common.noDescription') }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="row q-col-gutter-sm">
        <div class="col-auto"><q-badge color="primary">{{ t('teamDetail.capabilityManage') }}: {{ team.viewerCanManage ? t('common.yes') : t('common.no') }}</q-badge></div>
        <div class="col-auto"><q-badge color="secondary">{{ t('teamDetail.capabilityInvite') }}: {{ team.viewerCanInvite ? t('common.yes') : t('common.no') }}</q-badge></div>
        <div class="col-auto"><q-badge color="deep-orange">{{ t('teamDetail.capabilityDelete') }}: {{ team.viewerCanDelete ? t('common.yes') : t('common.no') }}</q-badge></div>
        <div class="col-auto"><q-badge color="grey-8">{{ t('teamDetail.capabilityLeave') }}: {{ team.viewerCanLeave ? t('common.yes') : t('common.no') }}</q-badge></div>
      </q-card-section>
    </q-card>

    <q-card v-if="team && myMembership" bordered flat class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">{{ t('teamDetail.myRoleSectionTitle') }}</div>
      </q-card-section>
      <q-card-section class="q-gutter-md">
        <q-select
          v-model="myPlayerRoleDraft"
          :options="playerRoleOptions"
          emit-value
          map-options
          outlined
          dense
          :label="t('teamDetail.myPlayerRoleLabel')"
        />
        <q-input
          v-model="myProfileNumberDraft"
          outlined
          dense
          type="number"
          min="0"
          max="99"
          :label="t('teamDetail.myJerseyNumberLabel')"
          :hint="t('teamDetail.myJerseyNumberHint')"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          color="primary"
          :disable="isMyRoleSaveDisabled"
          :loading="saveRoleLoading"
          :label="t('teamDetail.saveMyRole')"
          @click="saveMyTeamRole"
        />
      </q-card-actions>
    </q-card>

    <q-card v-if="team?.viewerCanInvite" bordered flat class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">{{ t('teamDetail.inviteMembersTitle') }}</div>
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="inviteEmailsText"
          type="textarea"
          autogrow
          outlined
          :label="t('teamDetail.inviteMembersLabel')"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn color="primary" :label="t('teamDetail.inviteSend')" :loading="inviteLoading" @click="inviteMembers" />
      </q-card-actions>
      <q-separator v-if="inviteResult" />
      <q-card-section v-if="inviteResult">
        <div class="text-caption">{{ t('teamDetail.inviteSummaryCreated') }}: {{ inviteResult.invitedCount }}</div>
        <div class="text-caption">{{ t('teamDetail.inviteSummaryExisting') }}: {{ inviteResult.existingMembers.join(', ') || '-' }}</div>
        <div class="text-caption">{{ t('teamDetail.inviteSummaryResent') }}: {{ inviteResult.resent.join(', ') || '-' }}</div>
        <div class="text-caption">{{ t('teamDetail.inviteSummaryInvalid') }}: {{ inviteResult.invalidEmails.join(', ') || '-' }}</div>
        <div class="text-caption">{{ t('teamDetail.inviteSummaryDuplicates') }}: {{ inviteResult.duplicates.join(', ') || '-' }}</div>
      </q-card-section>
    </q-card>

    <q-card bordered flat class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">{{ t('teamDetail.membersTitle') }}</div>
      </q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="m in members" :key="m.id">
          <q-item-section>
            <q-item-label>{{ m.user.displayName }} ({{ m.user.email }})</q-item-label>
            <q-item-label caption>
              {{ t('teamDetail.roleLabel') }}: {{ m.role }} | {{ t('teamDetail.statusLabel') }}: {{ m.status }} | {{ t('teamDetail.playerRoleLabel') }}: {{ m.playerRole }} | {{ t('teamDetail.jerseyNumberLabel') }}: {{ m.jerseyNumber ?? '-' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side v-if="team?.viewerCanManage && m.status === 'APPROVED'">
            <div class="row items-center q-gutter-sm">
              <q-select
                v-model="memberTeamRoleDrafts[m.id]"
                dense
                outlined
                emit-value
                map-options
                :options="teamRoleOptions"
                :label="t('teamDetail.teamRoleLabel')"
                :disable="memberActionId === `role:${m.id}`"
                style="min-width: 150px"
              />
              <q-btn
                flat
                color="primary"
                :label="t('common.save')"
                :loading="memberActionId === `role:${m.id}`"
                :disable="!memberTeamRoleDrafts[m.id] || memberTeamRoleDrafts[m.id] === m.role"
                @click="updateMemberTeamRole(m)"
              />
              <q-btn flat color="negative" :label="t('teamDetail.remove')" :loading="memberActionId === `remove:${m.user.id}`" @click="removeMember(m.user.id)" />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!members.length">
          <q-item-section>
            <q-item-label caption>{{ t('teamDetail.noMembers') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card v-if="team?.viewerCanManage" bordered flat class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">{{ t('teamDetail.pendingTitle') }}</div>
      </q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="m in pendingMembers" :key="m.id">
          <q-item-section>
            <q-item-label>{{ m.user.displayName }} ({{ m.user.email }})</q-item-label>
            <q-item-label caption>
              {{ t('teamDetail.roleLabel') }}: {{ m.role }} | {{ t('teamDetail.statusLabel') }}: {{ m.status }} | {{ t('teamDetail.playerRoleLabel') }}: {{ m.playerRole }} | {{ t('teamDetail.jerseyNumberLabel') }}: {{ m.jerseyNumber ?? '-' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-sm">
              <q-btn flat color="positive" :label="t('teamDetail.approve')" :loading="memberActionId === `approve:${m.user.id}`" @click="approveMembership(m.user.id)" />
              <q-btn flat color="negative" :label="t('teamDetail.reject')" :loading="memberActionId === `reject:${m.user.id}`" @click="rejectMembership(m.user.id)" />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!pendingMembers.length">
          <q-item-section>
            <q-item-label caption>{{ t('teamDetail.noPending') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <NotificationDeliveryTable
      v-if="team?.viewerCanManage"
      :title="t('teamDetail.deliveryTitle')"
      :subtitle="t('teamDetail.deliverySubtitle')"
      :empty-text="t('teamDetail.noDeliveries')"
      :deliveries="notificationDeliveries"
      :loading="deliveryLoading"
      :retrying-delivery-id="retryingDeliveryId"
      @refresh="loadNotificationDeliveries"
      @retry="retryNotificationDelivery"
    />

    <q-dialog v-model="createDialog">
      <q-card style="min-width: 460px; max-width: 96vw;">
        <q-card-section>
          <div class="text-h6">{{ t('event.createTitle') }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
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
          <q-card flat bordered class="q-pa-sm">
            <div class="text-subtitle2 q-mb-xs">{{ t('event.remindersTitle') }}</div>
            <div class="text-caption text-grey-7 q-mb-sm">{{ t('event.remindersHint') }}</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-toggle v-model="createForm.reminderOneDayEnabled" :label="t('event.reminderOneDay')" />
              </div>
              <div class="col-12 col-sm-6">
                <q-toggle v-model="createForm.reminderThreeDaysEnabled" :label="t('event.reminderThreeDays')" />
              </div>
              <div class="col-12 col-sm-6">
                <q-toggle v-model="createForm.reminderEmailEnabled" :label="t('event.reminderEmail')" />
              </div>
              <div class="col-12 col-sm-6">
                <q-toggle v-model="createForm.reminderPushEnabled" disable :label="t('event.reminderPush')" />
              </div>
            </div>
          </q-card>
          <q-select
            v-model="createForm.attendanceMode"
            :options="attendanceModeOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            :label="t('event.attendanceMode')"
          />
          <q-toggle v-if="createForm.attendanceMode === 'INVITE_ONLY'" v-model="createForm.inviteAllMembers" :label="t('event.inviteAll')" />
          <q-select
            v-if="createForm.attendanceMode === 'INVITE_ONLY' && !createForm.inviteAllMembers"
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
          <q-btn color="primary" :label="t('common.save')" :loading="createLoading" @click="createEventForTeam" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import NotificationDeliveryTable from 'src/components/NotificationDeliveryTable.vue'
import type { NotificationDelivery } from 'src/types/notification-delivery'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type TeamDetail = {
  id: string
  name: string
  description?: string | null
  isAdmin: boolean
  viewerCanManage: boolean
  viewerCanInvite: boolean
  viewerCanDelete: boolean
  viewerCanLeave: boolean
}
type TeamMember = {
  id: string
  role: 'ADMIN' | 'MEMBER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  playerRole: 'PLAYER' | 'GOALKEEPER'
  jerseyNumber?: number | null
  user: {
    id: string
    email: string
    displayName: string
    nickname?: string | null
  }
}
type InviteResult = {
  invitedCount: number
  createdInvites: string[]
  existingMembers: string[]
  // Uz meli pending pozvanku -> backend ji poslal znovu (email + notifikace)
  resent: string[]
  invalidEmails: string[]
  duplicates: string[]
}
type EventType = 'TRAINING' | 'MATCH' | 'OTHER'
type AttendanceMode = 'INVITE_ONLY' | 'OPEN_TO_TEAM'
type TeamRole = 'ADMIN' | 'MEMBER'
type TeamMembershipOption = { membershipId: string; label: string }

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

const teamId = String(route.params.id ?? '')
const loading = ref(false)
const errorMessage = ref('')
const team = ref<TeamDetail | null>(null)
const members = ref<TeamMember[]>([])
const pendingMembers = ref<TeamMember[]>([])
const notificationDeliveries = ref<NotificationDelivery[]>([])
const deliveryLoading = ref(false)
const retryingDeliveryId = ref<string | null>(null)
const memberActionId = ref('')
const memberTeamRoleDrafts = reactive<Record<string, TeamRole>>({})
const myMembership = ref<TeamMember | null>(null)
const myPlayerRoleDraft = ref<'PLAYER' | 'GOALKEEPER' | null>(null)
const myProfileNumberDraft = ref('')
const saveRoleLoading = ref(false)
const inviteLoading = ref(false)
const inviteEmailsText = ref('')
const inviteResult = ref<InviteResult | null>(null)
const createDialog = ref(false)
const createLoading = ref(false)
const eventTypes: EventType[] = ['TRAINING', 'MATCH', 'OTHER']
const attendanceModeOptions = computed(() => [
  { label: t('event.attendanceModeLabel.OPEN_TO_TEAM'), value: 'OPEN_TO_TEAM' as AttendanceMode },
  { label: t('event.attendanceModeLabel.INVITE_ONLY'), value: 'INVITE_ONLY' as AttendanceMode },
])
const teamRoleOptions = [
  { label: 'MEMBER', value: 'MEMBER' as TeamRole },
  { label: 'ADMIN', value: 'ADMIN' as TeamRole },
] as const
const createForm = ref({
  title: '',
  eventType: 'TRAINING' as EventType,
  startLocal: '',
  endLocal: '',
  location: '',
  note: '',
  maxPlayers: '20',
  maxGoalies: '2',
  reminderOneDayEnabled: true,
  reminderThreeDaysEnabled: false,
  reminderEmailEnabled: true,
  reminderPushEnabled: false,
  attendanceMode: 'OPEN_TO_TEAM' as AttendanceMode,
  inviteAllMembers: true,
  invitedMembershipIds: [] as string[],
  repeatWeekly: false,
  repeatUntil: '',
})
const createMemberOptions = computed<TeamMembershipOption[]>(() =>
  members.value
    .filter(m => m.status === 'APPROVED')
    .map(m => ({
      membershipId: m.id,
      label: `${m.user.displayName} (${m.user.email})`,
    }))
)
const playerRoleOptions = computed(() => [
  { label: t('teamDetail.playerRolePlayer'), value: 'PLAYER' as const },
  { label: t('teamDetail.playerRoleGoalkeeper'), value: 'GOALKEEPER' as const },
])
const isMyRoleSaveDisabled = computed(() => {
  if (!myMembership.value || !myPlayerRoleDraft.value) return true
  const currentJersey = myMembership.value.jerseyNumber != null ? String(myMembership.value.jerseyNumber) : ''
  const draftJersey = myProfileNumberDraft.value.trim()
  return myPlayerRoleDraft.value === myMembership.value.playerRole && currentJersey === draftJersey
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

function goBack() {
  void router.push({ name: 'myTeams' })
}

function goToTeamEvents() {
  void router.push({ name: 'teamEvents', params: { id: teamId } })
}

function openCreateEventDialog() {
  createForm.value = {
    title: '',
    eventType: 'TRAINING',
    startLocal: '',
    endLocal: '',
    location: '',
    note: '',
    maxPlayers: '20',
    maxGoalies: '2',
    reminderOneDayEnabled: true,
    reminderThreeDaysEnabled: false,
    reminderEmailEnabled: true,
    reminderPushEnabled: false,
    attendanceMode: 'OPEN_TO_TEAM',
    inviteAllMembers: true,
    invitedMembershipIds: [],
    repeatWeekly: false,
    repeatUntil: '',
  }
  createDialog.value = true
}

function toIsoOrNull(localValue: string): string | null {
  if (!localValue) return null
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function requiredLabel(label: string): string {
  return `${label} *`
}

const INVALID_CAPACITY = Symbol('INVALID_CAPACITY')
type ParsedCapacity = number | null | typeof INVALID_CAPACITY

function defaultCapacitiesForType(eventType: EventType): { maxPlayers: string; maxGoalies: string } {
  if (eventType === 'TRAINING') return { maxPlayers: '20', maxGoalies: '2' }
  if (eventType === 'MATCH') return { maxPlayers: '15', maxGoalies: '1' }
  return { maxPlayers: '', maxGoalies: '' }
}

function defaultAttendanceModeForType(eventType: EventType): AttendanceMode {
  return eventType === 'TRAINING' ? 'OPEN_TO_TEAM' : 'INVITE_ONLY'
}

function applyCreateTypeDefaults() {
  const defaults = defaultCapacitiesForType(createForm.value.eventType)
  createForm.value.maxPlayers = defaults.maxPlayers
  createForm.value.maxGoalies = defaults.maxGoalies
  createForm.value.attendanceMode = defaultAttendanceModeForType(createForm.value.eventType)
}

function parseCapacity(rawValue: string): ParsedCapacity {
  const value = rawValue.trim()
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return INVALID_CAPACITY
  return parsed
}

async function createEventForTeam() {
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
    let createdEventId: string | null = null
    if (createForm.value.repeatWeekly) {
      if (!createForm.value.repeatUntil) {
        throw new Error(t('event.createNeedRepeatUntil'))
      }
      const repeatUntil = new Date(`${createForm.value.repeatUntil}T23:59:59`)
      if (Number.isNaN(repeatUntil.getTime())) throw new Error(t('event.createInvalidRepeatUntil'))
      const weekDay = ((new Date(startIso).getDay() + 6) % 7) + 1

      const recurring = await gqlRequest<{ createRecurringEvents: Array<{ id: string }> }>(
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
            reminderOneDayEnabled: createForm.value.reminderOneDayEnabled,
            reminderThreeDaysEnabled: createForm.value.reminderThreeDaysEnabled,
            reminderEmailEnabled: createForm.value.reminderEmailEnabled,
            reminderPushEnabled: createForm.value.reminderPushEnabled,
            attendanceMode: createForm.value.attendanceMode,
            inviteAllMembers: createForm.value.attendanceMode === 'INVITE_ONLY' ? createForm.value.inviteAllMembers : true,
            invitedMembershipIds: createForm.value.attendanceMode === 'INVITE_ONLY' && !createForm.value.inviteAllMembers ? createForm.value.invitedMembershipIds : null,
            repeatUntil: repeatUntil.toISOString(),
            weekDay,
          },
        }
      )
      createdEventId = recurring.createRecurringEvents[0]?.id ?? null
    } else {
      const single = await gqlRequest<{ createEvent: { id: string } }>(
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
            reminderOneDayEnabled: createForm.value.reminderOneDayEnabled,
            reminderThreeDaysEnabled: createForm.value.reminderThreeDaysEnabled,
            reminderEmailEnabled: createForm.value.reminderEmailEnabled,
            reminderPushEnabled: createForm.value.reminderPushEnabled,
            attendanceMode: createForm.value.attendanceMode,
            inviteAllMembers: createForm.value.attendanceMode === 'INVITE_ONLY' ? createForm.value.inviteAllMembers : true,
            invitedMembershipIds: createForm.value.attendanceMode === 'INVITE_ONLY' && !createForm.value.inviteAllMembers ? createForm.value.invitedMembershipIds : null,
          },
        }
      )
      createdEventId = single.createEvent.id
    }

    createDialog.value = false
    $q.notify({ type: 'positive', message: t('event.createSuccess') })
    if (createdEventId) {
      await router.push({ name: 'eventDetail', params: { id: createdEventId } })
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('event.createFailed') })
  } finally {
    createLoading.value = false
  }
}

async function loadTeamDetail() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await gqlRequest<{ teamById: TeamDetail }>(
      `
      query($teamId: ID!) {
        teamById(teamId: $teamId) {
          id
          name
          description
          isAdmin
          viewerCanManage
          viewerCanInvite
          viewerCanDelete
          viewerCanLeave
        }
      }
      `,
      { teamId }
    )
    team.value = data.teamById

    const membersData = await gqlRequest<{ teamMembers: TeamMember[] }>(
      `
      query($teamId: ID!) {
        teamMembers(teamId: $teamId) {
          id
          role
          status
          playerRole
          jerseyNumber
          user { id email displayName nickname }
        }
      }
      `,
      { teamId }
    )
    members.value = membersData.teamMembers
    syncMemberTeamRoleDrafts(membersData.teamMembers)
    const myMembershipData = await gqlRequest<{ myTeamMembership: TeamMember | null }>(
      `
      query($teamId: ID!) {
        myTeamMembership(teamId: $teamId) {
          id
          role
          status
          playerRole
          jerseyNumber
          user { id email displayName nickname }
        }
      }
      `,
      { teamId }
    )
    myMembership.value = myMembershipData.myTeamMembership
    myPlayerRoleDraft.value = myMembership.value?.playerRole ?? null
    myProfileNumberDraft.value = myMembership.value?.jerseyNumber != null
      ? String(myMembership.value.jerseyNumber)
      : ''

    if (team.value.viewerCanManage) {
      const pendingData = await gqlRequest<{ pendingMembers: TeamMember[] }>(
        `
        query($teamId: ID!) {
          pendingMembers(teamId: $teamId) {
            id
            role
            status
            playerRole
            jerseyNumber
            user { id email displayName nickname }
          }
        }
        `,
        { teamId }
      )
      pendingMembers.value = pendingData.pendingMembers
      await loadNotificationDeliveries()
    } else {
      pendingMembers.value = []
      notificationDeliveries.value = []
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : t('teamDetail.loadFailed')
  } finally {
    loading.value = false
  }
}

function syncMemberTeamRoleDrafts(teamMembers: TeamMember[]) {
  Object.keys(memberTeamRoleDrafts).forEach((membershipId) => {
    delete memberTeamRoleDrafts[membershipId]
  })
  teamMembers.forEach((membership) => {
    memberTeamRoleDrafts[membership.id] = membership.role
  })
}

async function loadNotificationDeliveries() {
  if (!team.value?.viewerCanManage) return
  deliveryLoading.value = true
  try {
    const data = await gqlRequest<{ teamNotificationDeliveries: NotificationDelivery[] }>(
      `
      query($teamId: ID!, $limit: Int) {
        teamNotificationDeliveries(teamId: $teamId, limit: $limit) {
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
      }
      `,
      { teamId, limit: 50 }
    )
    notificationDeliveries.value = data.teamNotificationDeliveries
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('teamDetail.deliveryLoadFailed') })
  } finally {
    deliveryLoading.value = false
  }
}

async function retryNotificationDelivery(delivery: NotificationDelivery) {
  if (!(await confirmSentDeliveryResend(delivery))) return
  retryingDeliveryId.value = delivery.id
  try {
    await gqlRequest<{ retryNotificationDelivery: NotificationDelivery }>(
      `
      mutation($deliveryId: ID!) {
        retryNotificationDelivery(deliveryId: $deliveryId) {
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
      }
      `,
      { deliveryId: delivery.id }
    )
    await loadNotificationDeliveries()
    $q.notify({ type: 'positive', message: t('teamDetail.deliveryRetrySuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('teamDetail.deliveryRetryFailed') })
  } finally {
    retryingDeliveryId.value = null
  }
}

function confirmSentDeliveryResend(delivery: NotificationDelivery): Promise<boolean> {
  if (delivery.status !== 'SENT') return Promise.resolve(true)
  return new Promise((resolve) => {
    let settled = false
    $q.dialog({
      title: t('teamDetail.deliveryResendSentTitle'),
      message: t('teamDetail.deliveryResendSentMessage'),
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        settled = true
        resolve(true)
      })
      .onDismiss(() => {
        if (!settled) resolve(false)
      })
  })
}

async function saveMyTeamRole() {
  if (!myPlayerRoleDraft.value) return
  const rawNumber = myProfileNumberDraft.value.trim()
  const parsedNumber = rawNumber ? Number(rawNumber) : null
  if (
    parsedNumber != null &&
    (!Number.isInteger(parsedNumber) || parsedNumber < 0 || parsedNumber > 99)
  ) {
    $q.notify({ type: 'warning', message: t('teamDetail.invalidJerseyNumber') })
    return
  }
  saveRoleLoading.value = true
  try {
    const data = await gqlRequest<{ setMyTeamPlayerRole: boolean }>(
      `
      mutation($teamId: ID!, $playerRole: PlayerRole!, $jerseyNumber: Int) {
        setMyTeamPlayerRole(teamId: $teamId, playerRole: $playerRole, jerseyNumber: $jerseyNumber)
      }
      `,
      { teamId, playerRole: myPlayerRoleDraft.value, jerseyNumber: parsedNumber }
    )
    if (!data.setMyTeamPlayerRole) throw new Error(t('teamDetail.saveMyRoleFailed'))
    await loadTeamDetail()
    $q.notify({ type: 'positive', message: t('teamDetail.saveMyRoleSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('teamDetail.saveMyRoleFailed') })
  } finally {
    saveRoleLoading.value = false
  }
}

async function approveMembership(userId: string) {
  memberActionId.value = `approve:${userId}`
  try {
    const data = await gqlRequest<{ adminApproveMembership: boolean }>(
      `
      mutation($teamId: ID!, $userId: ID!) {
        adminApproveMembership(teamId: $teamId, userId: $userId)
      }
      `,
      { teamId, userId }
    )
    if (!data.adminApproveMembership) throw new Error(t('teamDetail.approveFailed'))
    await loadTeamDetail()
    $q.notify({ type: 'positive', message: t('teamDetail.approveSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
  } finally {
    memberActionId.value = ''
  }
}

async function rejectMembership(userId: string) {
  memberActionId.value = `reject:${userId}`
  try {
    const data = await gqlRequest<{ adminRejectMembership: boolean }>(
      `
      mutation($teamId: ID!, $userId: ID!) {
        adminRejectMembership(teamId: $teamId, userId: $userId)
      }
      `,
      { teamId, userId }
    )
    if (!data.adminRejectMembership) throw new Error(t('teamDetail.rejectFailed'))
    await loadTeamDetail()
    $q.notify({ type: 'positive', message: t('teamDetail.rejectSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
  } finally {
    memberActionId.value = ''
  }
}

async function updateMemberTeamRole(member: TeamMember) {
  const nextRole = memberTeamRoleDrafts[member.id]
  if (!nextRole || nextRole === member.role) return
  memberActionId.value = `role:${member.id}`
  try {
    const data = await gqlRequest<{ adminUpdateTeamMembershipRole: boolean }>(
      `
      mutation($teamId: ID!, $userId: ID!, $role: TeamRole!) {
        adminUpdateTeamMembershipRole(teamId: $teamId, userId: $userId, role: $role)
      }
      `,
      { teamId, userId: member.user.id, role: nextRole }
    )
    if (!data.adminUpdateTeamMembershipRole) throw new Error(t('teamDetail.teamRoleUpdateFailed'))
    await loadTeamDetail()
    $q.notify({ type: 'positive', message: t('teamDetail.teamRoleUpdateSuccess') })
  } catch (err) {
    memberTeamRoleDrafts[member.id] = member.role
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('teamDetail.teamRoleUpdateFailed') })
  } finally {
    memberActionId.value = ''
  }
}

async function removeMember(userId: string) {
  memberActionId.value = `remove:${userId}`
  try {
    const data = await gqlRequest<{ removeMember: boolean }>(
      `
      mutation($teamId: ID!, $userId: ID!) {
        removeMember(teamId: $teamId, userId: $userId)
      }
      `,
      { teamId, userId }
    )
    if (!data.removeMember) throw new Error(t('teamDetail.removeFailed'))
    await loadTeamDetail()
    $q.notify({ type: 'positive', message: t('teamDetail.removeSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
  } finally {
    memberActionId.value = ''
  }
}

async function inviteMembers() {
  const emails = inviteEmailsText.value
    .split(/[\s,;]+/)
    .map(e => e.trim())
    .filter(Boolean)

  if (!emails.length) {
    $q.notify({ type: 'warning', message: t('teamDetail.inviteNeedEmail') })
    return
  }

  inviteLoading.value = true
  try {
    const data = await gqlRequest<{ inviteMembers: InviteResult }>(
      `
      mutation($teamIdOrSlug: String!, $emails: [String!]!) {
        inviteMembers(teamIdOrSlug: $teamIdOrSlug, emails: $emails) {
          invitedCount
          createdInvites
          existingMembers
          resent
          invalidEmails
          duplicates
        }
      }
      `,
      { teamIdOrSlug: teamId, emails }
    )
    inviteResult.value = data.inviteMembers
    inviteEmailsText.value = ''
    await loadTeamDetail()
    $q.notify({ type: 'positive', message: t('teamDetail.inviteProcessed') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('teamDetail.inviteFailed') })
  } finally {
    inviteLoading.value = false
  }
}

onMounted(async () => {
  if (!teamId) {
    await router.replace({ name: 'myTeams' })
    return
  }
  await loadTeamDetail()
})
</script>
