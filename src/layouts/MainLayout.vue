<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title class="cursor-pointer" @click="goHome">Tymovka</q-toolbar-title>

        <q-tabs
          v-if="auth.isLogged"
          shrink
          align="left"
          class="q-ml-md"
          :breakpoint="0"
        >
          <q-route-tab name="profile" :label="t('layout.profile')" :to="{ name: 'profile' }" />
          <q-route-tab name="myTeams" :label="t('layout.myTeams')" :to="{ name: 'myTeams' }" />
          <q-route-tab name="myEvents" :label="t('layout.myEvents')" :to="{ name: 'myEvents' }" />
          <q-route-tab name="notifications" :label="t('layout.notifications')" :to="{ name: 'notifications' }" />
          <q-route-tab
            v-if="auth.isAdmin"
            name="admin"
            :label="t('layout.admin')"
            :to="{ name: 'adminHome' }"
          />
        </q-tabs>

        <q-space />

        <q-btn-dropdown
          flat
          dense
          :label="localeLabel"
          :aria-label="t('layout.language')"
          class="q-mr-sm"
        >
          <q-list dense>
            <q-item clickable v-close-popup @click="setLocale('cs-CZ')">
              <q-item-section>{{ t('layout.languageCzech') }}</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="setLocale('en-US')">
              <q-item-section>{{ t('layout.languageEnglish') }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <div v-if="auth.isLogged" class="row items-center q-gutter-sm">
          <q-avatar size="28px" color="primary" text-color="white">{{ initials }}</q-avatar>
          <span class="text-caption">
            {{ auth.user?.firstName ? (auth.user.firstName + ' ' + auth.user.lastName) : auth.user?.email }}
          </span>
          <q-btn flat dense icon="logout" :label="t('layout.logout')" @click="doLogout" />
        </div>
        <div v-else>
          <q-btn flat icon="login" :label="t('layout.login')" @click="goLogin" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-grey-2 text-grey-7 app-footer">
      <div class="text-caption text-right q-px-md q-py-xs">
        {{ t('layout.version') }} {{ appVersion }}
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from 'src/stores/useAuth'

const auth = useAuth()
const router = useRouter()
const { t, locale } = useI18n()
const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'

const initials = computed(() => {
  const display = auth.user?.firstName
    ? `${auth.user.firstName} ${auth.user.lastName}`
    : (auth.user?.email ?? '')
  const emailPrefix = display.split('@')[0] ?? ''
  const parts = emailPrefix.split(/[.\s_-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '')
  return letters.join('') || 'U'
})

const localeLabel = computed(() =>
  locale.value === 'cs-CZ' ? t('layout.languageCzech') : t('layout.languageEnglish')
)

function goHome() {
  void router.push({ name: auth.isLogged ? 'dashboard' : 'welcome' })
}

function setLocale(nextLocale: 'cs-CZ' | 'en-US') {
  locale.value = nextLocale
  localStorage.setItem('tymovka.locale', nextLocale)
  if (auth.isLogged) {
    void auth.updatePreferredLanguage(nextLocale).catch((error: unknown) => {
      console.error('Failed to persist preferred language', error)
    })
  }
}

async function doLogout() {
  await auth.logout()
  void router.push({ name: 'welcome' })
}

function goLogin() {
  void router.push({ name: 'welcome' })
}

watch(
  () => auth.user?.preferredLanguage,
  (preferred) => {
    if (preferred === 'cs-CZ' || preferred === 'en-US') {
      locale.value = preferred
      localStorage.setItem('tymovka.locale', preferred)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.app-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
