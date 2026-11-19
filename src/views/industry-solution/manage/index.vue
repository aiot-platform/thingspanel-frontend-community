<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NSwitch,
  NTag
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  assignTenantSolution,
  deleteIndustrySolution,
  getIndustrySolutions,
  getTenantList,
  getTenantSolutions,
  saveIndustrySolution,
  unassignTenantSolution
} from '@/service/api/industry-solution'
import type { IndustrySolution, TenantInfo, TenantSolution } from '@/service/api/industry-solution'
import { $t } from '@/locales'

/** 方案字典 */
const solutions = ref<IndustrySolution[]>([])
const loadingSolutions = ref(false)

/** 租户与分配 */
const tenants = ref<TenantInfo[]>([])
const tenantId = ref<string | null>(null)
const assigned = ref<TenantSolution[]>([])
const loadingAssigned = ref(false)

const tenantOptions = computed(() =>
  tenants.value.map(item => ({
    label: item.name || item.email || item.tenant_id,
    value: item.tenant_id
  }))
)

/** 已分配（用于分配弹窗剔除） */
const assignedCodes = computed(() => new Set(assigned.value.map(item => item.solution_code)))
const assignableOptions = computed(() =>
  solutions.value
    .filter(item => !assignedCodes.value.has(item.code))
    .map(item => ({ label: `${item.name} (${item.code})`, value: item.code }))
)

/** 新增/编辑弹窗 */
const formVisible = ref(false)
const saving = ref(false)
const form = reactive({
  id: '',
  code: '',
  name: '',
  description: '',
  schema_name: '',
  icon: '',
  status: 1 as number,
  sort: 0
})

/** 分配弹窗 */
const assignVisible = ref(false)
const assignCode = ref<string | null>(null)
const assigning = ref(false)

const solutionColumns: DataTableColumns<IndustrySolution> = [
  { title: $t('page.industrySolution.col.code'), key: 'code', width: 140 },
  { title: $t('page.industrySolution.col.name'), key: 'name', width: 140 },
  { title: $t('page.industrySolution.col.schemaName'), key: 'schema_name', width: 180 },
  {
    title: $t('page.industrySolution.col.status'),
    key: 'status',
    width: 100,
    render: row =>
      h(
        NTag,
        { type: row.status === 1 ? 'success' : 'default', size: 'small' },
        { default: () => (row.status === 1 ? $t('page.industrySolution.status.enabled') : $t('page.industrySolution.status.disabled')) }
      )
  },
  { title: $t('page.industrySolution.col.sort'), key: 'sort', width: 80 },
  { title: $t('page.industrySolution.col.description'), key: 'description', ellipsis: { tooltip: true } },
  {
    title: $t('page.industrySolution.col.action'),
    key: 'action',
    width: 150,
    render: row =>
      h(NSpace, null, {
        default: () => [
          h(
            NButton,
            { size: 'small', quaternary: true, type: 'primary', onClick: () => openEdit(row) },
            { default: () => $t('page.industrySolution.edit') }
          ),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row.id) },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', quaternary: true, type: 'error' },
                  { default: () => $t('page.industrySolution.delete') }
                ),
              default: () => $t('page.industrySolution.deleteConfirm')
            }
          )
        ]
      })
  }
]

const assignedColumns: DataTableColumns<TenantSolution> = [
  { title: $t('page.industrySolution.col.code'), key: 'solution_code', width: 140 },
  { title: $t('page.industrySolution.col.name'), key: 'name', width: 140 },
  { title: $t('page.industrySolution.col.schemaName'), key: 'schema_name', width: 180 },
  {
    title: $t('page.industrySolution.assign.deviceCount'),
    key: 'device_count',
    width: 100
  },
  {
    title: $t('page.industrySolution.assign.enabled'),
    key: 'enabled',
    width: 100,
    render: row =>
      h(NSwitch, {
        value: row.enabled === 1,
        size: 'small',
        onUpdateValue: (v: boolean) => toggleEnabled(row, v)
      })
  },
  {
    title: $t('page.industrySolution.col.action'),
    key: 'action',
    width: 100,
    render: row =>
      h(
        NPopconfirm,
        { onPositiveClick: () => handleUnassign(row.solution_code) },
        {
          trigger: () =>
            h(
              NButton,
              { size: 'small', quaternary: true, type: 'error' },
              { default: () => $t('page.industrySolution.assign.remove') }
            ),
          default: () => $t('page.industrySolution.deleteConfirm')
        }
      )
  }
]

async function loadSolutions() {
  loadingSolutions.value = true
  const res = await getIndustrySolutions()
  solutions.value = res?.data || []
  loadingSolutions.value = false
}

async function loadTenants() {
  const res = await getTenantList()
  tenants.value = res?.data || []
}

async function loadAssigned() {
  if (!tenantId.value) {
    assigned.value = []
    return
  }
  loadingAssigned.value = true
  const res = await getTenantSolutions({ tenant_id: tenantId.value })
  assigned.value = res?.data || []
  loadingAssigned.value = false
}

function openCreate() {
  Object.assign(form, { id: '', code: '', name: '', description: '', schema_name: '', icon: '', status: 1, sort: 0 })
  formVisible.value = true
}

function openEdit(row: IndustrySolution) {
  Object.assign(form, {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    schema_name: row.schema_name,
    icon: row.icon || '',
    status: row.status,
    sort: row.sort
  })
  formVisible.value = true
}

async function handleSave() {
  if (!form.code) {
    window.$message?.warning($t('page.industrySolution.form.codeRequired'))
    return
  }
  if (!form.name) {
    window.$message?.warning($t('page.industrySolution.form.nameRequired'))
    return
  }
  if (!/^sol_[a-z0-9_]+$/.test(form.schema_name)) {
    window.$message?.warning($t('page.industrySolution.form.schemaNameRule'))
    return
  }
  saving.value = true
  const res = await saveIndustrySolution({ ...form })
  saving.value = false
  if (res?.error) return
  window.$message?.success($t('page.industrySolution.saveSuccess'))
  formVisible.value = false
  await loadSolutions()
}

async function handleDelete(id: string) {
  const res = await deleteIndustrySolution(id)
  if (res?.error) return
  window.$message?.success($t('page.industrySolution.deleteSuccess'))
  await loadSolutions()
  await loadAssigned()
}

function openAssign() {
  if (!tenantId.value) {
    window.$message?.warning($t('page.industrySolution.assign.selectTenant'))
    return
  }
  assignCode.value = null
  assignVisible.value = true
}

async function handleAssign() {
  if (!tenantId.value || !assignCode.value) {
    window.$message?.warning($t('page.industrySolution.assign.selectSolution'))
    return
  }
  assigning.value = true
  const res = await assignTenantSolution({
    tenant_id: tenantId.value,
    solution_code: assignCode.value,
    enabled: 1
  })
  assigning.value = false
  if (res?.error) return
  window.$message?.success($t('page.industrySolution.assign.success'))
  assignVisible.value = false
  await loadAssigned()
}

async function toggleEnabled(row: TenantSolution, value: boolean) {
  const res = await assignTenantSolution({
    tenant_id: tenantId.value as string,
    solution_code: row.solution_code,
    enabled: value ? 1 : 0
  })
  if (res?.error) return
  window.$message?.success($t('page.industrySolution.assign.success'))
  await loadAssigned()
}

async function handleUnassign(code: string) {
  const res = await unassignTenantSolution(tenantId.value as string, code)
  if (res?.error) return
  window.$message?.success($t('page.industrySolution.assign.success'))
  await loadAssigned()
}

onMounted(async () => {
  await Promise.all([loadSolutions(), loadTenants()])
})
</script>

<template>
  <div class="industry-solution">
    <NCard :title="$t('page.industrySolution.dict')">
      <template #header-extra>
        <NButton type="primary" @click="openCreate">{{ $t('page.industrySolution.add') }}</NButton>
      </template>
      <NDataTable
        :columns="solutionColumns"
        :data="solutions"
        :loading="loadingSolutions"
        :row-key="(row: IndustrySolution) => row.id"
        :bordered="false"
      />
    </NCard>

    <NCard class="m-t4" :title="$t('page.industrySolution.assign.title')">
      <template #header-extra>
        <NSpace align="center">
          <NSelect
            v-model:value="tenantId"
            class="w-260px"
            :options="tenantOptions"
            :placeholder="$t('page.industrySolution.assign.tenant')"
            @update:value="loadAssigned"
          />
          <NButton type="primary" :disabled="!tenantId" @click="openAssign">
            {{ $t('page.industrySolution.assign.assignBtn') }}
          </NButton>
        </NSpace>
      </template>
      <NEmpty v-if="!tenantId" size="small" :description="$t('page.industrySolution.assign.selectTenant')" />
      <NDataTable
        v-else
        :columns="assignedColumns"
        :data="assigned"
        :loading="loadingAssigned"
        :row-key="(row: TenantSolution) => row.solution_code"
        :bordered="false"
      />
    </NCard>

    <NModal v-model:show="formVisible" preset="card" class="w-560px" :title="form.id ? $t('page.industrySolution.edit') : $t('page.industrySolution.add')">
      <NForm label-placement="left" label-width="110">
        <NFormItem :label="$t('page.industrySolution.form.code')">
          <NInput v-model:value.trim="form.code" :disabled="!!form.id" placeholder="pet_medical" />
        </NFormItem>
        <NFormItem :label="$t('page.industrySolution.form.name')">
          <NInput v-model:value.trim="form.name" :placeholder="$t('page.industrySolution.form.name')" />
        </NFormItem>
        <NFormItem :label="$t('page.industrySolution.form.schemaName')">
          <NInput v-model:value.trim="form.schema_name" placeholder="sol_pet_medical" />
        </NFormItem>
        <NFormItem :label="$t('page.industrySolution.form.description')">
          <NInput v-model:value.trim="form.description" type="textarea" :rows="2" />
        </NFormItem>
        <NFormItem :label="$t('page.industrySolution.form.icon')">
          <NInput v-model:value.trim="form.icon" placeholder="mdi:paw" />
        </NFormItem>
        <NFormItem :label="$t('page.industrySolution.form.sort')">
          <NInputNumber v-model:value="form.sort" :min="0" class="w-200px" />
        </NFormItem>
        <NFormItem :label="$t('page.industrySolution.form.status')">
          <NSwitch v-model:value="form.status" :checked-value="1" :unchecked-value="0" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="formVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">{{ $t('common.save') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="assignVisible" preset="card" class="w-460px" :title="$t('page.industrySolution.assign.assignBtn')">
      <NForm label-placement="left" label-width="90">
        <NFormItem :label="$t('page.industrySolution.col.name')">
          <NSelect
            v-model:value="assignCode"
            :options="assignableOptions"
            :placeholder="$t('page.industrySolution.assign.selectSolution')"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="assignVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="assigning" @click="handleAssign">{{ $t('common.save') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.industry-solution {
  padding: 0;
}
</style>
