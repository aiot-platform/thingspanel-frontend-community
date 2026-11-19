<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NCard, NEmpty, NImage, NPopconfirm, NSelect, NSpin, NTag } from 'naive-ui'
import { deviceList } from '@/service/api/device'
import { deletePetAlbum, deletePetTimeline, getPetAlbum, getPetTimeline } from '@/service/api/pet'
import type { PetAlbumItem, PetTimeline } from '@/service/api/pet'
import { $t } from '@/locales'

const devices = ref<any[]>([])
const deviceId = ref<string | null>(null)
const loading = ref(false)
const album = ref<PetAlbumItem[]>([])
const timeline = ref<PetTimeline[]>([])

const deviceOptions = computed(() =>
  devices.value.map(item => ({
    label: item.name || item.device_number || item.id,
    value: item.id
  }))
)

const TIMELINE_TAGS: Record<string, string> = {
  eat: 'success',
  play: 'info',
  sleep: 'default',
  care: 'warning',
  treat: 'error'
}

async function loadData() {
  if (!deviceId.value) {
    album.value = []
    timeline.value = []
    return
  }
  loading.value = true
  const [albumRes, timelineRes] = await Promise.all([
    getPetAlbum({ device_id: deviceId.value, limit: 60 }),
    getPetTimeline({ device_id: deviceId.value, limit: 50 })
  ])
  album.value = albumRes?.data || []
  timeline.value = timelineRes?.data || []
  loading.value = false
}

async function loadDevices() {
  const res = await deviceList({ page: 1, page_size: 200 })
  devices.value = res?.data?.list || []
  if (devices.value.length) {
    deviceId.value = devices.value[0].id
    await loadData()
  }
}

async function handleDeletePhoto(id: string) {
  const res = await deletePetAlbum(id)
  if (res?.error) return
  window.$message?.success($t('page.pet.common.deleteSuccess'))
  loadData()
}

async function handleDeleteTimeline(id: string) {
  const res = await deletePetTimeline(id)
  if (res?.error) return
  window.$message?.success($t('page.pet.common.deleteSuccess'))
  loadData()
}

onMounted(loadDevices)
</script>

<template>
  <div>
    <NCard>
      <div class="pet-header">
        <div class="pet-title">{{ $t('page.pet.album.title') }}</div>
        <div class="pet-toolbar">
          <NSelect
            v-model:value="deviceId"
            class="w-260px"
            :options="deviceOptions"
            :placeholder="$t('page.pet.common.selectDevice')"
            @update:value="loadData"
          />
        </div>
      </div>

      <NSpin :show="loading">
        <div class="pet-section-title">{{ $t('page.pet.album.photos') }}</div>
        <NEmpty v-if="!album.length" size="small" :description="$t('page.pet.album.empty')" />
        <div v-else class="pet-album-grid">
          <div v-for="photo in album" :key="photo.id" class="pet-album-item">
            <NImage width="100%" :src="photo.url" object-fit="cover" class="h-140px" />
            <div class="pet-album-meta">
              <span class="pet-album-time">{{ photo.create_at }}</span>
              <NPopconfirm @positive-click="handleDeletePhoto(photo.id)">
                <template #trigger>
                  <NButton size="tiny" type="error" quaternary>{{ $t('common.delete') }}</NButton>
                </template>
                {{ $t('common.confirmDelete') }}
              </NPopconfirm>
            </div>
          </div>
        </div>

        <div class="pet-section-title m-t6">{{ $t('page.pet.album.timeline') }}</div>
        <NEmpty v-if="!timeline.length" size="small" :description="$t('page.pet.album.timelineEmpty')" />
        <div v-else class="pet-timeline">
          <div v-for="item in timeline" :key="item.id" class="pet-timeline-item">
            <NTag size="small" :type="(TIMELINE_TAGS[item.type] as any) || 'default'">
              {{ $t(`page.pet.album.type.${item.type || 'other'}`) }}
            </NTag>
            <span class="pet-timeline-title">{{ item.title }}</span>
            <span class="pet-timeline-time">{{ item.create_at }}</span>
            <NPopconfirm @positive-click="handleDeleteTimeline(item.id)">
              <template #trigger>
                <NButton size="tiny" type="error" quaternary>{{ $t('common.delete') }}</NButton>
              </template>
              {{ $t('common.confirmDelete') }}
            </NPopconfirm>
          </div>
        </div>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
.pet-header {
  display: block;
  margin-bottom: 20px;
}

.pet-title {
  color: var(--text-color);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
}

.pet-toolbar {
  display: flex;
  align-items: center;
  min-height: 36px;
  margin-top: 12px;
}

.pet-section-title {
  margin-bottom: 12px;
  color: var(--text-color);
  font-size: 16px;
  font-weight: 600;
}

.pet-album-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.pet-album-item {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.pet-album-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
}

.pet-album-time {
  color: var(--text-color-3, #999);
  font-size: 12px;
}

.pet-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pet-timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.pet-timeline-title {
  flex: 1;
  color: var(--text-color);
}

.pet-timeline-time {
  color: var(--text-color-3, #999);
  font-size: 12px;
}
</style>
