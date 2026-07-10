<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">{{ t('team.myTeamsTitle') }}</div>
      <q-btn color="primary" icon="add" :label="t('team.createTeam')" @click="openCreateDialog" />
    </div>

    <q-banner v-if="loadError" class="bg-red-1 text-red-9 q-mb-md">
      {{ loadError }}
    </q-banner>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>

    <!-- Týmy s PENDING členstvím — pozvánka jde přijmout/odmítnout přímo tady,
         nezávisle na notifikaci (ta může být smazaná) -->
    <div v-if="pendingInvites.length" class="q-mb-md">
      <div class="text-subtitle1 text-weight-medium q-mb-sm">{{ t('team.pendingInvitesTitle') }}</div>
      <div class="row q-col-gutter-md">
        <div v-for="invite in pendingInvites" :key="invite.teamId" class="col-12 col-md-6 col-lg-4">
          <q-card bordered flat class="bg-amber-1">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium">{{ invite.teamName }}</div>
              <div class="text-caption text-grey-8 q-mt-xs">{{ t('team.pendingInviteLabel') }}</div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn
                flat
                color="positive"
                :label="t('notifications.acceptInvite')"
                :loading="inviteLoading[invite.teamId] === 'accept'"
                :disable="!!inviteLoading[invite.teamId]"
                @click="acceptInvite(invite)"
              />
              <q-btn
                flat
                color="negative"
                :label="t('notifications.declineInvite')"
                :loading="inviteLoading[invite.teamId] === 'decline'"
                :disable="!!inviteLoading[invite.teamId]"
                @click="declineInvite(invite)"
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <div v-if="teams.length" class="row q-col-gutter-md">
      <div v-for="team in teams" :key="team.id" class="col-12 col-md-6 col-lg-4">
        <q-card bordered flat>
          <q-card-section>
            <div class="row items-start justify-between no-wrap">
              <div>
                <div class="text-subtitle1 text-weight-medium">{{ team.name }}</div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  {{ team.description || t('common.noDescription') }}
                </div>
              </div>
              <q-badge :color="team.isAdmin || team.viewerCanManage ? 'primary' : 'grey-7'">
                {{ team.isAdmin || team.viewerCanManage ? t('common.admin') : t('common.member') }}
              </q-badge>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
            <q-btn
              flat
              color="primary"
              :label="t('common.detail')"
              @click="goToDetail(team.id)"
            />
            <q-btn
              v-if="team.viewerCanLeave"
              flat
              color="negative"
              :label="t('team.leaveTeam')"
              :loading="actionLoading[team.id] === 'leave'"
              @click="leaveTeam(team)"
            />
            <q-btn
              v-if="team.viewerCanDelete"
              flat
              color="negative"
              :label="t('team.deleteTeam')"
              :loading="actionLoading[team.id] === 'delete'"
              @click="deleteTeam(team)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <q-banner v-else-if="!loading && !pendingInvites.length" class="bg-grey-2 q-pa-md">
      {{ t('team.notInAnyTeam') }}
    </q-banner>

    <q-dialog v-model="createDialog">
      <q-card style="min-width: 380px; max-width: 95vw;">
        <q-card-section>
          <div class="text-h6">{{ t('team.createTeamTitle') }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="createForm.name"
            :label="t('team.teamName')"
            outlined
            dense
            autofocus
            :disable="createLoading"
          />
          <q-input
            v-model="createForm.description"
            :label="t('team.description')"
            outlined
            dense
            type="textarea"
            autogrow
            :disable="createLoading"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup :disable="createLoading" />
          <q-btn
            color="primary"
            :label="t('team.createTeam')"
            :loading="createLoading"
            :disable="!createForm.name.trim()"
            @click="createTeam"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuth } from 'src/stores/useAuth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type TeamMini = NonNullable<ReturnType<typeof useAuth>['user']>['teams'][number]
type TeamOperation = 'leave' | 'delete'
type PendingInvite = { teamId: string; teamName: string }
type InviteOperation = 'accept' | 'decline'

const $q = useQuasar()
const auth = useAuth()
const router = useRouter()
const { t } = useI18n()

const loading = ref(false)
const loadError = ref('')
const createDialog = ref(false)
const createLoading = ref(false)
const actionLoading = reactive<Record<string, TeamOperation | undefined>>({})
const createForm = reactive({ name: '', description: '' })
const pendingInvites = ref<PendingInvite[]>([])
const inviteLoading = reactive<Record<string, InviteOperation | undefined>>({})

const teams = computed(() => auth.user?.teams ?? [])

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

async function loadTeams() {
  loading.value = true
  loadError.value = ''
  try {
    await auth.refreshMe()
    await loadPendingInvites()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : t('team.loadFailed')
  } finally {
    loading.value = false
  }
}

async function loadPendingInvites() {
  const data = await gqlRequest<{ myPendingMemberships: Array<{ team: { id: string; name: string } }> }>(
    `
    query {
      myPendingMemberships {
        team { id name }
      }
    }
    `
  )
  pendingInvites.value = data.myPendingMemberships.map((m) => ({
    teamId: m.team.id,
    teamName: m.team.name,
  }))
}

function acceptInvite(invite: PendingInvite) {
  void runInviteAction(invite, 'accept', async () => {
    const data = await gqlRequest<{ acceptTeamInvite: boolean }>(
      `
      mutation($teamId: ID!) {
        acceptTeamInvite(teamId: $teamId)
      }
      `,
      { teamId: invite.teamId }
    )
    if (!data.acceptTeamInvite) throw new Error(t('notifications.actionFailed'))
    $q.notify({ type: 'positive', message: t('notifications.acceptSuccess') })
  })
}

function declineInvite(invite: PendingInvite) {
  void runInviteAction(invite, 'decline', async () => {
    const data = await gqlRequest<{ declineTeamInvite: boolean }>(
      `
      mutation($teamId: ID!) {
        declineTeamInvite(teamId: $teamId)
      }
      `,
      { teamId: invite.teamId }
    )
    if (!data.declineTeamInvite) throw new Error(t('notifications.actionFailed'))
    $q.notify({ type: 'positive', message: t('notifications.declineSuccess') })
  })
}

async function runInviteAction(invite: PendingInvite, op: InviteOperation, action: () => Promise<void>) {
  inviteLoading[invite.teamId] = op
  try {
    await action()
    await loadTeams()
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
  } finally {
    inviteLoading[invite.teamId] = undefined
  }
}

function openCreateDialog() {
  createForm.name = ''
  createForm.description = ''
  createDialog.value = true
}

function goToDetail(teamId: string) {
  void router.push({ name: 'teamDetail', params: { id: teamId } })
}

async function createTeam() {
  const name = createForm.name.trim()
  if (!name) return
  createLoading.value = true
  try {
    await gqlRequest<{ createTeam: { id: string } }>(
      `
      mutation($input: CreateTeamInput!) {
        createTeam(input: $input) { id }
      }
      `,
      {
        input: {
          name,
          description: createForm.description.trim() || null,
        },
      }
    )
    createDialog.value = false
    await loadTeams()
    $q.notify({ type: 'positive', message: t('team.createSuccess') })
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('team.createFailed') })
  } finally {
    createLoading.value = false
  }
}

function leaveTeam(team: TeamMini) {
  $q.dialog({
    title: t('team.leaveConfirmTitle'),
    message: t('team.leaveConfirmMessage', { name: team.name }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      actionLoading[team.id] = 'leave'
      try {
        const data = await gqlRequest<{ leaveTeam: boolean }>(
          `
          mutation($teamId: ID!) {
            leaveTeam(teamId: $teamId)
          }
          `,
          { teamId: team.id }
        )
        if (!data.leaveTeam) throw new Error(t('team.leaveFailed'))
        await loadTeams()
        $q.notify({ type: 'positive', message: t('team.leaveSuccess', { name: team.name }) })
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        actionLoading[team.id] = undefined
      }
    })()
  })
}

function deleteTeam(team: TeamMini) {
  $q.dialog({
    title: t('team.deleteConfirmTitle'),
    message: t('team.deleteConfirmMessage', { name: team.name }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      actionLoading[team.id] = 'delete'
      try {
        const data = await gqlRequest<{ deleteTeam: boolean }>(
          `
          mutation($teamId: ID!) {
            deleteTeam(teamId: $teamId)
          }
          `,
          { teamId: team.id }
        )
        if (!data.deleteTeam) throw new Error(t('team.deleteFailed'))
        await loadTeams()
        $q.notify({ type: 'positive', message: t('team.deleteSuccess', { name: team.name }) })
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        actionLoading[team.id] = undefined
      }
    })()
  })
}

onMounted(async () => {
  await loadTeams()
})
</script>
