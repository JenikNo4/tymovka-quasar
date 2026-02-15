<!-- src/pages/DashboardPage.vue -->
<template>
  <q-page padding>
    <div class="text-h4 q-mb-lg">Dashboard</div>

    <div class="row q-gutter-md">
      <!-- Přehled týmů -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Moje týmy</div>
          </q-card-section>
          <q-card-section>
            <div v-if="auth.user?.teams?.length">
              <q-list>
                <q-item v-for="team in auth.user.teams" :key="team.id">
                  <q-item-section>
                    <q-item-label>{{ team.name }}</q-item-label>
                    <q-item-label caption v-if="team.viewerCanManage">
                      <q-badge color="green">Správce</q-badge>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
            <div v-else class="text-grey-6">
              Zatím nejste členem žádného týmu.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Rychlé akce -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">Rychlé akce</div>
          </q-card-section>
          <q-card-section class="q-gutter-sm">
            <q-btn
              color="primary"
              label="Moje události"
              icon="event"
              :to="{ name: 'myEvents' }"
              class="full-width"
            />
            <q-btn
              color="secondary"
              label="Můj profil"
              icon="person"
              :to="{ name: 'profile' }"
              class="full-width"
            />
            <q-btn
              v-if="auth.isAdmin"
              color="accent"
              label="Administrace"
              icon="admin_panel_settings"
              :to="{ name: 'adminHome' }"
              class="full-width"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Přehled nadcházejících událostí -->
    <div class="q-mt-xl">
      <div class="text-h6 q-mb-md">Nadcházející události</div>
      <q-card>
        <q-card-section>
          <div class="text-grey-6 text-center q-pa-lg">
            Zatím žádné nadcházející události.
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuth } from 'src/stores/useAuth'

const auth = useAuth()
</script>
