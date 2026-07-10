<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">{{ t('profile.title') }}</div>
    <q-card flat bordered class="q-pa-md q-gutter-md">
      <div><b>{{ t('profile.email') }}:</b> {{ auth.user?.email }}</div>
      <div><b>{{ t('profile.role') }}:</b> {{ auth.user?.roles }}</div>

      <q-input v-model="form.firstName" outlined dense :label="t('profile.firstName')" />
      <q-input v-model="form.lastName" outlined dense :label="t('profile.lastName')" />
      <q-input v-model="form.nickname" outlined dense :label="t('profile.nickname')" />
      <q-input v-model="form.dateOfBirth" outlined dense type="date" :label="t('profile.dateOfBirth')" />

      <q-option-group
        v-model="form.preferredPositions"
        :options="positionOptions"
        type="checkbox"
        color="primary"
        :label="t('profile.preferredPositions')"
      />

      <div class="row justify-end">
        <q-btn color="primary" :label="t('common.save')" :loading="saving" @click="saveProfile" />
      </div>

      <q-separator />

      <!-- Přepnutí se ukládá hned; in-app notifikace se nevypínají — jen email a push kanál -->
      <div>
        <div class="text-subtitle2">{{ t('profile.notificationsTitle') }}</div>
        <div class="text-caption text-grey-7">{{ t('profile.notificationsHint') }}</div>
        <q-toggle
          :model-value="auth.user?.emailNotificationsEnabled ?? true"
          :label="t('profile.notificationsEmail')"
          :disable="prefsSaving"
          @update:model-value="setNotificationPreference('email', $event)"
        />
        <q-toggle
          :model-value="auth.user?.pushNotificationsEnabled ?? true"
          :label="t('profile.notificationsPush')"
          :disable="prefsSaving"
          @update:model-value="setNotificationPreference('push', $event)"
        />
      </div>
    </q-card>
  </q-page>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useAuth } from 'src/stores/useAuth'

const auth = useAuth()
const $q = useQuasar()
const { t } = useI18n()

const saving = ref(false)
const form = ref({
  firstName: '',
  lastName: '',
  nickname: '',
  dateOfBirth: '',
  preferredPositions: [] as string[],
})

const positionOptions = computed(() => [
  { label: t('profile.positionPlayer'), value: 'PLAYER' },
  { label: t('profile.positionGoalie'), value: 'GOALIE' },
])

watch(
  () => auth.user,
  (user) => {
    form.value.firstName = user?.firstName ?? ''
    form.value.lastName = user?.lastName ?? ''
    form.value.nickname = user?.nickname ?? ''
    form.value.dateOfBirth = user?.dateOfBirth ?? ''
    form.value.preferredPositions = user?.preferredPositions?.length
      ? [...user.preferredPositions]
      : ['PLAYER']
  },
  { immediate: true }
)

const prefsSaving = ref(false)

async function setNotificationPreference(channel: 'email' | 'push', enabled: boolean) {
  prefsSaving.value = true
  try {
    await auth.updateNotificationPreferences(
      channel === 'email' ? enabled : null,
      channel === 'push' ? enabled : null
    )
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : t('profile.notificationsSaveFailed'),
    })
  } finally {
    prefsSaving.value = false
  }
}

async function saveProfile() {
  const selected = form.value.preferredPositions.length ? form.value.preferredPositions : ['PLAYER']
  saving.value = true
  try {
    await auth.updateProfile({
      firstName: form.value.firstName.trim() || null,
      lastName: form.value.lastName.trim() || null,
      nickname: form.value.nickname.trim() || null,
      dateOfBirth: form.value.dateOfBirth || null,
      preferredPositions: selected,
    })
    $q.notify({ type: 'positive', message: t('profile.saved') })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : t('profile.saveFailed'),
    })
  } finally {
    saving.value = false
  }
}
</script>
