<!-- src/pages/MyTeamsPage.vue -->
<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Moje týmy</div>
    <q-list bordered separator v-if="auth.user?.teams?.length">
      <q-item v-for="t in auth.user!.teams" :key="t.id">
        <q-item-section>
          <q-item-label><b>{{ t.name }}</b></q-item-label>
          <q-item-label caption>
            <span v-if="t.isAdmin || t.viewerCanManage">Admin</span>
            <span v-else>Member</span>
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    <q-banner v-else class="bg-grey-2 q-pa-md">Nejsi členem žádného týmu.</q-banner>
  </q-page>
</template>
<script setup lang="ts">
import { useAuth } from 'src/stores/useAuth'
const auth = useAuth()
</script>
