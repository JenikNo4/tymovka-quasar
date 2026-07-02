<template>
  <q-page class="flex flex-center">
    <q-card flat bordered class="q-pa-lg" style="width: min(720px, 94vw);">
      <q-card-section class="text-center">
        <div class="text-h4 text-weight-bold">{{ t('welcome.title') }}</div>
        <div class="text-subtitle1 text-grey-7 q-mt-sm">
          {{ t('welcome.subtitle') }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-btn
          unelevated
          size="lg"
          color="primary"
          class="full-width"
          :href="googleLoginUrl"
          :label="t('welcome.googleLogin')"
          icon="login"
        />
      </q-card-section>

      <q-separator spaced />

      <q-tabs v-model="activeTab" dense align="justify" active-color="primary" indicator-color="primary">
        <q-tab name="login" :label="t('welcome.emailLoginTab')" />
        <q-tab name="register" :label="t('welcome.emailRegisterTab')" />
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="login">
          <div class="text-subtitle2 q-mb-md">{{ t('welcome.emailLoginTitle') }}</div>
          <div class="q-gutter-md">
            <q-banner v-if="infoMessage" class="bg-green-1 text-green-9">
              {{ infoMessage }}
            </q-banner>
            <q-banner v-if="loginErrorMessage" class="bg-red-1 text-red-9">
              {{ loginErrorMessage }}
            </q-banner>
            <q-input
              v-model="loginForm.email"
              type="email"
              outlined
              dense
              autocomplete="email"
              :label="t('welcome.emailLabel')"
            />
            <q-input
              v-model="loginForm.password"
              :type="showLoginPassword ? 'text' : 'password'"
              outlined
              dense
              autocomplete="current-password"
              :label="t('welcome.passwordLabel')"
            >
              <template #append>
                <q-btn
                  flat
                  dense
                  round
                  :icon="showLoginPassword ? 'visibility_off' : 'visibility'"
                  @click="showLoginPassword = !showLoginPassword"
                />
              </template>
            </q-input>
            <q-btn
              color="primary"
              :label="t('welcome.emailLoginAction')"
              :loading="submitting"
              :disable="!canSubmitLogin"
              @click="submitLogin"
            />
            <q-btn
              v-if="canResendVerification"
              flat
              color="primary"
              :label="t('welcome.resendVerificationAction')"
              :loading="submitting"
              @click="resendVerification"
            />
            <q-btn
              flat
              color="primary"
              :label="t('welcome.forgotPasswordAction')"
              :loading="submitting"
              :disable="loginForm.email.trim().length === 0"
              @click="forgotPassword"
            />
          </div>
        </q-tab-panel>

        <q-tab-panel name="register">
          <div class="text-subtitle2 q-mb-md">{{ t('welcome.emailRegisterTitle') }}</div>
          <div class="q-gutter-md">
            <q-banner v-if="registerSuccessMessage" class="bg-green-1 text-green-9">
              {{ registerSuccessMessage }}
            </q-banner>
            <q-banner v-if="registerErrorMessage" class="bg-red-1 text-red-9">
              {{ registerErrorMessage }}
            </q-banner>
            <q-input
              v-model="registerForm.email"
              type="email"
              outlined
              dense
              autocomplete="email"
              :label="t('welcome.emailLabel')"
            />
            <q-input
              v-model="registerForm.password"
              :type="showRegisterPassword ? 'text' : 'password'"
              outlined
              dense
              autocomplete="new-password"
              :label="t('welcome.passwordLabel')"
              :hint="t('welcome.passwordHint')"
            >
              <template #append>
                <q-btn
                  flat
                  dense
                  round
                  :icon="showRegisterPassword ? 'visibility_off' : 'visibility'"
                  @click="showRegisterPassword = !showRegisterPassword"
                />
              </template>
            </q-input>
            <q-input
              v-model="registerForm.confirmPassword"
              :type="showRegisterConfirmPassword ? 'text' : 'password'"
              outlined
              dense
              autocomplete="new-password"
              :label="t('welcome.confirmPasswordLabel')"
            >
              <template #append>
                <q-btn
                  flat
                  dense
                  round
                  :icon="showRegisterConfirmPassword ? 'visibility_off' : 'visibility'"
                  @click="showRegisterConfirmPassword = !showRegisterConfirmPassword"
                />
              </template>
            </q-input>
            <q-banner v-if="passwordMismatch" class="bg-orange-1 text-orange-9">
              {{ t('welcome.passwordMismatch') }}
            </q-banner>
            <q-btn
              color="primary"
              :label="t('welcome.emailRegisterAction')"
              :loading="submitting"
              :disable="!canSubmitRegister"
              @click="submitRegister"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useAuth } from 'src/stores/useAuth'

const googleLoginUrl = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`

const auth = useAuth()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const { t } = useI18n()

const activeTab = ref<'login' | 'register'>('login')
const submitting = ref(false)
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)
const loginErrorMessage = ref('')
const registerErrorMessage = ref('')
const registerSuccessMessage = ref('')
const infoMessage = ref('')
const lastVerificationEmail = ref('')
const teamInviteToken = ref('')

const loginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

const passwordMismatch = computed(() =>
  registerForm.confirmPassword.length > 0 && registerForm.password !== registerForm.confirmPassword
)

const canSubmitLogin = computed(() =>
  loginForm.email.trim().length > 0 && loginForm.password.length > 0
)

const canSubmitRegister = computed(() =>
  registerForm.email.trim().length > 0 &&
  registerForm.password.length >= 8 &&
  registerForm.confirmPassword.length > 0 &&
  !passwordMismatch.value
)

const canResendVerification = computed(() =>
  lastVerificationEmail.value.trim().length > 0 &&
  loginErrorMessage.value.toLowerCase().includes('not verified')
)

async function redirectIfLoggedIn() {
  await auth.fetchMe()
  if (auth.isLogged) {
    await router.push({ name: 'dashboard' })
  }
}

async function submitLogin() {
  if (!canSubmitLogin.value) return
  loginErrorMessage.value = ''
  registerErrorMessage.value = ''
  infoMessage.value = ''
  submitting.value = true
  try {
    await auth.loginWithEmail(loginForm.email, loginForm.password)
    if (typeof $q.notify === 'function') {
      $q.notify({ type: 'positive', message: t('welcome.loginSuccess') })
    }
    await router.push({ name: 'dashboard' })
  } catch (error) {
    loginErrorMessage.value = error instanceof Error ? error.message : t('welcome.loginFailed')
    if (loginErrorMessage.value.toLowerCase().includes('not verified')) {
      lastVerificationEmail.value = loginForm.email.trim()
    }
    if (typeof $q.notify === 'function') {
      $q.notify({
        type: 'negative',
        message: loginErrorMessage.value,
      })
    }
  } finally {
    submitting.value = false
  }
}

async function submitRegister() {
  if (!canSubmitRegister.value) return
  loginErrorMessage.value = ''
  registerErrorMessage.value = ''
  registerSuccessMessage.value = ''
  infoMessage.value = ''
  submitting.value = true
  try {
    await auth.registerWithEmail(
      registerForm.email,
      registerForm.password,
      registerForm.confirmPassword,
      teamInviteToken.value || null
    )
    lastVerificationEmail.value = registerForm.email.trim()
    registerSuccessMessage.value = teamInviteToken.value
      ? t('welcome.registerTeamInviteSuccess')
      : t('welcome.registerVerifyEmailSent')
    if (typeof $q.notify === 'function') {
      $q.notify({ type: 'positive', message: t('welcome.registerSuccess') })
    }
    activeTab.value = 'login'
    infoMessage.value = teamInviteToken.value
      ? t('welcome.registerTeamInviteSuccess')
      : t('welcome.registerVerifyEmailSent')
  } catch (error) {
    registerErrorMessage.value = error instanceof Error ? error.message : t('welcome.registerFailed')
    if (typeof $q.notify === 'function') {
      $q.notify({
        type: 'negative',
        message: registerErrorMessage.value,
      })
    }
  } finally {
    submitting.value = false
  }
}

async function resendVerification() {
  if (!lastVerificationEmail.value.trim()) return
  loginErrorMessage.value = ''
  infoMessage.value = ''
  submitting.value = true
  try {
    await auth.resendEmailVerification(lastVerificationEmail.value)
    infoMessage.value = t('welcome.resendVerificationSuccess')
  } catch (error) {
    loginErrorMessage.value = error instanceof Error ? error.message : t('welcome.resendVerificationFailed')
  } finally {
    submitting.value = false
  }
}

async function forgotPassword() {
  if (!loginForm.email.trim()) return
  loginErrorMessage.value = ''
  infoMessage.value = ''
  submitting.value = true
  try {
    await auth.forgotPassword(loginForm.email.trim())
    infoMessage.value = t('welcome.forgotPasswordSuccess')
  } catch (error) {
    loginErrorMessage.value = error instanceof Error ? error.message : t('welcome.forgotPasswordFailed')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const rawInviteToken = Array.isArray(route.query.teamInviteToken)
    ? route.query.teamInviteToken[0]
    : route.query.teamInviteToken
  const rawInviteEmail = Array.isArray(route.query.inviteEmail)
    ? route.query.inviteEmail[0]
    : route.query.inviteEmail

  if (typeof rawInviteToken === 'string' && rawInviteToken.trim()) {
    teamInviteToken.value = rawInviteToken.trim()
    activeTab.value = 'register'
    infoMessage.value = t('welcome.teamInviteDetected')
  }
  if (typeof rawInviteEmail === 'string' && rawInviteEmail.trim()) {
    registerForm.email = rawInviteEmail.trim()
  }

  if (route.query.emailVerified === 'success') {
    activeTab.value = 'login'
    infoMessage.value = t('welcome.emailVerificationSuccess')
  } else if (route.query.emailVerified === 'failed') {
    activeTab.value = 'login'
    loginErrorMessage.value = t('welcome.emailVerificationFailed')
  }
  await redirectIfLoggedIn()
})
</script>
