<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NCard, NSelect } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { deviceLogDevices, deviceLogTenants } from '@/service/api/device'
import { $t } from '@/locales'
import DeviceLog from '@/views/device/details/modules/device-log.vue'

/**
 * 系统管理 - 设备日志查询（仅系统管理员）
 * 必须先选租户、再选设备；其余筛选（时间/方向/类型/关键字）复用设备详情页的日志组件。
 */
const tenantId = ref<string | null>(null)
const deviceId = ref<string | null>(null)

const tenantOptions = ref<SelectOption[]>([])
const tenantLoading = ref(false)
const deviceOptions = ref<SelectOption[]>([])
const deviceLoading = ref(false)

const loadTenants = async () => {
  tenantLoading.value = true
  try {
    const { data, error } = await deviceLogTenants()
    if (!error && data) {
      tenantOptions.value = data.map(t => ({
        label: t.name ? `${t.name}（${t.email || t.tenant_id}）` : t.email || t.tenant_id,
        value: t.tenant_id
      }))
    }
  } finally {
    tenantLoading.value = false
  }
}

let deviceSearchTimer: ReturnType<typeof setTimeout> | undefined
const loadDevices = async (keyword = '') => {
  if (!tenantId.value) {
    deviceOptions.value = []
    return
  }
  const currentTenant = tenantId.value
  deviceLoading.value = true
  try {
    const { data, error } = await deviceLogDevices({ tenant_id: currentTenant, keyword: keyword || undefined })
    // 防止切换租户后旧请求覆盖新结果
    if (!error && data && currentTenant === tenantId.value) {
      deviceOptions.value = data.map(d => ({
        label: d.name ? `${d.name}（${d.device_number}）` : d.device_number,
        value: d.id
      }))
    }
  } finally {
    deviceLoading.value = false
  }
}

const handleDeviceSearch = (keyword: string) => {
  clearTimeout(deviceSearchTimer)
  deviceSearchTimer = setTimeout(() => loadDevices(keyword), 300)
}

watch(tenantId, () => {
  deviceId.value = null
  deviceOptions.value = []
  loadDevices()
})

const selectedTenant = computed(() => tenantId.value || '')
const selectedDevice = computed(() => (tenantId.value && deviceId.value) || '')

onMounted(loadTenants)
</script>

<template>
  <NCard :bordered="false" :title="$t('route.management_device-log')" class="h-full">
    <DeviceLog :id="selectedDevice" :tenant-id="selectedTenant" require-target>
      <template #prefix>
        <NSelect
          v-model:value="tenantId"
          :options="tenantOptions"
          :loading="tenantLoading"
          :placeholder="$t('custom.device_details.logSelectTenant')"
          filterable
          class="device-log-page__tenant"
        />
        <NSelect
          v-model:value="deviceId"
          :options="deviceOptions"
          :loading="deviceLoading"
          :disabled="!tenantId"
          :placeholder="$t('custom.device_details.logSelectDevice')"
          filterable
          remote
          clearable
          class="device-log-page__device"
          @search="handleDeviceSearch"
          @focus="!deviceOptions.length && loadDevices()"
        />
      </template>
    </DeviceLog>
  </NCard>
</template>

<style scoped lang="scss">
.device-log-page__tenant {
  flex: 0 0 220px;
  width: 220px;
}

.device-log-page__device {
  flex: 0 0 240px;
  width: 240px;
}
</style>
