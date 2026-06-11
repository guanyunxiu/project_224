<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { FlowNode, FlowEdge, FormField } from '@/types'
import { useUserStore } from '@/stores/user'
import ExpressionEditor from './ExpressionEditor.vue'

const props = defineProps<{
  node: FlowNode | null
  selectedEdge: FlowEdge | null
  formFields: FormField[]
}>()

const emit = defineEmits<{
  (e: 'update', node: FlowNode): void
  (e: 'updateEdge', edge: FlowEdge): void
}>()

const userStore = useUserStore()

const label = ref('')
const approverType = ref<'user' | 'role' | 'manager' | undefined>(undefined)
const approverIds = ref<string[]>([])
const gatewayType = ref<'split' | 'converge' | undefined>(undefined)
const conditionExpression = ref('')
const edgeLabel = ref('')

const isGatewayNode = computed(() =>
  props.node?.type === 'parallelGateway' || props.node?.type === 'conditionGateway'
)

const isConditionGateway = computed(() => props.node?.type === 'conditionGateway')

const showEdgePanel = computed(() => props.selectedEdge !== null)

watch(() => props.node, (newNode) => {
  if (newNode) {
    label.value = newNode.label
    approverType.value = newNode.data.approverType
    approverIds.value = newNode.data.approverIds ? [...newNode.data.approverIds] : []
    gatewayType.value = newNode.data.gatewayType
  }
}, { immediate: true })

watch(() => props.selectedEdge, (newEdge) => {
  if (newEdge) {
    conditionExpression.value = newEdge.conditionExpression || ''
    edgeLabel.value = newEdge.label || ''
  }
}, { immediate: true })

function onNodeUpdate() {
  if (!props.node) return
  const updated: FlowNode = {
    ...props.node,
    label: label.value,
    data: {
      ...props.node.data,
      label: label.value,
      approverType: props.node.type === 'approver' ? approverType.value : undefined,
      approverIds: props.node.type === 'approver' && approverType.value !== 'manager' ? approverIds.value : undefined,
      gatewayType: isGatewayNode.value ? gatewayType.value : undefined,
    },
  }
  emit('update', updated)
}

function onEdgeUpdate() {
  if (!props.selectedEdge) return
  const updated: FlowEdge = {
    ...props.selectedEdge,
    conditionExpression: conditionExpression.value || undefined,
    label: edgeLabel.value || undefined,
  }
  emit('updateEdge', updated)
}

const approverTypeOptions = [
  { value: 'user', label: '指定用户' },
  { value: 'role', label: '指定角色' },
  { value: 'manager', label: '发起人主管' },
]

const gatewayTypeOptions = [
  { value: 'split', label: '分裂（多路并行）' },
  { value: 'converge', label: '汇聚（等待全部完成）' },
]

const userOptions = userStore.userList.map(u => ({
  value: u.id,
  label: `${u.name} (${userStore.getRoleName(u.roleId)})`,
}))

const roleOptions = userStore.roleList.map(r => ({
  value: r.id,
  label: r.name,
}))

const nodeTypeLabel: Record<string, string> = {
  start: '开始',
  approver: '审批人',
  end: '结束',
  parallelGateway: '并行网关',
  conditionGateway: '条件网关',
}

const nodeTypeColor: Record<string, string> = {
  start: 'blue',
  approver: 'orange',
  end: 'green',
  parallelGateway: 'purple',
  conditionGateway: 'magenta',
}

const shouldShowConditionOnEdge = computed(() => {
  if (!props.selectedEdge) return false
  if (!props.node) return true
  return true
})
</script>

<template>
  <div class="property-panel">
    <div class="panel-title">属性面板</div>

    <div v-if="showEdgePanel" class="panel-body">
      <div class="section-header">连线属性</div>
      <a-form layout="vertical" @change="onEdgeUpdate">
        <a-form-item label="连线标签">
          <a-input v-model:value="edgeLabel" @change="onEdgeUpdate" placeholder="如: 金额大于10000" />
        </a-form-item>
        <a-form-item label="条件表达式">
          <ExpressionEditor
            v-model="conditionExpression"
            :form-fields="formFields"
            @update:model-value="onEdgeUpdate"
          />
        </a-form-item>
        <a-form-item>
          <a-alert message="条件网关出边需配置表达式，运行时走首个为 true 的边" type="info" show-icon />
        </a-form-item>
      </a-form>
    </div>

    <div v-else-if="node" class="panel-body">
      <a-form layout="vertical" @change="onNodeUpdate">
        <a-form-item label="节点类型">
          <a-tag :color="nodeTypeColor[node.type] || 'default'">
            {{ nodeTypeLabel[node.type] || node.type }}
          </a-tag>
        </a-form-item>

        <a-form-item label="节点名称">
          <a-input v-model:value="label" @change="onNodeUpdate" placeholder="请输入节点名称" />
        </a-form-item>

        <template v-if="node.type === 'approver'">
          <a-form-item label="审批人类型">
            <a-select
              v-model:value="approverType"
              :options="approverTypeOptions"
              placeholder="请选择审批人类型"
              @change="() => { approverIds = []; onNodeUpdate() }"
            />
          </a-form-item>

          <a-form-item v-if="approverType === 'user'" label="指定用户">
            <a-select
              v-model:value="approverIds"
              :options="userOptions"
              mode="multiple"
              placeholder="请选择用户"
              @change="onNodeUpdate"
            />
          </a-form-item>

          <a-form-item v-if="approverType === 'role'" label="指定角色">
            <a-select
              v-model:value="approverIds"
              :options="roleOptions"
              mode="multiple"
              placeholder="请选择角色"
              @change="onNodeUpdate"
            />
          </a-form-item>

          <a-form-item v-if="approverType === 'manager'">
            <a-alert message="系统将自动匹配发起人的主管作为审批人" type="info" show-icon />
          </a-form-item>
        </template>

        <template v-if="isGatewayNode">
          <a-form-item label="网关类型">
            <a-select
              v-model:value="gatewayType"
              :options="gatewayTypeOptions"
              placeholder="请选择网关类型"
              @change="onNodeUpdate"
            />
          </a-form-item>
          <a-form-item v-if="isConditionGateway && gatewayType === 'split'">
            <a-alert message="条件分裂网关：出边需配置条件表达式，运行时走首个为 true 的边" type="info" show-icon />
          </a-form-item>
          <a-form-item v-if="node.type === 'parallelGateway' && gatewayType === 'split'">
            <a-alert message="并行分裂网关：所有出边将同时执行" type="info" show-icon />
          </a-form-item>
          <a-form-item v-if="node.type === 'parallelGateway' && gatewayType === 'converge'">
            <a-alert message="并行汇聚网关：等待所有入边分支完成后才继续" type="info" show-icon />
          </a-form-item>
        </template>
      </a-form>
    </div>

    <div v-else class="panel-empty">
      <p>请在画布中选择一个节点或连线</p>
      <p class="panel-empty-sub">选中后可编辑属性</p>
    </div>
  </div>
</template>

<style scoped lang="less">
.property-panel {
  width: 300px;
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

.section-header {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
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
