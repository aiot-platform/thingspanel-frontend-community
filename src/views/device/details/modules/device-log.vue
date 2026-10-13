<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { NButton, NDataTable, NDatePicker, NEmpty, NInput, NSelect, NTag, NText } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import dayjs from 'dayjs'
import { useLoading } from '@sa/hooks'
import { deviceLogList } from '@/service/api/device'
import { $t } from '@/locales'

/** 设备统一日志（device_log）：上下行报文与上下线 */
interface DeviceLogItem {
  ts: string
  msg_type: string
  direction: 'up' | 'down'
  message_id?: string | null
  status?: string | null
  error?: string | null
  payload?: unknown
}

/**
 * id：设备ID（为空时不查询）
 * tenantId：系统管理员查询时必传（租户侧不传，后端按登录租户隔离）
 * requireTarget：为 true 时未选设备点搜索会提示（系统管理-设备日志查询页使用）
 */
const props = defineProps<{ id: string; tenantId?: string; requireTarget?: boolean }>()

const { loading, startLoading, endLoading } = useLoading()
const tableData = ref<DeviceLogItem[]>([])
const dateRange = ref<[number, number] | null>(null)

const query = reactive({
  msg_type: null as string | null,
  direction: null as 'up' | 'down' | null,
  keyword: ''
})

const typeLabels: Record<string, () => string> = {
  telemetry: () => $t('custom.device_details.logTypeTelemetry'),
  attribute: () => $t('custom.device_details.logTypeAttribute'),
  event: () => $t('custom.device_details.logTypeEvent'),
  status: () => $t('custom.device_details.logTypeStatus'),
  telemetry_control: () => $t('custom.device_details.logTypeTelemetryControl'),
  attribute_set: () => $t('custom.device_details.logTypeAttributeSet'),
  attribute_get: () => $t('custom.device_details.logTypeAttributeGet'),
  command: () => $t('custom.device_details.logTypeCommand'),
  command_response: () => $t('custom.device_details.logTypeCommandResponse'),
  attribute_set_response: () => $t('custom.device_details.logTypeAttributeSetResponse')
}
const typeOptions = Object.keys(typeLabels).map(value => ({ label: typeLabels[value](), value }))
const directionOptions = [
  { label: $t('custom.device_details.logUp'), value: 'up' },
  { label: $t('custom.device_details.logDown'), value: 'down' }
]

const statusTag = (status?: string | null) => {
  if (!status) return null
  // 上下线记录不填 status（上线/下线见报文 {"status":1|0}），其余为 ok / failed
  const map: Record<string, { type: 'success' | 'error' | 'default'; text: () => string }> = {
    ok: { type: 'success', text: () => $t('custom.device_details.logResultOk') },
    failed: { type: 'error', text: () => $t('custom.device_details.logResultFailed') }
  }
  const item = map[status]
  return h(NTag, { size: 'small', type: item?.type || 'default' }, { default: () => item?.text() || status })
}

const stringify = (value: unknown, pretty = false) => {
  if (value === undefined || value === null) return ''
  try {
    return JSON.stringify(value, null, pretty ? 2 : 0)
  } catch {
    return String(value)
  }
}

const columns: DataTableColumns<DeviceLogItem> = [
  {
    type: 'expand',
    renderExpand: row =>
      h('div', { class: 'log-expand' }, [
        row.error ? h(NText, { type: 'error', class: 'log-error' }, { default: () => row.error }) : null,
        h('pre', { class: 'log-payload' }, stringify(row.payload, true) || '--')
      ])
  },
  {
    title: $t('common.time'),
    key: 'ts',
    width: 190,
    render: row => dayjs(row.ts).format('YYYY-MM-DD HH:mm:ss.SSS')
  },
  {
    title: $t('custom.device_details.logDirection'),
    key: 'direction',
    width: 90,
    render: row =>
      h(
        NTag,
        { size: 'small', type: row.direction === 'up' ? 'info' : 'warning', bordered: false },
        { default: () => (row.direction === 'up' ? $t('custom.device_details.logUp') : $t('custom.device_details.logDown')) }
      )
  },
  {
    title: $t('custom.device_details.logMsgType'),
    key: 'msg_type',
    width: 130,
    render: row => typeLabels[row.msg_type]?.() || row.msg_type
  },
  {
    title: $t('custom.device_details.messageId'),
    key: 'message_id',
    width: 140,
    ellipsis: { tooltip: true },
    render: row => row.message_id || '--'
  },
  {
    title: $t('common.status'),
    key: 'status',
    width: 90,
    render: row => statusTag(row.status) || '--'
  },
  {
    title: $t('custom.device_details.logPayload'),
    key: 'payload',
    minWidth: 260,
    ellipsis: { tooltip: true },
    render: row => stringify(row.payload) || '--'
  }
]

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    fetchData()
  }
})

const fetchData = async () => {
  if (!props.id) {
    tableData.value = []
    pagination.itemCount = 0
    return
  }
  startLoading()
  try {
    const params: Parameters<typeof deviceLogList>[0] = {
      device_id: props.id,
      page: pagination.page as number,
      page_size: pagination.pageSize as number
    }
    if (props.tenantId) params.tenant_id = props.tenantId
    if (query.msg_type) params.msg_type = query.msg_type
    if (query.direction) params.direction = query.direction
    if (query.keyword.trim()) params.keyword = query.keyword.trim()
    if (dateRange.value) {
      params.start_time = Math.floor(dateRange.value[0] / 1000)
      params.end_time = Math.floor(dateRange.value[1] / 1000)
    }
    const { data, error } = await deviceLogList(params)
    if (!error && data) {
      tableData.value = data.list ?? []
      pagination.itemCount = data.total ?? 0
    }
  } finally {
    endLoading()
  }
}

const handleSearch = () => {
  if (props.requireTarget && !props.id) {
    window.$message?.warning($t('custom.device_details.logSelectRequired'))
    return
  }
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  dateRange.value = null
  query.msg_type = null
  query.direction = null
  query.keyword = ''
  handleSearch()
}

const rowKey = (row: DeviceLogItem) => `${row.ts}-${row.msg_type}-${row.message_id ?? ''}`

onMounted(fetchData)
// 设备切换后从第一页重新查询（清空设备时清空表格）
watch(
  () => [props.id, props.tenantId],
  () => {
    pagination.page = 1
    fetchData()
  }
)
</script>

<template>
  <div class="device-log">
    <div class="log-filter">
      <!-- 前置筛选项（如系统管理页的租户、设备选择） -->
      <slot name="prefix" />
      <NDatePicker v-model:value="dateRange" type="datetimerange" clearable class="log-filter__date" />
      <NSelect
        v-model:value="query.direction"
        :options="directionOptions"
        :placeholder="$t('custom.device_details.logDirection')"
        clearable
        class="log-filter__direction"
      />
      <NSelect
        v-model:value="query.msg_type"
        :options="typeOptions"
        :placeholder="$t('custom.device_details.logMsgType')"
        clearable
        class="log-filter__type"
      />
      <NInput
        v-model:value="query.keyword"
        :placeholder="$t('custom.device_details.logKeyword')"
        clearable
        class="log-filter__keyword"
        @keydown.enter="handleSearch"
      />
      <NButton type="primary" @click="handleSearch">{{ $t('common.search') }}</NButton>
      <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
      <NText depth="3" class="log-filter__hint">{{ $t('custom.device_details.logRetentionHint') }}</NText>
    </div>

    <NDataTable
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :pagination="pagination"
      :row-key="rowKey"
      :scroll-x="1100"
      size="small"
      remote
      bordered
    >
      <template #empty>
        <NEmpty size="small" :description="$t('common.noData')" />
      </template>
    </NDataTable>
  </div>
</template>

<style scoped lang="scss">
/* 筛选条一行排布：控件固定宽度，关键字占剩余空间；窄屏时自动换行 */
.log-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.log-filter__date {
  flex: 0 0 340px;
  width: 340px;
}

.log-filter__direction {
  flex: 0 0 110px;
  width: 110px;
}

.log-filter__type {
  flex: 0 0 150px;
  width: 150px;
}

.log-filter__keyword {
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 360px;
}

.log-filter__hint {
  margin-left: auto;
  font-size: 12px;
  white-space: nowrap;
}

.log-expand {
  padding: 4px 8px;
}

.log-error {
  display: block;
  margin-bottom: 6px;
}

.log-payload {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
