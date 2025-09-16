<template>
  <q-page class="flex flex-center">
    <q-spinner size="2em" />
    <div class="q-ml-md">Přihlašuji…</div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Např. backend přidá ?token=JWT
const token = route.query.token as string | undefined
if (token) {
  localStorage.setItem('auth_token', token)
  void router.replace({ name: 'dashboard' }) // změň na stránku po loginu
} else {
  // Pokud používáš serverovou session cookie, stačí rovnou přesměrovat
  void router.replace({ name: 'dashboard' })
}
</script>

