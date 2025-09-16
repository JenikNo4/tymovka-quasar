<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>TeamApp</q-toolbar-title>

        <div v-if="auth.isLogged" class="row items-center q-gutter-sm">
          <q-avatar size="28px" color="primary" text-color="white">
            {{ initials }}
          </q-avatar>
          <span class="text-caption">{{ auth.user?.name || auth.user?.email }}</span>
          <q-btn flat dense icon="dashboard" @click="$router.push({ name: 'dashboard' })"/>
          <q-btn flat dense icon="logout" @click="logout"/>
        </div>

        <div v-else>
          <q-btn flat icon="login" label="Přihlásit" @click="goLogin"/>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view/>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useAuth} from 'src/stores/useAuth'

const auth = useAuth()

const initials = computed(() => {
  const name = auth.user?.name || auth.user?.email || ''
  const emailPrefix = name.split('@')[0] ?? ''
  const parts = emailPrefix.split(/[.\s_-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '')
  return letters.join('') || 'U'
})

function goLogin() {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`
}

async function logout() {
  try {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/logout`, {method: 'POST', credentials: 'include'})
  } catch {
    console.error('Odhlaseni uživatele selhalo')
  }
  auth.setUser(null)
  auth.setToken(null)
}
</script>
