<template>
  <q-card bordered flat>
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-subtitle1">{{ title }}</div>
        <div v-if="subtitle" class="text-caption text-grey-7">{{ subtitle }}</div>
      </div>
      <q-btn
        flat
        dense
        icon="refresh"
        :label="t('common.refresh')"
        :loading="loading"
        @click="$emit('refresh')"
      />
    </q-card-section>
    <q-separator />
    <q-card-section v-if="!deliveries.length">
      <div class="text-caption text-grey-7">{{ emptyText }}</div>
    </q-card-section>
    <q-markup-table v-else flat bordered dense>
      <thead>
        <tr>
          <th class="text-left">{{ t('teamDetail.deliveryCreatedAt') }}</th>
          <th class="text-left">{{ t('teamDetail.deliveryType') }}</th>
          <th class="text-left">{{ t('teamDetail.deliveryChannel') }}</th>
          <th class="text-left">{{ t('teamDetail.deliveryRecipient') }}</th>
          <th class="text-left">{{ t('teamDetail.deliveryStatus') }}</th>
          <th class="text-left">{{ t('teamDetail.deliveryAttempts') }}</th>
          <th class="text-left">{{ t('teamDetail.deliveryLastError') }}</th>
          <th class="text-right">{{ t('teamDetail.deliveryActions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="delivery in deliveries" :key="delivery.id">
          <td>{{ formatDateTime(delivery.createdAt) }}</td>
          <td>{{ delivery.type }}</td>
          <td>
            <q-chip dense square :color="deliveryChannelColor(delivery.channel)" text-color="white">
              {{ delivery.channel }}
            </q-chip>
          </td>
          <td>{{ delivery.recipientEmail || '-' }}</td>
          <td>
            <q-chip dense square :color="deliveryStatusColor(delivery.status)" text-color="white">
              {{ delivery.status }}
            </q-chip>
          </td>
          <td>{{ delivery.attemptCount }}</td>
          <td class="delivery-error-cell">{{ delivery.lastError || '-' }}</td>
          <td class="text-right">
            <q-btn
              v-if="canRetry(delivery)"
              flat
              dense
              color="primary"
              icon="restart_alt"
              :label="t('teamDetail.deliveryRetry')"
              :loading="retryingDeliveryId === delivery.id"
              :disable="loading"
              @click="$emit('retry', delivery)"
            />
          </td>
        </tr>
      </tbody>
    </q-markup-table>
    <q-separator v-if="showPaging" />
    <q-card-actions v-if="showPaging" align="between">
      <div class="text-caption text-grey-7">
        {{ pageInfo }}
      </div>
      <div class="row q-gutter-sm">
        <q-btn flat color="primary" :label="t('adminHome.prevPage')" :disable="page <= 0 || loading" @click="$emit('prev')" />
        <q-btn flat color="primary" :label="t('adminHome.nextPage')" :disable="page + 1 >= totalPages || loading" @click="$emit('next')" />
      </div>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NotificationDelivery } from 'src/types/notification-delivery'

const props = defineProps<{
  title: string
  subtitle?: string
  emptyText: string
  deliveries: NotificationDelivery[]
  loading?: boolean
  retryingDeliveryId?: string | null
  retryEnabled?: boolean
  page?: number
  totalPages?: number
  totalElements?: number
}>()

defineEmits<{
  refresh: []
  prev: []
  next: []
  retry: [delivery: NotificationDelivery]
}>()

const { t } = useI18n()

const page = computed(() => props.page ?? 0)
const totalPages = computed(() => props.totalPages ?? 0)
const showPaging = computed(() => props.totalPages != null && props.totalElements != null)
const pageInfo = computed(() =>
  t('adminHome.deliveryPageInfo', {
    page: page.value + 1,
    totalPages: totalPages.value || 1,
    total: props.totalElements ?? props.deliveries.length,
  })
)

function formatDateTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString('cs-CZ')
}

function deliveryChannelColor(channel: string): string {
  if (channel === 'EMAIL') return 'primary'
  if (channel === 'PUSH') return 'deep-purple'
  return 'grey-7'
}

function deliveryStatusColor(status: string): string {
  if (status === 'SENT') return 'positive'
  if (status === 'FAILED') return 'negative'
  if (status === 'SKIPPED_DUPLICATE') return 'grey-7'
  if (status === 'SKIPPED_PREFERENCE') return 'blue-grey'
  if (status === 'SKIPPED_RATE_LIMITED') return 'orange'
  if (status === 'NOT_IMPLEMENTED') return 'warning'
  return 'primary'
}

function canRetry(delivery: NotificationDelivery): boolean {
  return props.retryEnabled !== false &&
    delivery.channel === 'EMAIL' &&
    ['FAILED', 'SKIPPED_DUPLICATE', 'SENT'].includes(delivery.status)
}
</script>

<style scoped>
.delivery-error-cell {
  max-width: 260px;
  white-space: normal;
  word-break: break-word;
}
</style>
