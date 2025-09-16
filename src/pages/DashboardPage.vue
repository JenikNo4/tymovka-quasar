<template>
  <q-page padding>
    <div class="q-gutter-md">
      <div class="text-h5">Dashboard</div>

      <q-card v-if="auth.isLogged">
        <q-card-section class="text-subtitle1">
          Přihlášen: <b>{{ auth.user?.name || auth.user?.email }}</b>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn color="negative" flat icon="logout" label="Odhlásit" @click="logout" />
        </q-card-actions>
      </q-card>

      <q-banner v-else class="bg-warning text-black">
        Nejsi přihlášen. <q-btn flat color="primary" @click="goLogin" label="Přihlásit přes Google" />
      </q-banner>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from 'src/stores/useAuth'
import { apiGet } from 'src/utils/api'

const auth = useAuth()
const router = useRouter()

onMounted(async () => {
  try {
    const me = await apiGet<{ id: string; email: string; name?: string }>('/api/user')
    auth.setUser(me)
  } catch (e) {
    console.error('Načtení uživatele selhalo:', e)
    auth.setUser(null)
  }
})

function goLogin() {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`
}

async function logout() {
  try {
    // Spring Security default logout endpoint může být /logout (POST). Pokud máš custom, uprav.
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' })
  } catch(err){
    console.warn('Logout request failed', err)
  }
  auth.setUser(null)
  auth.setToken(null)
  await router.push({ name: 'welcome' })
}
</script>
