<template>
  <q-page class="flex flex-center">
    <q-card flat bordered class="q-pa-lg" style="width: min(520px, 94vw);">
      <q-card-section>
        <div class="text-h5 text-weight-bold">{{ t('resetPassword.title') }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-banner v-if="successMessage" class="bg-green-1 text-green-9">
          {{ successMessage }}
        </q-banner>
        <q-banner v-if="errorMessage" class="bg-red-1 text-red-9">
          {{ errorMessage }}
        </q-banner>

        <q-input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          outlined
          dense
          autocomplete="new-password"
          :label="t('welcome.passwordLabel')"
          :hint="t('welcome.passwordHint')"
          :disable="done"
        >
          <template #append>
            <q-btn
              flat
              dense
              round
              :icon="showPassword ? 'visibility_off' : 'visibility'"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-input
          v-model="form.confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          outlined
          dense
          autocomplete="new-password"
          :label="t('welcome.confirmPasswordLabel')"
          :disable="done"
        >
          <template #append>
            <q-btn
              flat
              dense
              round
              :icon="showConfirmPassword ? 'visibility_off' : 'visibility'"
              @click="showConfirmPassword = !showConfirmPassword"
            />
          </template>
        </q-input>

        <q-banner v-if="passwordMismatch" class="bg-orange-1 text-orange-9">
          {{ t('welcome.passwordMismatch') }}
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('resetPassword.backToLogin')" :to="{ name: 'welcome' }" />
        <q-btn
          color="primary"
          :label="t('resetPassword.submit')"
          :loading="submitting"
          :disable="!canSubmit || done"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from 'src/stores/useAuth'

const route = useRoute()
const auth = useAuth()
const { t } = useI18n()

const token = computed(() => String(route.query.token ?? '').trim())
const submitting = ref(false)
const done = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref(token.value ? '' : t('resetPassword.missingToken'))
const successMessage = ref('')

const form = reactive({
  password: '',
  confirmPassword: '',
})

const passwordMismatch = computed(() =>
  form.confirmPassword.length > 0 && form.password !== form.confirmPassword
)

const canSubmit = computed(() =>
  token.value.length > 0 &&
  form.password.length >= 8 &&
  form.confirmPassword.length > 0 &&
  !passwordMismatch.value
)

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true
  try {
    await auth.resetPassword(token.value, form.password, form.confirmPassword)
    done.value = true
    successMessage.value = t('resetPassword.success')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('resetPassword.failed')
  } finally {
    submitting.value = false
  }
}
</script>
