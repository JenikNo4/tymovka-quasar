<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">{{ t('adminHome.title') }}</div>
      <q-btn
        v-if="auth.isAdmin"
        flat
        icon="refresh"
        :label="t('adminHome.refresh')"
        :loading="loading"
        @click="loadAll"
      />
    </div>

    <q-banner v-if="!auth.isAdmin" class="bg-orange-1 text-orange-9 q-mb-md">
      {{ t('adminHome.noAccess') }}
    </q-banner>

    <q-banner v-if="errorMessage" class="bg-red-1 text-red-9 q-mb-md">
      {{ errorMessage }}
    </q-banner>

    <q-card v-if="auth.isAdmin" bordered flat>
      <q-tabs v-model="activeTab" dense align="left" active-color="primary" indicator-color="primary">
        <q-tab name="teams" :label="t('adminHome.tabTeams')" />
        <q-tab name="players" :label="t('adminHome.tabPlayers')" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="teams">
          <q-card bordered flat class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">{{ t('adminHome.myAdminTeamsTitle') }}</div>
              <div class="text-caption text-grey-7">{{ t('adminHome.myAdminTeamsHint') }}</div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item v-for="team in manageableTeams" :key="team.id">
                <q-item-section>
                  <q-item-label>{{ team.name }}</q-item-label>
                  <q-item-label caption>{{ team.description || t('common.noDescription') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn flat color="primary" :label="t('adminHome.manageTeam')" @click="goTeamDetail(team.id)" />
                    <q-btn flat color="primary" :label="t('adminHome.manageEvents')" @click="goTeamEvents(team.id)" />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="!manageableTeams.length">
                <q-item-section>
                  <q-item-label caption>{{ t('adminHome.noAdminTeams') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>

          <q-card v-if="auth.isSuperAdmin" bordered flat>
            <q-card-section>
              <div class="row items-center q-col-gutter-sm">
                <div class="col">
                  <div class="text-subtitle1">{{ t('adminHome.superAdminTeamsTitle') }}</div>
                  <div class="text-caption text-grey-7">{{ t('adminHome.superAdminTeamsHint') }}</div>
                </div>
                <div class="col-12 col-md-5">
                  <q-input
                    v-model="nameFilter"
                    dense
                    outlined
                    clearable
                    :label="t('adminHome.searchByName')"
                    @keyup.enter="applyTeamsSearch"
                  >
                    <template #append>
                      <q-btn dense flat icon="search" @click="applyTeamsSearch" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item v-for="team in allTeams" :key="team.id">
                <q-item-section>
                  <q-item-label>{{ team.name }}</q-item-label>
                  <q-item-label caption>{{ team.description || t('common.noDescription') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn flat color="primary" :label="t('adminHome.openDetail')" @click="goTeamDetail(team.id)" />
                    <q-btn
                      flat
                      color="negative"
                      :label="t('adminHome.archiveTeam')"
                      :loading="teamActionLoading[team.id] === 'delete'"
                      @click="archiveTeam(team.id, team.name)"
                    />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="!allTeams.length">
                <q-item-section>
                  <q-item-label caption>{{ t('adminHome.noTeamsFound') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator />
            <q-card-actions align="between">
              <div class="text-caption text-grey-7">
                {{ t('adminHome.teamsPageInfo', { page: teamsPage + 1, totalPages: teamsTotalPages || 1, total: teamsTotalElements }) }}
              </div>
              <div class="row q-gutter-sm">
                <q-btn
                  flat
                  color="primary"
                  :label="t('adminHome.prevPage')"
                  :disable="teamsPage <= 0 || loading"
                  @click="prevTeamsPage"
                />
                <q-btn
                  flat
                  color="primary"
                  :label="t('adminHome.nextPage')"
                  :disable="(teamsPage + 1) >= teamsTotalPages || loading"
                  @click="nextTeamsPage"
                />
              </div>
            </q-card-actions>
          </q-card>
        </q-tab-panel>

        <q-tab-panel name="players">
          <q-card bordered flat v-if="auth.isSuperAdmin">
            <q-card-section>
              <div class="row items-center q-col-gutter-sm">
                <div class="col">
                  <div class="text-subtitle1">{{ t('adminHome.superAdminPlayersTitle') }}</div>
                  <div class="text-caption text-grey-7">{{ t('adminHome.superAdminPlayersHint') }}</div>
                </div>
                <div class="col-12 col-md-5">
                  <q-input
                    v-model="usersFilter"
                    dense
                    outlined
                    clearable
                    :label="t('adminHome.searchUsers')"
                    @keyup.enter="applyUsersSearch"
                  >
                    <template #append>
                      <q-btn dense flat icon="search" @click="applyUsersSearch" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item v-for="u in allUsers" :key="u.id">
                <q-item-section>
                  <q-item-label>{{ userDisplayName(u) }}</q-item-label>
                  <q-item-label caption>{{ u.email }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge color="primary">{{ u.role }}</q-badge>
                </q-item-section>
              </q-item>
              <q-item v-if="!allUsers.length">
                <q-item-section>
                  <q-item-label caption>{{ t('adminHome.noUsersFound') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator />
            <q-card-actions align="between">
              <div class="text-caption text-grey-7">
                {{ t('adminHome.usersPageInfo', { page: usersPage + 1, totalPages: usersTotalPages || 1, total: usersTotalElements }) }}
              </div>
              <div class="row q-gutter-sm">
                <q-btn
                  flat
                  color="primary"
                  :label="t('adminHome.prevPage')"
                  :disable="usersPage <= 0 || loading"
                  @click="prevUsersPage"
                />
                <q-btn
                  flat
                  color="primary"
                  :label="t('adminHome.nextPage')"
                  :disable="(usersPage + 1) >= usersTotalPages || loading"
                  @click="nextUsersPage"
                />
              </div>
            </q-card-actions>
          </q-card>
          <q-banner v-else class="bg-grey-2">
            {{ t('adminHome.playersSuperAdminOnly') }}
          </q-banner>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuth } from 'src/stores/useAuth'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type TeamAdminCard = { id: string; name: string; description?: string | null }
type AdminUserCard = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  nickname?: string | null
  role: string
}

const auth = useAuth()
const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

const loading = ref(false)
const errorMessage = ref('')
const activeTab = ref<'teams' | 'players'>('teams')
const nameFilter = ref('')
const usersFilter = ref('')
const allTeams = ref<TeamAdminCard[]>([])
const allUsers = ref<AdminUserCard[]>([])
const teamsPage = ref(0)
const teamsPageSize = ref(25)
const teamsTotalElements = ref(0)
const teamsTotalPages = ref(0)
const usersPage = ref(0)
const usersPageSize = ref(25)
const usersTotalElements = ref(0)
const usersTotalPages = ref(0)
const teamActionLoading = reactive<Record<string, 'delete' | undefined>>({})

const manageableTeams = computed(() =>
  (auth.user?.teams ?? [])
    .filter((t) => t.isAdmin || t.viewerCanManage)
    .map((t) => ({ id: t.id, name: t.name, description: t.description ?? null }))
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

async function loadAllTeams() {
  if (!auth.isSuperAdmin) return
  const data = await gqlRequest<{
    allTeams: {
      items: TeamAdminCard[]
      totalElements: number
      totalPages: number
      page: number
      size: number
    }
  }>(
    `
    query($name: String, $page: Int, $size: Int) {
      allTeams(name: $name, page: $page, size: $size) {
        items {
          id
          name
          description
        }
        totalElements
        totalPages
        page
        size
      }
    }
    `,
    { name: nameFilter.value?.trim() || null, page: teamsPage.value, size: teamsPageSize.value }
  )
  allTeams.value = data.allTeams.items
  teamsTotalElements.value = data.allTeams.totalElements
  teamsTotalPages.value = data.allTeams.totalPages
  teamsPage.value = data.allTeams.page
  teamsPageSize.value = data.allTeams.size
}

async function loadAllUsers() {
  if (!auth.isSuperAdmin) return
  const data = await gqlRequest<{
    adminUsers: {
      items: AdminUserCard[]
      totalElements: number
      totalPages: number
      page: number
      size: number
    }
  }>(
    `
    query($q: String, $page: Int, $size: Int) {
      adminUsers(q: $q, page: $page, size: $size) {
        items {
          id
          email
          firstName
          lastName
          nickname
          role
        }
        totalElements
        totalPages
        page
        size
      }
    }
    `,
    { q: usersFilter.value?.trim() || null, page: usersPage.value, size: usersPageSize.value }
  )
  allUsers.value = data.adminUsers.items
  usersTotalElements.value = data.adminUsers.totalElements
  usersTotalPages.value = data.adminUsers.totalPages
  usersPage.value = data.adminUsers.page
  usersPageSize.value = data.adminUsers.size
}

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    await auth.refreshMe()
    await loadAllTeams()
    await loadAllUsers()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : t('common.operationFailed')
  } finally {
    loading.value = false
  }
}

function userDisplayName(user: AdminUserCard): string {
  if (user.nickname && user.nickname.trim()) return user.nickname.trim()
  const joined = [user.firstName, user.lastName].filter((v) => (v ?? '').trim().length > 0).join(' ').trim()
  return joined || user.email
}

function applyTeamsSearch() {
  teamsPage.value = 0
  void loadAllTeams()
}

function nextTeamsPage() {
  if ((teamsPage.value + 1) >= teamsTotalPages.value) return
  teamsPage.value += 1
  void loadAllTeams()
}

function prevTeamsPage() {
  if (teamsPage.value <= 0) return
  teamsPage.value -= 1
  void loadAllTeams()
}

function applyUsersSearch() {
  usersPage.value = 0
  void loadAllUsers()
}

function nextUsersPage() {
  if ((usersPage.value + 1) >= usersTotalPages.value) return
  usersPage.value += 1
  void loadAllUsers()
}

function prevUsersPage() {
  if (usersPage.value <= 0) return
  usersPage.value -= 1
  void loadAllUsers()
}

function goTeamDetail(teamId: string) {
  void router.push({ name: 'teamDetail', params: { id: teamId } })
}

function goTeamEvents(teamId: string) {
  void router.push({ name: 'teamEvents', params: { id: teamId } })
}

function archiveTeam(teamId: string, teamName: string) {
  $q.dialog({
    title: t('adminHome.archiveConfirmTitle'),
    message: t('adminHome.archiveConfirmMessage', { name: teamName }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      teamActionLoading[teamId] = 'delete'
      try {
        const data = await gqlRequest<{ deleteTeam: boolean }>(
          `
          mutation($teamId: ID!) {
            deleteTeam(teamId: $teamId)
          }
          `,
          { teamId }
        )
        if (!data.deleteTeam) throw new Error(t('adminHome.archiveFailed'))
        $q.notify({ type: 'positive', message: t('adminHome.archiveSuccess', { name: teamName }) })
        await loadAllTeams()
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        teamActionLoading[teamId] = undefined
      }
    })()
  })
}

onMounted(async () => {
  await loadAll()
})
</script>
