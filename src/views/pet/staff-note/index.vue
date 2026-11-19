<script setup lang="tsx">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { NButton, NCard, NDataTable, NEmpty, NForm, NFormItem, NInput, NModal, NPopconfirm, NSelect, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { deviceList } from '@/service/api/device'
import { deletePetStaffNote, getPetStaffNotes, postPetStaffNote } from '@/service/api/pet'
import type { PetStaffNote } from '@/service/api/pet'
import { $t } from '@/locales'
import { tableThemeOverrides } from '@/utils/table-theme'

const devices = ref<any[]>([])
const deviceId = ref<string | null>(null)
const loading = ref(false)
const notes = ref<PetStaffNote[]>([])

const deviceOptions = computed(() =>
  devices.value.map(item => ({
    label: item.name || item.device_number || item.id,
    value: item.id
  }))
)

const modalVisible = ref(false)
const editId = ref('')
const form = reactive({ staff_name: '', content: '' })

async function loadNotes() {
  if (!deviceId.value) {
    notes.value = []
    return
  }
  loading.value = true
  const res = await getPetStaffNotes({ device_id: deviceId.value })
  notes.value = res?.data || []
  loading.value = false
}

async function loadDevices() {
  const res = await deviceList({ page: 1, page_size: 200 })
  devices.value = res?.data?.list || []
  if (devices.value.length) {
    deviceId.value = devices.value[0].id
    await loadNotes()
  }
}

function openAdd() {
  editId.value = ''
  form.staff_name = ''
  form.content = ''
  modalVisible.value = true
}

function openEdit(row: PetStaffNote) {
  editId.value = row.id
  form.staff_name = row.staff_name || ''
  form.content = row.content || ''
  modalVisible.value = true
}

async function handleSubmit() {
  if (!deviceId.value) {
    window.$message?.warning($t('page.pet.common.selectDevice'))
    return
  }
  if (!form.content) {
    window.$message?.warning($t('page.pet.staffNote.contentRequired'))
    return
  }
  const res = await postPetStaffNote({
    id: editId.value || undefined,
    device_id: deviceId.value,
    staff_name: form.staff_name,
    content: form.content
  })
  if (res?.error) return
  modalVisible.value = false
  window.$message?.success($t('page.pet.common.saveSuccess'))
  loadNotes()
}

async function handleDelete(id: string) {
  const res = await deletePetStaffNote(id)
  if (res?.error) return
  window.$message?.success($t('page.pet.common.deleteSuccess'))
  loadNotes()
}

const columns = ref([
  {
    key: 'staff_name',
    title: $t('page.pet.staffNote.staffName'),
    align: 'left',
    minWidth: '120px'
  },
  {
    key: 'content',
    title: $t('page.pet.staffNote.content'),
    align: 'left',
    minWidth: '320px'
  },
  {
    key: 'create_at',
    title: $t('page.pet.common.createAt'),
    align: 'left',
    minWidth: '180px'
  },
  {
    key: 'actions',
    title: $t('common.actions'),
    align: 'left',
    width: '180px',
    render: (row: PetStaffNote) => {
      return (
        <NSpace justify={'start'}>
          <NButton size={'small'} type="primary" onClick={() => openEdit(row)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" size={'small'}>
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </NSpace>
      )
    }
  }
]) as Ref<DataTableColumns<PetStaffNote>>

onMounted(loadDevices)
</script>

<template>
  <div>
    <NCard>
      <div class="pet-header">
        <div class="pet-title">{{ $t('page.pet.staffNote.title') }}</div>
        <div class="pet-toolbar">
          <NSelect
            v-model:value="deviceId"
            class="w-260px"
            :options="deviceOptions"
            :placeholder="$t('page.pet.common.selectDevice')"
            @update:value="loadNotes"
          />
          <NButton type="primary" :disabled="!deviceId" @click="openAdd">
            {{ $t('page.pet.staffNote.add') }}
          </NButton>
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
        :scroll-x="860"
        :row-key="(row: PetStaffNote) => row.id"
        :columns="columns"
        :data="notes"
        :loading="loading"
      >
        <template #empty>
          <NEmpty size="small" :description="$t('common.noData')" />
        </template>
      </NDataTable>

      <NModal v-model:show="modalVisible" preset="card" class="w-600px" :title="$t('page.pet.staffNote.title')">
        <NForm label-placement="left" label-width="100">
          <NFormItem :label="$t('page.pet.staffNote.staffName')">
            <NInput v-model:value.trim="form.staff_name" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.staffNote.content')">
            <NInput v-model:value="form.content" type="textarea" :rows="4" />
          </NFormItem>
        </NForm>
        <div class="flex justify-end gap-3">
          <NButton @click="modalVisible = false">{{ $t('generate.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('device_template.confirm') }}</NButton>
        </div>
      </NModal>
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
  gap: 12px;
  min-height: 36px;
  margin-top: 12px;
}
</style>
