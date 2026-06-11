<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FlowNode } from '@/types'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  node: FlowNode | null
}>()

const emit = defineEmits<{
  (e: 'update', node: FlowNode): void
}>()

const userStore = useUserStore()

const label = ref('')
const approverType = ref<'user' | 'role' | 'manager' | undefined>(undefined)
const approverIds = ref<string[]>([])

watch(() => props.node, (newNode) => {
  if (newNode) {
    label.value = newNode.label
    approverType.value = newNode.data.approverType
    approverIds.value = newNode.data.approverIds ? [...newNode.data.approverIds] : []
  }
}, { immediate: true })

function onUpdate() {
  if (!props.node) return
  const updated: FlowNode = {
    ...props.node,
    label: label.value,
    data: {
      ...props.node.data,
      label: label.value,
      approverType: props.node.type === 'approver' ? approverType.value : undefined,
      approverIds: props.node.type === 'approver' && approverType.value !== 'manager' ? approverIds.value : undefined,
    },
  }
  emit('update', updated)
}

const approverTypeOptions = [
  { value: 'user', label: '指定用户' },
  { value: 'role', label: '指定角色' },
  { value: 'manager', label: '发起人主管' },
]

const userOptions = userStore.userList.map(u => ({
  value: u.id,
  label: `${u.name} (${userStore.getRoleName(u.roleId)})`,
}))

const roleOptions = userStore.roleList.map(r => ({
  value: r.id,
  label: r.name,
}))
</script>

<template>
  <div class="property-panel">
    <div class="panel-title">节点属性</div>
    <div v-if="node" class="panel-body">
      <a-form layout="vertical" @change="onUpdate">
        <a-form-item label="节点类型">
          <a-tag :color="node.type === 'start' ? 'blue' : node.type === 'approver' ? 'orange' : 'green'">
            {{ node.type === 'start' ? '开始' : node.type === 'approver' ? '审批人' : '结束' }}
          </a-tag>
        </a-form-item>

        <a-form-item label="节点名称">
          <a-input v-model:value="label" @change="onUpdate" placeholder="请输入节点名称" />
        </a-form-item>

        <template v-if="node.type === 'approver'">
          <a-form-item label="审批人类型">
            <a-select
              v-model:value="approverType"
              :options="approverTypeOptions"
              placeholder="请选择审批人类型"
              @change="() => { approverIds = []; onUpdate() }"
            />
          </a-form-item>

          <a-form-item v-if="approverType === 'user'" label="指定用户">
            <a-select
              v-model:value="approverIds"
              :options="userOptions"
              mode="multiple"
              placeholder="请选择用户"
              @change="onUpdate"
            />
          </a-form-item>

          <a-form-item v-if="approverType === 'role'" label="指定角色">
            <a-select
              v-model:value="approverIds"
              :options="roleOptions"
              mode="multiple"
              placeholder="请选择角色"
              @change="onUpdate"
            />
          </a-form-item>

          <a-form-item v-if="approverType === 'manager'">
            <a-alert message="系统将自动匹配发起人的主管作为审批人" type="info" show-icon />
          </a-form-item>
        </template>
      </a-form>
    </div>
    <div v-else class="panel-empty">
      <p>请在画布中选择一个节点</p>
      <p class="panel-empty-sub">选中后可编辑节点属性</p>
    </div>
  </div>
</template>

<style scoped lang="less">
.property-panel {
  width: 280px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
}

.panel-title {
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  border-bottom: 1px solid #f0f0f0;
}

.panel-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.25);
  font-size: 14px;

  p {
    margin: 0;
  }
}

.panel-empty-sub {
  font-size: 12px;
  margin-top: 4px !important;
}
</style>
