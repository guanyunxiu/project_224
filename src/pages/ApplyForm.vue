<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useFlowStore } from '@/stores/flow'
import { useApplicationStore } from '@/stores/application'
import type { FormField } from '@/types'

const router = useRouter()
const flowStore = useFlowStore()
const applicationStore = useApplicationStore()

onMounted(() => {
  flowStore.initDefaultFlows()
})

const flowId = ref<string | undefined>(undefined)
const title = ref('')
const description = ref('')
const submitting = ref(false)
const formData = ref<Record<string, any>>({})

const publishedFlows = computed(() => flowStore.getPublishedFlows())
const flowOptions = computed(() => publishedFlows.value.map(f => ({ value: f.id, label: f.name })))

const selectedFlow = computed(() => {
  if (!flowId.value) return null
  return flowStore.getFlowById(flowId.value)
})

const formFields = computed<FormField[]>(() => {
  if (!selectedFlow.value) return []
  return selectedFlow.value.formFields || []
})

watch(flowId, () => {
  const data: Record<string, any> = {}
  formFields.value.forEach(f => {
    data[f.key] = f.defaultValue ?? (f.type === 'number' ? 0 : f.type === 'boolean' ? false : '')
  })
  formData.value = data
})

async function handleSubmit() {
  if (!flowId.value) {
    message.warning('请选择审批流程')
    return
  }
  if (!title.value.trim()) {
    message.warning('请输入申请标题')
    return
  }
  for (const field of formFields.value) {
    if (field.required) {
      const val = formData.value[field.key]
      if (val === undefined || val === null || val === '' || val === 0) {
        message.warning(`请填写${field.label}`)
        return
      }
    }
  }
  submitting.value = true
  try {
    const app = applicationStore.submitApplication(flowId.value, title.value, description.value, { ...formData.value })
    message.success('申请已提交')
    router.push(`/application/${app.id}`)
  } catch (e: any) {
    message.error(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <h2 class="page-title">发起申请</h2>
    <a-card class="apply-card" style="max-width: 640px">
      <a-form layout="vertical">
        <a-form-item label="审批流程" required>
          <a-select
            v-model:value="flowId"
            :options="flowOptions"
            placeholder="请选择已发布的审批流程"
            size="large"
          />
        </a-form-item>
        <a-form-item label="申请标题" required>
          <a-input
            v-model:value="title"
            placeholder="请输入申请标题"
            size="large"
            :maxlength="100"
          />
        </a-form-item>
        <a-form-item label="申请说明">
          <a-textarea
            v-model:value="description"
            placeholder="请输入申请说明（选填）"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>

        <template v-if="formFields.length > 0">
          <a-divider>表单字段</a-divider>
          <a-row :gutter="12">
            <a-col v-for="field in formFields" :key="field.key" :span="12">
              <a-form-item :label="field.label" :required="field.required">
                <template v-if="field.type === 'number'">
                  <a-input-number
                    v-model:value="formData[field.key]"
                    :placeholder="`请输入${field.label}`"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="field.type === 'boolean'">
                  <a-switch v-model:checked="formData[field.key]" />
                </template>
                <template v-else-if="field.type === 'select'">
                  <a-select
                    v-model:value="formData[field.key]"
                    :placeholder="`请选择${field.label}`"
                  >
                    <a-select-option v-for="opt in field.options" :key="opt" :value="opt">
                      {{ opt }}
                    </a-select-option>
                  </a-select>
                </template>
                <template v-else>
                  <a-input
                    v-model:value="formData[field.key]"
                    :placeholder="`请输入${field.label}`"
                  />
                </template>
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
              提交申请
            </a-button>
            <a-button size="large" @click="router.back()">
              取消
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
}

.apply-card {
  border-radius: 8px;
}
</style>
