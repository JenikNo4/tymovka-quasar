<!-- src/pages/ProfilePage.vue -->
<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Můj profil</div>
    <q-card flat bordered class="q-pa-md">
      <div><b>Jméno:</b> {{ auth.user?.firstName }} {{ auth.user?.lastName }}</div>
      <div><b>E-mail:</b> {{ auth.user?.email }}</div>
      <div><b>Přezdívka:</b> {{ auth.user?.nickname || '—' }}</div>
      <div><b>Role:</b> {{ auth.user?.roles }}</div>
    </q-card>
  </q-page>
</template>
<script setup lang="ts">
import { useAuth } from 'src/stores/useAuth'
const auth = useAuth()
</script>
