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
        <q-tab v-if="auth.isSuperAdmin" name="deliveries" :label="t('adminHome.tabDeliveries')" />
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
                    <q-btn
                      v-if="team.viewerCanDelete"
                      flat
                      color="negative"
                      :label="t('team.deleteTeam')"
                      :loading="teamActionLoading[team.id] === 'delete'"
                      @click="deleteManagedTeam(team.id, team.name)"
                    />
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

          <q-card v-if="auth.isSuperAdmin" bordered flat class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1">{{ t('adminHome.archivedTeamsTitle') }}</div>
              <div class="text-caption text-grey-7">{{ t('adminHome.archivedTeamsHint') }}</div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item v-for="team in archivedTeams" :key="`archived-${team.id}`">
                <q-item-section>
                  <q-item-label>{{ team.name }}</q-item-label>
                  <q-item-label caption>{{ team.description || t('common.noDescription') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn
                      flat
                      color="primary"
                      :label="t('adminHome.restoreTeam')"
                      :loading="teamActionLoading[team.id] === 'restore'"
                      @click="restoreArchivedTeam(team.id, team.name)"
                    />
                    <q-btn
                      flat
                      color="negative"
                      :label="t('adminHome.hardDeleteTeam')"
                      :loading="teamActionLoading[team.id] === 'purge'"
                      @click="purgeArchivedTeam(team.id, team.name)"
                    />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="!archivedTeams.length">
                <q-item-section>
                  <q-item-label caption>{{ t('adminHome.noArchivedTeams') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator />
            <q-card-actions align="between">
              <div class="text-caption text-grey-7">
                {{ t('adminHome.archivedTeamsPageInfo', { page: archivedTeamsPage + 1, totalPages: archivedTeamsTotalPages || 1, total: archivedTeamsTotalElements }) }}
              </div>
              <div class="row q-gutter-sm">
                <q-btn
                  flat
                  color="primary"
                  :label="t('adminHome.prevPage')"
                  :disable="archivedTeamsPage <= 0 || loading"
                  @click="prevArchivedTeamsPage"
                />
                <q-btn
                  flat
                  color="primary"
                  :label="t('adminHome.nextPage')"
                  :disable="(archivedTeamsPage + 1) >= archivedTeamsTotalPages || loading"
                  @click="nextArchivedTeamsPage"
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
                  <div class="row items-center q-gutter-sm">
                    <q-badge color="primary">{{ u.role }}</q-badge>
                    <q-badge :color="u.accountStatus === 'ACTIVE' ? 'positive' : 'negative'">{{ u.accountStatus }}</q-badge>
                    <q-btn flat color="primary" :label="t('adminHome.openProfile')" @click="openUserDetail(u.id)" />
                  </div>
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

        <q-tab-panel v-if="auth.isSuperAdmin" name="deliveries">
          <q-card bordered flat class="q-mb-md">
            <q-card-section>
              <div class="row q-col-gutter-sm items-end">
                <div class="col-12 col-md-3">
                  <q-input
                    v-model="deliveryEmailFilter"
                    dense
                    outlined
                    clearable
                    :label="t('adminHome.deliveryRecipientFilter')"
                    @keyup.enter="applyDeliverySearch"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <q-select
                    v-model="deliveryStatusFilter"
                    dense
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="deliveryStatusOptions"
                    :label="t('teamDetail.deliveryStatus')"
                  />
                </div>
                <div class="col-12 col-md-2">
                  <q-select
                    v-model="deliveryChannelFilter"
                    dense
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="deliveryChannelOptions"
                    :label="t('teamDetail.deliveryChannel')"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <q-select
                    v-model="deliveryTypeFilter"
                    dense
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="deliveryTypeOptions"
                    :label="t('teamDetail.deliveryType')"
                  />
                </div>
                <div class="col-12 col-md-1">
                  <q-btn color="primary" icon="search" :loading="deliveryLoading" @click="applyDeliverySearch" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <NotificationDeliveryTable
            :title="t('adminHome.deliveryAuditTitle')"
            :subtitle="t('adminHome.deliveryAuditHint')"
            :empty-text="t('teamDetail.noDeliveries')"
            :deliveries="notificationDeliveries"
            :loading="deliveryLoading"
            :page="deliveryPage"
            :total-pages="deliveryTotalPages"
            :total-elements="deliveryTotalElements"
            @refresh="loadNotificationDeliveries"
            @prev="prevDeliveryPage"
            @next="nextDeliveryPage"
          />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-inner-loading :showing="loading">
      <q-spinner color="primary" size="40px" />
    </q-inner-loading>

    <q-dialog ref="userDetailDialogRef" v-model="userDetailDialog" @hide="resetUserDetailState">
      <q-card style="min-width: 480px; max-width: 95vw; width: 760px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">{{ t('adminHome.playerProfileTitle') }}</div>
          <q-btn flat round dense icon="close" @click="closeUserDetailDialog" />
        </q-card-section>
        <q-separator />

        <q-card-section v-if="userDetailLoading" class="row justify-center q-pa-lg">
          <q-spinner color="primary" size="36px" />
        </q-card-section>

        <q-card-section v-else-if="selectedUserDetail">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.nickname') }}</div>
              <div>{{ selectedUserDetail.nickname || t('common.no') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.email') }}</div>
              <div>{{ selectedUserDetail.email }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.firstName') }}</div>
              <div>{{ selectedUserDetail.firstName || t('common.no') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.lastName') }}</div>
              <div>{{ selectedUserDetail.lastName || t('common.no') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.dateOfBirth') }}</div>
              <div>{{ selectedUserDetail.dateOfBirth || t('common.no') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.role') }}</div>
              <div class="row items-center q-gutter-sm">
                <q-select
                  v-model="selectedUserRole"
                  dense
                  outlined
                  emit-value
                  map-options
                  :options="userRoleOptions"
                  :disable="userRoleSaving"
                  style="min-width: 180px"
                />
                <q-btn
                  color="primary"
                  :label="t('common.save')"
                  :loading="userRoleSaving"
                  :disable="!selectedUserRole || selectedUserRole === selectedUserDetail.role"
                  @click="updateSelectedUserRole"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('layout.language') }}</div>
              <div>{{ selectedUserDetail.preferredLanguage || t('common.no') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('adminHome.emailVerification') }}</div>
              <div>{{ selectedUserDetail.emailVerifiedAt || t('adminHome.emailNotVerified') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('profile.preferredPositions') }}</div>
              <div>{{ selectedUserDetail.preferredPositions.join(', ') || t('common.no') }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">{{ t('adminHome.accountStatus') }}</div>
              <div class="row items-center q-gutter-sm">
                <q-select
                  v-model="selectedUserAccountStatus"
                  dense
                  outlined
                  emit-value
                  map-options
                  :options="accountStatusOptions"
                  :disable="userStatusSaving"
                  style="min-width: 180px"
                />
                <q-btn
                  color="primary"
                  :label="t('common.save')"
                  :loading="userStatusSaving"
                  :disable="!selectedUserAccountStatus || selectedUserAccountStatus === selectedUserDetail.accountStatus"
                  @click="updateSelectedUserAccountStatus"
                />
              </div>
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="text-subtitle1 q-mb-sm">{{ t('adminHome.memberTeamsTitle') }}</div>
          <q-list bordered separator>
            <q-item v-for="membership in selectedUserDetail.teams" :key="`${selectedUserDetail.id}-${membership.teamId}`">
              <q-item-section>
                <q-item-label>
                  <q-btn
                    flat
                    no-caps
                    color="primary"
                    class="q-pa-none"
                    :label="membership.teamName"
                    @click="goToTeamFromUserDetail(membership.teamId)"
                  />
                </q-item-label>
                <q-item-label caption>
                  {{ t('adminHome.memberTeamsMeta', {
                    status: membership.membershipStatus,
                    teamRole: membership.teamRole,
                    playerRole: membership.playerRole,
                    jerseyNumber: membership.jerseyNumber ?? '-'
                  }) }}
                </q-item-label>
                <div
                  v-if="auth.isSuperAdmin && membership.membershipStatus === 'APPROVED'"
                  class="row items-center q-gutter-sm q-mt-sm"
                >
                  <q-select
                    v-model="selectedTeamRoles[membership.teamId]"
                    dense
                    outlined
                    emit-value
                    map-options
                    :options="teamRoleOptions"
                    :label="t('adminHome.teamRoleLabel')"
                    :disable="!!teamRoleSaving[membership.teamId]"
                    style="min-width: 160px"
                  />
                  <q-btn
                    color="primary"
                    :label="t('common.save')"
                    :loading="!!teamRoleSaving[membership.teamId]"
                    :disable="!selectedTeamRoles[membership.teamId] || selectedTeamRoles[membership.teamId] === membership.teamRole"
                    @click="updateSelectedUserTeamRole(membership)"
                  />
                </div>
              </q-item-section>
            </q-item>
            <q-item v-if="!selectedUserDetail.teams.length">
              <q-item-section>
                <q-item-label caption>{{ t('adminHome.noMemberships') }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-banner
            v-if="adminCapabilities.hardDeleteUsersEnabled && userHardDeleteConfirmVisible"
            class="bg-red-1 text-red-10 q-mt-md"
            rounded
          >
            <div class="text-subtitle2 q-mb-sm">{{ t('adminHome.hardDeleteUserConfirmTitle') }}</div>
            <div class="q-mb-sm">
              {{ t('adminHome.hardDeleteUserConfirmMessage', { email: selectedUserDetail.email }) }}
            </div>
            <div class="row items-center q-col-gutter-sm">
              <div class="col-12 col-md">
                <q-input
                  v-model="userHardDeleteConfirmEmail"
                  dense
                  outlined
                  color="negative"
                  :label="t('adminHome.hardDeleteUserConfirmLabel')"
                  :disable="userHardDeleteSaving"
                />
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  :label="t('common.cancel')"
                  :disable="userHardDeleteSaving"
                  @click="cancelHardDeleteSelectedUser"
                />
                <q-btn
                  color="negative"
                  :label="t('adminHome.hardDeleteUser')"
                  :loading="userHardDeleteSaving"
                  :disable="!canConfirmHardDeleteSelectedUser"
                  @click="confirmHardDeleteSelectedUser"
                />
              </div>
            </div>
          </q-banner>
        </q-card-section>

        <q-card-section v-else>
          <q-banner class="bg-red-1 text-red-9">
            {{ t('adminHome.userDetailLoadFailed') }}
          </q-banner>
        </q-card-section>

        <q-card-actions align="between">
          <q-btn
            v-if="auth.isSuperAdmin && selectedUserDetail && adminCapabilities.hardDeleteUsersEnabled"
            flat
            color="negative"
            :label="t('adminHome.hardDeleteUser')"
            :loading="userHardDeleteSaving"
            :disable="userHardDeleteConfirmVisible"
            @click="hardDeleteSelectedUser"
          />
          <q-btn flat :label="t('common.close')" @click="closeUserDetailDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuth } from 'src/stores/useAuth'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import NotificationDeliveryTable from 'src/components/NotificationDeliveryTable.vue'
import type { NotificationDelivery } from 'src/types/notification-delivery'

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type TeamAdminCard = { id: string; name: string; description?: string | null; viewerCanDelete?: boolean }
type AdminUserCard = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  nickname?: string | null
  emailVerifiedAt?: string | null
  accountStatus: 'ACTIVE' | 'BLOCKED'
  role: string
}
type AdminUserMembershipDetail = {
  teamId: string
  teamName: string
  membershipStatus: string
  teamRole: string
  playerRole: string
  jerseyNumber?: number | null
}
type AdminUserDetail = AdminUserCard & {
  dateOfBirth?: string | null
  preferredLanguage?: string | null
  preferredPositions: string[]
  teams: AdminUserMembershipDetail[]
}
type NotificationDeliveryStatus = NotificationDelivery['status']
type NotificationDeliveryChannel = NotificationDelivery['channel']
type NotificationDeliveryPage = {
  items: NotificationDelivery[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

const auth = useAuth()
const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

const loading = ref(false)
const errorMessage = ref('')
const activeTab = ref<'teams' | 'players' | 'deliveries'>('teams')
const nameFilter = ref('')
const usersFilter = ref('')
const allTeams = ref<TeamAdminCard[]>([])
const archivedTeams = ref<TeamAdminCard[]>([])
const allUsers = ref<AdminUserCard[]>([])
const adminCapabilities = reactive({
  hardDeleteUsersEnabled: false,
})
const teamsPage = ref(0)
const teamsPageSize = ref(25)
const teamsTotalElements = ref(0)
const teamsTotalPages = ref(0)
const archivedTeamsPage = ref(0)
const archivedTeamsPageSize = ref(25)
const archivedTeamsTotalElements = ref(0)
const archivedTeamsTotalPages = ref(0)
const usersPage = ref(0)
const usersPageSize = ref(25)
const usersTotalElements = ref(0)
const usersTotalPages = ref(0)
const notificationDeliveries = ref<NotificationDelivery[]>([])
const deliveryLoading = ref(false)
const deliveryPage = ref(0)
const deliveryPageSize = ref(25)
const deliveryTotalElements = ref(0)
const deliveryTotalPages = ref(0)
const deliveryEmailFilter = ref('')
const deliveryStatusFilter = ref<NotificationDeliveryStatus | null>('FAILED')
const deliveryChannelFilter = ref<NotificationDeliveryChannel | null>(null)
const deliveryTypeFilter = ref<string | null>(null)
const teamActionLoading = reactive<Record<string, 'delete' | 'restore' | 'purge' | undefined>>({})
const userDetailDialog = ref(false)
const userDetailDialogRef = ref<{ hide: () => void } | null>(null)
const userDetailLoading = ref(false)
const selectedUserDetail = ref<AdminUserDetail | null>(null)
const selectedUserRole = ref<string | null>(null)
const selectedUserAccountStatus = ref<'ACTIVE' | 'BLOCKED' | null>(null)
const userRoleSaving = ref(false)
const userStatusSaving = ref(false)
const teamRoleSaving = reactive<Record<string, boolean>>({})
const selectedTeamRoles = reactive<Record<string, string>>({})
const userHardDeleteSaving = ref(false)
const userHardDeleteConfirmVisible = ref(false)
const userHardDeleteConfirmEmail = ref('')
const userRoleOptions = [
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'SUPER_ADMIN', value: 'SUPER_ADMIN' },
] as const
const teamRoleOptions = [
  { label: 'MEMBER', value: 'MEMBER' },
  { label: 'ADMIN', value: 'ADMIN' },
] as const
const accountStatusOptions = [
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'BLOCKED', value: 'BLOCKED' },
] as const
const deliveryStatusOptions = ['FAILED', 'SENT', 'PENDING', 'SKIPPED_DUPLICATE', 'NOT_IMPLEMENTED'].map((value) => ({ label: value, value }))
const deliveryChannelOptions = ['EMAIL', 'PUSH'].map((value) => ({ label: value, value }))
const deliveryTypeOptions = [
  'TEAM_INVITE',
  'EVENT_INVITE',
  'EVENT_INVITE_MATCH',
  'EVENT_SERIES_INVITE_DIGEST',
  'EVENT_UPDATED',
  'EVENT_UPDATED_EARLIER',
  'EVENT_CANCELED',
  'EVENT_REMINDER',
].map((value) => ({ label: value, value }))

const manageableTeams = computed(() =>
  (auth.user?.teams ?? [])
    .filter((t) => t.isAdmin || t.viewerCanManage)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      viewerCanDelete: t.viewerCanDelete,
    }))
)

const canConfirmHardDeleteSelectedUser = computed(() => {
  const user = selectedUserDetail.value
  return !!user && userHardDeleteConfirmEmail.value.trim().toLowerCase() === user.email.toLowerCase()
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

async function loadArchivedTeams() {
  if (!auth.isSuperAdmin) return
  const data = await gqlRequest<{
    archivedTeams: {
      items: TeamAdminCard[]
      totalElements: number
      totalPages: number
      page: number
      size: number
    }
  }>(
    `
    query($name: String, $page: Int, $size: Int) {
      archivedTeams(name: $name, page: $page, size: $size) {
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
    { name: nameFilter.value?.trim() || null, page: archivedTeamsPage.value, size: archivedTeamsPageSize.value }
  )
  archivedTeams.value = data.archivedTeams.items
  archivedTeamsTotalElements.value = data.archivedTeams.totalElements
  archivedTeamsTotalPages.value = data.archivedTeams.totalPages
  archivedTeamsPage.value = data.archivedTeams.page
  archivedTeamsPageSize.value = data.archivedTeams.size
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
          emailVerifiedAt
          accountStatus
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

async function loadNotificationDeliveries() {
  if (!auth.isSuperAdmin) return
  deliveryLoading.value = true
  try {
    const filter: Record<string, unknown> = {}
    const email = deliveryEmailFilter.value.trim()
    if (email) filter.recipientEmail = email
    if (deliveryStatusFilter.value) filter.status = deliveryStatusFilter.value
    if (deliveryChannelFilter.value) filter.channel = deliveryChannelFilter.value
    if (deliveryTypeFilter.value) filter.type = deliveryTypeFilter.value

    const data = await gqlRequest<{ adminNotificationDeliveries: NotificationDeliveryPage }>(
      `
      query($filter: NotificationDeliveryFilterInput, $page: Int, $size: Int) {
        adminNotificationDeliveries(filter: $filter, page: $page, size: $size) {
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
      { filter, page: deliveryPage.value, size: deliveryPageSize.value }
    )
    notificationDeliveries.value = data.adminNotificationDeliveries.items
    deliveryTotalElements.value = data.adminNotificationDeliveries.totalElements
    deliveryTotalPages.value = data.adminNotificationDeliveries.totalPages
    deliveryPage.value = data.adminNotificationDeliveries.page
    deliveryPageSize.value = data.adminNotificationDeliveries.size
  } catch (err) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('adminHome.deliveryLoadFailed') })
  } finally {
    deliveryLoading.value = false
  }
}

async function loadAdminCapabilities() {
  if (!auth.isSuperAdmin) {
    adminCapabilities.hardDeleteUsersEnabled = false
    return
  }
  const data = await gqlRequest<{ adminCapabilities: { hardDeleteUsersEnabled: boolean } }>(
    `
    query {
      adminCapabilities {
        hardDeleteUsersEnabled
      }
    }
    `
  )
  adminCapabilities.hardDeleteUsersEnabled = data.adminCapabilities.hardDeleteUsersEnabled
}

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    await auth.refreshMe()
    await loadAdminCapabilities()
    await loadAllTeams()
    await loadArchivedTeams()
    await loadAllUsers()
    await loadNotificationDeliveries()
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

async function openUserDetail(userId: string) {
  resetUserDetailState()
  userDetailDialog.value = true
  userDetailLoading.value = true
  try {
    const data = await gqlRequest<{ adminUserDetail: AdminUserDetail }>(
      `
      query($userId: ID!) {
        adminUserDetail(userId: $userId) {
          id
          email
          firstName
          lastName
          nickname
          dateOfBirth
          preferredLanguage
          emailVerifiedAt
          accountStatus
          preferredPositions
          role
          teams {
            teamId
            teamName
            membershipStatus
            teamRole
            playerRole
            jerseyNumber
          }
        }
      }
      `,
      { userId }
    )
    selectedUserDetail.value = data.adminUserDetail
    selectedUserRole.value = data.adminUserDetail.role
    selectedUserAccountStatus.value = data.adminUserDetail.accountStatus
    syncSelectedTeamRoles(data.adminUserDetail)
    userHardDeleteConfirmVisible.value = false
    userHardDeleteConfirmEmail.value = ''
  } catch (err) {
    userDetailDialog.value = false
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : t('adminHome.userDetailLoadFailed'),
    })
  } finally {
    userDetailLoading.value = false
  }
}

function resetUserDetailState() {
  selectedUserDetail.value = null
  selectedUserRole.value = null
  selectedUserAccountStatus.value = null
  clearRecord(selectedTeamRoles)
  clearRecord(teamRoleSaving)
  userHardDeleteConfirmVisible.value = false
  userHardDeleteConfirmEmail.value = ''
  userDetailLoading.value = false
  userHardDeleteSaving.value = false
}

function clearRecord<T>(record: Record<string, T>) {
  Object.keys(record).forEach((key) => {
    delete record[key]
  })
}

function syncSelectedTeamRoles(userDetail: AdminUserDetail) {
  clearRecord(selectedTeamRoles)
  userDetail.teams.forEach((membership) => {
    selectedTeamRoles[membership.teamId] = membership.teamRole
  })
}

function closeUserDetailDialog() {
  if (userDetailDialogRef.value) {
    userDetailDialogRef.value.hide()
  } else {
    userDetailDialog.value = false
    resetUserDetailState()
  }
}

function goToTeamFromUserDetail(teamId: string) {
  closeUserDetailDialog()
  void router.push({ name: 'teamDetail', params: { id: teamId } })
}

async function updateSelectedUserRole() {
  if (!selectedUserDetail.value || !selectedUserRole.value || selectedUserRole.value === selectedUserDetail.value.role) return
  userRoleSaving.value = true
  try {
    const data = await gqlRequest<{ adminUpdateUserRole: AdminUserDetail }>(
      `
      mutation($userId: ID!, $role: UserRole!) {
        adminUpdateUserRole(userId: $userId, role: $role) {
          id
          email
          firstName
          lastName
          nickname
          dateOfBirth
          preferredLanguage
          emailVerifiedAt
          accountStatus
          preferredPositions
          role
          teams {
            teamId
            teamName
            membershipStatus
            teamRole
            playerRole
            jerseyNumber
          }
        }
      }
      `,
      { userId: selectedUserDetail.value.id, role: selectedUserRole.value }
    )
    selectedUserDetail.value = data.adminUpdateUserRole
    selectedUserRole.value = data.adminUpdateUserRole.role
    syncSelectedTeamRoles(data.adminUpdateUserRole)
    await auth.refreshMe()
    await loadAllUsers()
    $q.notify({ type: 'positive', message: t('adminHome.userRoleUpdateSuccess') })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : t('adminHome.userRoleUpdateFailed'),
    })
  } finally {
    userRoleSaving.value = false
  }
}

async function updateSelectedUserAccountStatus() {
  if (
    !selectedUserDetail.value ||
    !selectedUserAccountStatus.value ||
    selectedUserAccountStatus.value === selectedUserDetail.value.accountStatus
  ) return
  userStatusSaving.value = true
  try {
    const data = await gqlRequest<{ adminUpdateAccountStatus: AdminUserDetail }>(
      `
      mutation($userId: ID!, $status: AccountStatus!) {
        adminUpdateAccountStatus(userId: $userId, status: $status) {
          id
          email
          firstName
          lastName
          nickname
          dateOfBirth
          preferredLanguage
          emailVerifiedAt
          accountStatus
          preferredPositions
          role
          teams {
            teamId
            teamName
            membershipStatus
            teamRole
            playerRole
            jerseyNumber
          }
        }
      }
      `,
      { userId: selectedUserDetail.value.id, status: selectedUserAccountStatus.value }
    )
    selectedUserDetail.value = data.adminUpdateAccountStatus
    selectedUserAccountStatus.value = data.adminUpdateAccountStatus.accountStatus
    syncSelectedTeamRoles(data.adminUpdateAccountStatus)
    await auth.refreshMe()
    await loadAllUsers()
    $q.notify({ type: 'positive', message: t('adminHome.userStatusUpdateSuccess') })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : t('adminHome.userStatusUpdateFailed'),
    })
  } finally {
    userStatusSaving.value = false
  }
}

async function updateSelectedUserTeamRole(membership: AdminUserMembershipDetail) {
  const user = selectedUserDetail.value
  const nextRole = selectedTeamRoles[membership.teamId]
  if (!user || !nextRole || nextRole === membership.teamRole) return

  teamRoleSaving[membership.teamId] = true
  try {
    const data = await gqlRequest<{ adminUpdateTeamMembershipRole: boolean }>(
      `
      mutation($teamId: ID!, $userId: ID!, $role: TeamRole!) {
        adminUpdateTeamMembershipRole(teamId: $teamId, userId: $userId, role: $role)
      }
      `,
      { teamId: membership.teamId, userId: user.id, role: nextRole }
    )
    if (!data.adminUpdateTeamMembershipRole) throw new Error(t('adminHome.teamRoleUpdateFailed'))
    membership.teamRole = nextRole
    selectedTeamRoles[membership.teamId] = nextRole
    await auth.refreshMe()
    await loadAllUsers()
    $q.notify({ type: 'positive', message: t('adminHome.teamRoleUpdateSuccess') })
  } catch (err) {
    selectedTeamRoles[membership.teamId] = membership.teamRole
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : t('adminHome.teamRoleUpdateFailed'),
    })
  } finally {
    teamRoleSaving[membership.teamId] = false
  }
}

function hardDeleteSelectedUser() {
  if (!selectedUserDetail.value) return
  userHardDeleteConfirmEmail.value = ''
  userHardDeleteConfirmVisible.value = true
}

function cancelHardDeleteSelectedUser() {
  userHardDeleteConfirmVisible.value = false
  userHardDeleteConfirmEmail.value = ''
}

async function confirmHardDeleteSelectedUser() {
  const user = selectedUserDetail.value
  if (!user || !canConfirmHardDeleteSelectedUser.value) return

  userHardDeleteSaving.value = true
  try {
    const data = await gqlRequest<{ adminHardDeleteUser: boolean }>(
      `
      mutation($userId: ID!, $confirmEmail: String!) {
        adminHardDeleteUser(userId: $userId, confirmEmail: $confirmEmail)
      }
      `,
      { userId: user.id, confirmEmail: userHardDeleteConfirmEmail.value.trim() }
    )
    if (!data.adminHardDeleteUser) throw new Error(t('adminHome.hardDeleteUserFailed'))
    $q.notify({ type: 'positive', message: t('adminHome.hardDeleteUserSuccess', { email: user.email }) })
    allUsers.value = allUsers.value.filter((u) => u.id !== user.id)
    usersTotalElements.value = Math.max(0, usersTotalElements.value - 1)
    redirectAfterHardDeletedUser()
  } catch (err) {
    await loadAllUsers()
    if (!allUsers.value.some((u) => u.id === user.id)) {
      redirectAfterHardDeletedUser()
      return
    }
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : t('adminHome.hardDeleteUserFailed'),
    })
  } finally {
    if (userDetailDialog.value) userHardDeleteSaving.value = false
  }
}

function redirectAfterHardDeletedUser() {
  sessionStorage.setItem('tymovka.admin.activeTab', 'players')
  window.location.assign(`${window.location.origin}${window.location.pathname}#/admin?refresh=${Date.now()}`)
}

function applyTeamsSearch() {
  teamsPage.value = 0
  archivedTeamsPage.value = 0
  void loadAllTeams()
  void loadArchivedTeams()
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

function nextArchivedTeamsPage() {
  if ((archivedTeamsPage.value + 1) >= archivedTeamsTotalPages.value) return
  archivedTeamsPage.value += 1
  void loadArchivedTeams()
}

function prevArchivedTeamsPage() {
  if (archivedTeamsPage.value <= 0) return
  archivedTeamsPage.value -= 1
  void loadArchivedTeams()
}

function applyUsersSearch() {
  usersPage.value = 0
  void loadAllUsers()
}

function applyDeliverySearch() {
  deliveryPage.value = 0
  void loadNotificationDeliveries()
}

function nextDeliveryPage() {
  if ((deliveryPage.value + 1) >= deliveryTotalPages.value) return
  deliveryPage.value += 1
  void loadNotificationDeliveries()
}

function prevDeliveryPage() {
  if (deliveryPage.value <= 0) return
  deliveryPage.value -= 1
  void loadNotificationDeliveries()
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
        await loadArchivedTeams()
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        teamActionLoading[teamId] = undefined
      }
    })()
  })
}

function restoreArchivedTeam(teamId: string, teamName: string) {
  $q.dialog({
    title: t('adminHome.restoreConfirmTitle'),
    message: t('adminHome.restoreConfirmMessage', { name: teamName }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      teamActionLoading[teamId] = 'restore'
      try {
        const data = await gqlRequest<{ restoreTeam: boolean }>(
          `
          mutation($teamId: ID!) {
            restoreTeam(teamId: $teamId)
          }
          `,
          { teamId }
        )
        if (!data.restoreTeam) throw new Error(t('adminHome.restoreFailed'))
        $q.notify({ type: 'positive', message: t('adminHome.restoreSuccess', { name: teamName }) })
        await loadAllTeams()
        await loadArchivedTeams()
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        teamActionLoading[teamId] = undefined
      }
    })()
  })
}

function purgeArchivedTeam(teamId: string, teamName: string) {
  $q.dialog({
    title: t('adminHome.hardDeleteConfirmTitle'),
    message: t('adminHome.hardDeleteConfirmMessage', { name: teamName }),
    cancel: true,
    persistent: true,
    ok: { label: t('adminHome.hardDeleteTeam'), color: 'negative' },
  }).onOk(() => {
    void (async () => {
      teamActionLoading[teamId] = 'purge'
      try {
        const data = await gqlRequest<{ purgeTeam: boolean }>(
          `
          mutation($teamId: ID!) {
            purgeTeam(teamId: $teamId)
          }
          `,
          { teamId }
        )
        if (!data.purgeTeam) throw new Error(t('adminHome.hardDeleteFailed'))
        $q.notify({ type: 'positive', message: t('adminHome.hardDeleteSuccess', { name: teamName }) })
        await loadArchivedTeams()
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        teamActionLoading[teamId] = undefined
      }
    })()
  })
}

function deleteManagedTeam(teamId: string, teamName: string) {
  $q.dialog({
    title: t('team.deleteConfirmTitle'),
    message: t('team.deleteConfirmMessage', { name: teamName }),
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
        if (!data.deleteTeam) throw new Error(t('team.deleteFailed'))
        $q.notify({ type: 'positive', message: t('team.deleteSuccess', { name: teamName }) })
        await loadAll()
      } catch (err) {
        $q.notify({ type: 'negative', message: err instanceof Error ? err.message : t('common.operationFailed') })
      } finally {
        teamActionLoading[teamId] = undefined
      }
    })()
  })
}

onMounted(async () => {
  const savedActiveTab = sessionStorage.getItem('tymovka.admin.activeTab')
  if (savedActiveTab === 'teams' || savedActiveTab === 'players' || (savedActiveTab === 'deliveries' && auth.isSuperAdmin)) {
    activeTab.value = savedActiveTab
    sessionStorage.removeItem('tymovka.admin.activeTab')
  }
  await loadAll()
})
</script>
