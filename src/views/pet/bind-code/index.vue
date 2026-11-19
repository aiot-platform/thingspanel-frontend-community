<script setup lang="tsx">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInputNumber,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { deviceList } from '@/service/api/device'
import { createBindCode, getBindCodes, setBindCodeStatus } from '@/service/api/bind-code'
import type { DeviceBindCode } from '@/service/api/bind-code'
import { $t } from '@/locales'
import { tableThemeOverrides } from '@/utils/table-theme'

const { copy, isSupported } = useClipboard()

const devices = ref<any[]>([])
const deviceId = ref<string | null>(null)
const loading = ref(false)
const codes = ref<DeviceBindCode[]>([])

const deviceOptions = computed(() =>
  devices.value.map(item => ({
    label: item.name || item.device_number || item.id,
    value: item.id
  }))
)

const modalVisible = ref(false)
const saving = ref(false)
const form = reactive({
  device_id: null as string | null,
  max_uses: 1,
  expires_in_minutes: 0
})

/** 最近生成的绑定码（用于弹窗大字展示 + 复制） */
const lastCode = ref<DeviceBindCode | null>(null)
const codeVisible = ref(false)

async function loadCodes() {
  loading.value = true
  const res = await getBindCodes(deviceId.value ? { device_id: deviceId.value } : undefined)
  codes.value = res?.data || []
  loading.value = false
}

async function loadDevices() {
  const res = await deviceList({ page: 1, page_size: 200 })
  devices.value = res?.data?.list || []
  await loadCodes()
}

function openCreate() {
  form.device_id = deviceId.value || (devices.value[0]?.id ?? null)
  form.max_uses = 1
  form.expires_in_minutes = 0
  modalVisible.value = true
}

async function handleCreate() {
  if (!form.device_id) {
    window.$message?.warning($t('page.pet.bindCode.deviceRequired'))
    return
  }
  saving.value = true
  const res = await createBindCode({
    device_id: form.device_id,
    max_uses: form.max_uses,
    expires_in_minutes: form.expires_in_minutes
  })
  saving.value = false
  if (res?.error) return
  modalVisible.value = false
  lastCode.value = res?.data || null
  codeVisible.value = !!lastCode.value
  window.$message?.success($t('page.pet.bindCode.createSuccess'))
  await loadCodes()
}

async function toggleStatus(row: DeviceBindCode, status: number) {
  const res = await setBindCodeStatus({ id: row.id, status })
  if (res?.error) return
  window.$message?.success($t('page.pet.common.saveSuccess'))
  await loadCodes()
}

async function handleCopy(code: string) {
  if (!isSupported.value) {
    window.$message?.warning($t('page.pet.bindCode.copyUnsupported'))
    return
  }
  await copy(code)
  window.$message?.success($t('page.pet.bindCode.copied'))
}

const columns = computed(
  () =>
    [
      { key: 'code', title: $t('page.pet.bindCode.col.code'), align: 'left', minWidth: '140px' },
      { key: 'device_name', title: $t('page.pet.bindCode.col.device'), align: 'left', minWidth: '160px' },
      { key: 'max_uses', title: $t('page.pet.bindCode.col.maxUses'), align: 'left', width: '100px' },
      { key: 'used_count', title: $t('page.pet.bindCode.col.usedCount'), align: 'left', width: '100px' },
      { key: 'expires_at', title: $t('page.pet.bindCode.col.expiresAt'), align: 'left', minWidth: '170px' },
      {
        key: 'status',
        title: $t('page.pet.bindCode.col.status'),
        align: 'left',
        width: '100px',
        render: (row: DeviceBindCode) =>
          h(
            NTag,
            { type: row.status === 1 ? 'success' : 'default', size: 'small' },
            {
              default: () =>
                row.status === 1 ? $t('page.pet.bindCode.status.valid') : $t('page.pet.bindCode.status.invalid')
            }
          )
      },
      {
        key: 'actions',
        title: $t('common.actions'),
        align: 'left',
        width: '200px',
        render: (row: DeviceBindCode) => (
          <NSpace justify={'start'}>
            <NButton size={'small'} type="primary" onClick={() => handleCopy(row.code)}>
              {$t('page.pet.bindCode.copy')}
            </NButton>
            {row.status === 1 ? (
              <NPopconfirm onPositiveClick={() => toggleStatus(row, 0)}>
                {{
                  default: () => $t('page.pet.bindCode.invalidConfirm'),
                  trigger: () => (
                    <NButton type="error" size={'small'}>
                      {$t('page.pet.bindCode.invalid')}
                    </NButton>
                  )
                }}
              </NPopconfirm>
            ) : (
              <NButton size={'small'} onClick={() => toggleStatus(row, 1)}>
                {$t('page.pet.bindCode.enable')}
              </NButton>
            )}
          </NSpace>
        )
      }
    ] as DataTableColumns<DeviceBindCode>
) as Ref<DataTableColumns<DeviceBindCode>>

onMounted(loadDevices)
</script>

<template>
  <div>
    <NCard>
      <div class="pet-header">
        <div class="pet-title">{{ $t('page.pet.bindCode.title') }}</div>
        <div class="pet-toolbar">
          <NSelect
            v-model:value="deviceId"
            class="w-260px"
            clearable
            :options="deviceOptions"
            :placeholder="$t('page.pet.bindCode.allDevices')"
            @update:value="loadCodes"
          />
          <NButton type="primary" @click="openCreate">{{ $t('page.pet.bindCode.generate') }}</NButton>
        </div>
      </div>

      <NDataTable
        class="thingspanel-data-table"
        size="medium"
        :theme-overrides="tableThemeOverrides"
        :bordered="true"
        :bottom-bordered="true"
        :single-line="true"
        :striped="false"
        :scroll-x="960"
        :row-key="(row: DeviceBindCode) => row.id"
        :columns="columns"
        :data="codes"
        :loading="loading"
      >
        <template #empty>
          <NEmpty size="small" :description="$t('common.noData')" />
        </template>
      </NDataTable>

      <NModal
        v-model:show="modalVisible"
        preset="card"
        class="w-520px"
        :title="$t('page.pet.bindCode.generate')"
      >
        <NForm label-placement="left" label-width="110">
          <NFormItem :label="$t('page.pet.bindCode.col.device')">
            <NSelect v-model:value="form.device_id" :options="deviceOptions" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.bindCode.col.maxUses')">
            <NInputNumber v-model:value="form.max_uses" :min="1" :max="1000" class="w-200px" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.bindCode.expiresIn')">
            <NInputNumber v-model:value="form.expires_in_minutes" :min="0" :max="525600" class="w-200px" />
          </NFormItem>
        </NForm>
        <div class="flex justify-end gap-3">
          <NButton @click="modalVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="saving" @click="handleCreate">{{ $t('common.confirm') }}</NButton>
        </div>
      </NModal>

      <NModal v-model:show="codeVisible" preset="card" class="w-460px" :title="$t('page.pet.bindCode.codeTitle')">
        <div class="bind-code-body">
          <div class="bind-code-value">{{ lastCode?.code }}</div>
          <div class="bind-code-tip">{{ $t('page.pet.bindCode.scanTip') }}</div>
          <NButton type="primary" @click="lastCode && handleCopy(lastCode.code)">
            {{ $t('page.pet.bindCode.copy') }}
          </NButton>
        </div>
      </NModal>
    </NCard>
  </div>
</template>

<style scoped>
.pet-header {
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
  gap: 12px;
  min-height: 36px;
  margin-top: 12px;
}

.bind-code-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.bind-code-value {
  padding: 12px 24px;
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  font-family: monospace;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
}

.bind-code-tip {
  color: var(--text-color-3);
  font-size: 13px;
}
</style>
