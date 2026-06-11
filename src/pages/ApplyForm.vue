<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useFlowStore } from '@/stores/flow'
import { useApplicationStore } from '@/stores/application'

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

const publishedFlows = computed(() => flowStore.getPublishedFlows())
const flowOptions = computed(() => publishedFlows.value.map(f => ({ value: f.id, label: f.name })))

async function handleSubmit() {
  if (!flowId.value) {
    message.warning('请选择审批流程')
    return
  }
  if (!title.value.trim()) {
    message.warning('请输入申请标题')
    return
  }
  submitting.value = true
  try {
    const app = applicationStore.submitApplication(flowId.value, title.value, description.value)
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
