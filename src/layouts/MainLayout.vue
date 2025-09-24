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
          <q-route-tab name="profile" label="Můj profil" :to="{ name: 'profile' }" />
          <q-route-tab name="myTeams" label="Moje týmy" :to="{ name: 'myTeams' }" />
          <q-route-tab name="myEvents" label="Moje události" :to="{ name: 'myEvents' }" />
          <q-route-tab
            v-if="auth.isAdmin"
            name="admin"
            label="Administrace"
            :to="{ name: 'adminHome' }"
          />
        </q-tabs>

        <q-space />

        <div v-if="auth.isLogged" class="row items-center q-gutter-sm">
          <q-avatar size="28px" color="primary" text-color="white">{{ initials }}</q-avatar>
          <span class="text-caption">
            {{ auth.user?.firstName ? (auth.user.firstName + ' ' + auth.user.lastName) : auth.user?.email }}
          </span>
          <q-btn flat dense icon="logout" @click="doLogout" />
        </div>
        <div v-else>
          <q-btn flat icon="login" label="Přihlásit" @click="auth.loginWithGoogle()" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from 'src/stores/useAuth'

const auth = useAuth()
const router = useRouter()

const initials = computed(() => {
  const display = auth.user?.firstName
    ? `${auth.user.firstName} ${auth.user.lastName}`
    : (auth.user?.email ?? '')
  const emailPrefix = display.split('@')[0] ?? ''
  const parts = emailPrefix.split(/[.\s_-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '')
  return letters.join('') || 'U'
})

function goHome() {
  void router.push({ name: auth.isLogged ? 'dashboard' : 'welcome' })
}

async function doLogout() {
  await auth.logout()
  void router.push({ name: 'welcome' })
}
</script>
