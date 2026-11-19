<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NButton, NCard, NEmpty, NForm, NFormItem, NInput, NInputNumber, NSelect, NSpin } from 'naive-ui'
import { deviceList } from '@/service/api/device'
import { getPetProfile, putPetProfile } from '@/service/api/pet'
import { $t } from '@/locales'

const devices = ref<any[]>([])
const deviceId = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)

const deviceOptions = computed(() =>
  devices.value.map(item => ({
    label: item.name || item.device_number || item.id,
    value: item.id
  }))
)

const form = reactive({
  pet_name: '',
  breed: '',
  age: '',
  avatar: '',
  boarding_days: 0,
  shop_name: '',
  open_time: '',
  close_time: ''
})

async function loadProfile() {
  if (!deviceId.value) return
  loading.value = true
  const res = await getPetProfile({ device_id: deviceId.value })
  const data = res?.data
  Object.assign(form, {
    pet_name: data?.pet?.name || '',
    breed: data?.pet?.breed || '',
    age: data?.pet?.age || '',
    avatar: data?.pet?.avatar || '',
    boarding_days: data?.pet?.boarding_days || 0,
    shop_name: data?.shop?.name || '',
    open_time: data?.shop?.open_time || '',
    close_time: data?.shop?.close_time || ''
  })
  loading.value = false
}

async function loadDevices() {
  const res = await deviceList({ page: 1, page_size: 200 })
  devices.value = res?.data?.list || []
  if (devices.value.length) {
    deviceId.value = devices.value[0].id
    await loadProfile()
  }
}

async function handleSave() {
  if (!deviceId.value) {
    window.$message?.warning($t('page.pet.common.selectDevice'))
    return
  }
  saving.value = true
  const res = await putPetProfile({ device_id: deviceId.value, ...form })
  saving.value = false
  if (res?.error) return
  window.$message?.success($t('page.pet.profile.saveSuccess'))
  loadProfile()
}

onMounted(loadDevices)
</script>

<template>
  <div>
    <NCard>
      <div class="pet-header">
        <div class="pet-title">{{ $t('page.pet.profile.title') }}</div>
        <div class="pet-toolbar">
          <NSelect
            v-model:value="deviceId"
            class="w-260px"
            :options="deviceOptions"
            :placeholder="$t('page.pet.common.selectDevice')"
            @update:value="loadProfile"
          />
        </div>
      </div>

      <NEmpty v-if="!deviceOptions.length" size="small" :description="$t('page.pet.common.noDevice')" />

      <NSpin v-else :show="loading">
        <NForm label-placement="left" label-width="120" class="m-t4">
          <NFormItem :label="$t('page.pet.profile.petName')">
            <NInput v-model:value.trim="form.pet_name" :placeholder="$t('page.pet.profile.petNamePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.breed')">
            <NInput v-model:value.trim="form.breed" placeholder="柯基 / 金毛" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.age')">
            <NInput v-model:value.trim="form.age" placeholder="2 岁" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.avatar')">
            <NInput v-model:value.trim="form.avatar" placeholder="https://..." />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.boardingDays')">
            <NInputNumber v-model:value="form.boarding_days" :min="0" class="w-200px" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.shopName')">
            <NInput v-model:value.trim="form.shop_name" :placeholder="$t('page.pet.profile.shopNamePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.openTime')">
            <NInput v-model:value.trim="form.open_time" placeholder="08:00" class="w-200px" />
          </NFormItem>
          <NFormItem :label="$t('page.pet.profile.closeTime')">
            <NInput v-model:value.trim="form.close_time" placeholder="21:00" class="w-200px" />
          </NFormItem>
          <NFormItem :label="' '">
            <NButton type="primary" :loading="saving" @click="handleSave">
              {{ $t('common.save') }}
            </NButton>
          </NFormItem>
        </NForm>
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
  justify-content: flex-start;
  min-height: 36px;
  margin-top: 12px;
}
</style>
