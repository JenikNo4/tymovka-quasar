<template>
  <q-page class="flex flex-center">
    <div class="q-pa-xl column items-center q-gutter-md" style="max-width: 560px; text-align: center;">
      <div class="text-h4 text-weight-bold">Welcome to TeamApp</div>
      <div class="text-subtitle1 text-grey-7">
        Přihlaš se a začni organizovat tréninky a zápasy.
      </div>

      <q-separator spaced />

      <q-btn
        unelevated
        size="lg"
        class="q-px-lg"
        color="primary"
        :href="googleLoginUrl"
        label="Přihlásit se přes Google"
        icon="login"
      />

      <!-- Volitelně: odkazy pro další poskytovatele nebo manuální login -->
      <!-- <q-btn flat color="secondary" label="Přihlásit e-mailem" @click="goEmail" /> -->
    </div>
  </q-page>
</template>

<script setup lang="ts">
const googleLoginUrl = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`
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
    await router.push({ name: 'dashboard' })
  } catch {
    // nejsem přihlášen – zůstanu na Welcome
  }
})
// Příklad pro alternativní navigaci bez href:
// import { useRouter } from 'vue-router'
// const router = useRouter()
// function goEmail() { router.push({ name: 'emailLogin' }) }
</script>
