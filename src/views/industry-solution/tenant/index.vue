<script setup lang="tsx">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
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
  getIndustrySolutions,
  getTenantSolutions,
  unassignTenantSolution
} from '@/service/api/industry-solution'
import type { IndustrySolution, TenantSolution } from '@/service/api/industry-solution'
import { getTenantTree, saveTenant } from '@/service/api/tenant'
import type { TenantNode } from '@/service/api/tenant'
import { $t } from '@/locales'
import { tableThemeOverrides } from '@/utils/table-theme'

const tree = ref<TenantNode[]>([])
const loadingTree = ref(false)
const selected = ref<TenantNode | null>(null)

const solutions = ref<IndustrySolution[]>([])
const assigned = ref<TenantSolution[]>([])
const loadingAssigned = ref(false)

/** 新增/编辑节点弹窗 */
const nodeVisible = ref(false)
const savingNode = ref(false)
const nodeForm = reactive({
  id: '',
  parent_id: '',
  name: '',
  role: 'store' as string
})

/** 分配方案弹窗 */
const assignVisible = ref(false)
const assigning = ref(false)
const assignForm = reactive({ solution_code: null as string | null, cascade: false })

const roleOptions = computed(() => [
  { label: $t('page.pet.tenant.role.dealer'), value: 'dealer' },
  { label: $t('page.pet.tenant.role.hospital'), value: 'hospital' },
  { label: $t('page.pet.tenant.role.store'), value: 'store' },
  { label: $t('page.pet.tenant.role.tenant'), value: 'tenant' }
])

function roleLabel(role: string) {
  return roleOptions.value.find(item => item.value === role)?.label || role
}

const targetLabel = computed(() =>
  selected.value
    ? `${$t('page.pet.tenant.targetTenant')}: ${selected.value.name}`
    : $t('page.pet.tenant.selectNode')
)

const assignedCodes = computed(() => new Set(assigned.value.map(item => item.solution_code)))
const assignableOptions = computed(() =>
  solutions.value
    .filter(item => !assignedCodes.value.has(item.code))
    .map(item => ({ label: `${item.name} (${item.code})`, value: item.code }))
)

async function loadTree() {
  loadingTree.value = true
  const res = await getTenantTree()
  tree.value = res?.data || []
  loadingTree.value = false
}

async function loadSolutions() {
  const res = await getIndustrySolutions()
  solutions.value = res?.data || []
}

async function loadAssigned() {
  if (!selected.value) {
    assigned.value = []
    return
  }
  loadingAssigned.value = true
  const res = await getTenantSolutions({ tenant_id: selected.value.tenant_id })
  assigned.value = res?.data || []
  loadingAssigned.value = false
}

function selectNode(row: TenantNode) {
  selected.value = row
  loadAssigned()
}

function openCreateRoot() {
  Object.assign(nodeForm, { id: '', parent_id: '', name: '', role: 'dealer' })
  nodeVisible.value = true
}

function openCreateChild(row: TenantNode) {
  Object.assign(nodeForm, { id: '', parent_id: row.tenant_id, name: '', role: 'store' })
  nodeVisible.value = true
}

function openEdit(row: TenantNode) {
  Object.assign(nodeForm, {
    id: row.tenant_id,
    parent_id: row.parent_id || '',
    name: row.name,
    role: row.role || 'store'
  })
  nodeVisible.value = true
}

async function handleSaveNode() {
  if (!nodeForm.name) {
    window.$message?.warning($t('page.pet.tenant.nameRequired'))
    return
  }
  savingNode.value = true
  const res = await saveTenant({
    id: nodeForm.id || undefined,
    parent_id: nodeForm.parent_id || undefined,
    name: nodeForm.name,
    role: nodeForm.role
  })
  savingNode.value = false
  if (res?.error) return
  window.$message?.success($t('page.pet.common.saveSuccess'))
  nodeVisible.value = false
  await loadTree()
  if (selected.value) {
    await loadAssigned()
  }
}

function openAssign() {
  if (!selected.value) {
    window.$message?.warning($t('page.pet.tenant.selectNode'))
    return
  }
  assignForm.solution_code = null
  assignForm.cascade = false
  assignVisible.value = true
}

async function handleAssign() {
  if (!selected.value || !assignForm.solution_code) {
    window.$message?.warning($t('page.pet.tenant.selectSolution'))
    return
  }
  assigning.value = true
  const res = await assignTenantSolution({
    tenant_id: selected.value.tenant_id,
    solution_code: assignForm.solution_code,
    enabled: 1,
    cascade: assignForm.cascade
  })
  assigning.value = false
  if (res?.error) return
  window.$message?.success($t('page.pet.tenant.assignSuccess'))
  assignVisible.value = false
  await loadAssigned()
}

async function handleUnassign(code: string) {
  if (!selected.value) return
  const res = await unassignTenantSolution(selected.value.tenant_id, code)
  if (res?.error) return
  window.$message?.success($t('page.pet.tenant.assignSuccess'))
  await loadAssigned()
}

const treeColumns = computed(
  () =>
    [
      { key: 'name', title: $t('page.pet.tenant.col.name'), align: 'left', minWidth: '220px' },
      {
        key: 'role',
        title: $t('page.pet.tenant.col.role'),
        align: 'left',
        width: '140px',
        render: (row: TenantNode) =>
          h(NTag, { size: 'small', type: row.tenant_id === selected.value?.tenant_id ? 'info' : 'default' }, {
            default: () => roleLabel(row.role)
          })
      },
      {
        key: 'actions',
        title: $t('common.actions'),
        align: 'left',
        width: '240px',
        render: (row: TenantNode) => (
          <NSpace justify={'start'}>
            <NButton size={'small'} onClick={() => openCreateChild(row)}>
              {$t('page.pet.tenant.addChild')}
            </NButton>
            <NButton size={'small'} type="primary" onClick={() => openEdit(row)}>
              {$t('common.edit')}
            </NButton>
            <NButton size={'small'} onClick={() => selectNode(row)}>
              {$t('page.pet.tenant.setTarget')}
            </NButton>
          </NSpace>
        )
      }
    ] as DataTableColumns<TenantNode>
) as Ref<DataTableColumns<TenantNode>>

const assignedColumns = computed(
  () =>
    [
      { key: 'solution_code', title: $t('page.pet.tenant.col.solution'), align: 'left', minWidth: '160px' },
      { key: 'device_count', title: $t('page.pet.tenant.col.deviceCount'), align: 'left', width: '120px' },
      {
        key: 'actions',
        title: $t('common.actions'),
        align: 'left',
        width: '120px',
        render: (row: TenantSolution) => (
          <NPopconfirm onPositiveClick={() => handleUnassign(row.solution_code)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" size={'small'}>
                  {$t('page.pet.tenant.remove')}
                </NButton>
              )
            }}
          </NPopconfirm>
        )
      }
    ] as DataTableColumns<TenantSolution>
) as Ref<DataTableColumns<TenantSolution>>

onMounted(async () => {
  await Promise.all([loadTree(), loadSolutions()])
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <NCard :title="$t('page.pet.tenant.treeTitle')">
      <template #header-extra>
        <NButton type="primary" @click="openCreateRoot">{{ $t('page.pet.tenant.addRoot') }}</NButton>
      </template>
      <NDataTable
        class="thingspanel-data-table"
        size="medium"
        :theme-overrides="tableThemeOverrides"
        :bordered="true"
        :bottom-bordered="true"
        :single-line="true"
        :striped="false"
        :row-key="(row: TenantNode) => row.tenant_id"
        :children-key="'children'"
        :columns="treeColumns"
        :data="tree"
        :loading="loadingTree"
      >
        <template #empty>
          <NEmpty size="small" :description="$t('common.noData')" />
        </template>
      </NDataTable>
    </NCard>

    <NCard :title="$t('page.pet.tenant.assignTitle')">
      <template #header-extra>
        <NSpace align="center">
          <span class="tenant-hint">
            {{ targetLabel }}
          </span>
          <NButton type="primary" :disabled="!selected" @click="openAssign">
            {{ $t('page.pet.tenant.assignBtn') }}
          </NButton>
        </NSpace>
      </template>
      <NDataTable
        v-if="selected"
        class="thingspanel-data-table"
        size="medium"
        :theme-overrides="tableThemeOverrides"
        :bordered="true"
        :bottom-bordered="true"
        :single-line="true"
        :striped="false"
        :row-key="(row: TenantSolution) => row.solution_code"
        :columns="assignedColumns"
        :data="assigned"
        :loading="loadingAssigned"
      >
        <template #empty>
          <NEmpty size="small" :description="$t('common.noData')" />
        </template>
      </NDataTable>
      <NEmpty v-else size="small" :description="$t('page.pet.tenant.selectNode')" />
    </NCard>

    <NModal v-model:show="nodeVisible" preset="card" class="w-520px" :title="$t('page.pet.tenant.nodeTitle')">
      <NForm label-placement="left" label-width="100">
        <NFormItem :label="$t('page.pet.tenant.col.name')">
          <NInput v-model:value.trim="nodeForm.name" />
        </NFormItem>
        <NFormItem :label="$t('page.pet.tenant.col.role')">
          <NSelect v-model:value="nodeForm.role" :options="roleOptions" />
        </NFormItem>
        <NFormItem :label="$t('page.pet.tenant.parentLabel')">
          <NInput v-model:value.trim="nodeForm.parent_id" :disabled="!!nodeForm.id" placeholder="-" />
        </NFormItem>
      </NForm>
      <div class="flex justify-end gap-3">
        <NButton @click="nodeVisible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="savingNode" @click="handleSaveNode">{{ $t('common.confirm') }}</NButton>
      </div>
    </NModal>

    <NModal v-model:show="assignVisible" preset="card" class="w-520px" :title="$t('page.pet.tenant.assignBtn')">
      <NForm label-placement="left" label-width="120">
        <NFormItem :label="$t('page.pet.tenant.col.solution')">
          <NSelect
            v-model:value="assignForm.solution_code"
            :options="assignableOptions"
            :placeholder="$t('page.pet.tenant.selectSolution')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.pet.tenant.cascade')">
          <NSwitch v-model:value="assignForm.cascade" />
        </NFormItem>
      </NForm>
      <div class="flex justify-end gap-3">
        <NButton @click="assignVisible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="assigning" @click="handleAssign">{{ $t('common.confirm') }}</NButton>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.tenant-hint {
  color: var(--text-color-3);
  font-size: 13px;
}
</style>
