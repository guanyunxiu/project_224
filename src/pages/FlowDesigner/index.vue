<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { message } from 'ant-design-vue'
import {
  SaveOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import type { FlowNode, FlowEdge, FormField } from '@/types'
import type { Node, Edge } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { useFlowValidation } from '@/composables/useFlowValidation'
import StartNode from './nodes/StartNode.vue'
import ApproverNode from './nodes/ApproverNode.vue'
import EndNode from './nodes/EndNode.vue'
import GatewayNode from './nodes/GatewayNode.vue'
import NodePanel from './NodePanel.vue'
import PropertyPanel from './PropertyPanel.vue'
import FlowSimulator from './FlowSimulator.vue'

const route = useRoute()
const router = useRouter()
const flowStore = useFlowStore()
const { validate } = useFlowValidation()

const flowId = computed(() => route.params.id as string)
const flow = computed(() => flowStore.getFlowById(flowId.value))

const nodeTypes = {
  start: markRaw(StartNode),
  approver: markRaw(ApproverNode),
  end: markRaw(EndNode),
  parallelGateway: markRaw(GatewayNode),
  conditionGateway: markRaw(GatewayNode),
}

const { onConnect, addEdges, project, vueFlowRef, addNodes, updateNodeData, onNodesChange, onEdgesChange, applyNodeChanges, applyEdgeChanges, updateEdgeData } = useVueFlow({
  id: flowId.value,
})

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const selectedNode = ref<FlowNode | null>(null)
const selectedEdge = ref<FlowEdge | null>(null)
const simulatorVisible = ref(false)
const formFields = ref<FormField[]>([])

const formFieldVisible = ref(false)
const editingField = ref<FormField | null>(null)
const fieldFormKey = ref('')
const fieldFormLabel = ref('')
const fieldFormType = ref<'number' | 'string' | 'boolean' | 'select'>('string')
const fieldFormOptions = ref('')
const fieldFormRequired = ref(false)

onMounted(() => {
  flowStore.initDefaultFlows()
  if (flow.value) {
    nodes.value = flow.value.nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
      position: { ...n.position },
      data: { ...n.data },
    }))
    edges.value = flow.value.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: true,
      label: e.label || undefined,
      data: { conditionExpression: e.conditionExpression },
    }))
    formFields.value = flow.value.formFields ? [...flow.value.formFields] : []
  }
})

onConnect((params) => {
  addEdges({
    ...params,
    type: 'smoothstep',
    animated: true,
  })
})

onNodesChange((changes) => {
  applyNodeChanges(changes)
})

onEdgesChange((changes) => {
  applyEdgeChanges(changes)
})

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData('application/vueflow') as string
  if (!type) return

  const { left, top } = (vueFlowRef.value as HTMLElement).getBoundingClientRect()
  const position = project({ x: event.clientX - left, y: event.clientY - top })

  const labelMap: Record<string, string> = {
    start: '开始',
    approver: '审批人',
    end: '结束',
    parallelGateway: '并行网关',
    conditionGateway: '条件网关',
  }

  const dataMap: Record<string, any> = {
    parallelGateway: { label: '并行网关', gatewayType: 'split' },
    conditionGateway: { label: '条件网关', gatewayType: 'split' },
  }

  const newNode: Node = {
    id: `node-${Date.now()}`,
    type,
    position,
    data: dataMap[type] || { label: labelMap[type] || type },
    label: labelMap[type] || type,
  }

  addNodes(newNode)
}

function getNodeLabel(node: Node): string {
  const dataLabel = node.data?.label
  if (typeof dataLabel === 'string' && dataLabel) return dataLabel
  const nodeLabel = node.label
  if (typeof nodeLabel === 'string' && nodeLabel) return nodeLabel
  return ''
}

function onNodeClick({ node }: { node: Node }) {
  selectedEdge.value = null
  const flowNode: FlowNode = {
    id: node.id,
    type: (node.type as any) || 'approver',
    label: node.data?.label || node.label || '',
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data?.label || node.label || '',
      approverType: (node.data?.approverType ?? undefined) as any,
      approverIds: node.data?.approverIds as string[] | undefined,
      gatewayType: node.data?.gatewayType as 'split' | 'converge' | undefined,
    },
  }
  selectedNode.value = flowNode
}

function onEdgeClick({ edge }: { edge: Edge }) {
  selectedNode.value = null
  const flowEdge: FlowEdge = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    conditionExpression: edge.data?.conditionExpression,
    label: edge.label as string | undefined,
  }
  selectedEdge.value = flowEdge
}

function onPaneClick() {
  selectedNode.value = null
  selectedEdge.value = null
}

function onPropertyUpdate(updatedNode: FlowNode) {
  selectedNode.value = updatedNode
  updateNodeData(updatedNode.id, {
    label: updatedNode.data.label,
    approverType: updatedNode.data.approverType,
    approverIds: updatedNode.data.approverIds,
    gatewayType: updatedNode.data.gatewayType,
  })
}

function onEdgePropertyUpdate(updatedEdge: FlowEdge) {
  selectedEdge.value = updatedEdge
  const edgeIndex = edges.value.findIndex(e => e.id === updatedEdge.id)
  if (edgeIndex !== -1) {
    edges.value[edgeIndex] = {
      ...edges.value[edgeIndex],
      label: updatedEdge.label || undefined,
      data: {
        ...edges.value[edgeIndex].data,
        conditionExpression: updatedEdge.conditionExpression,
      },
    }
  }
}

function buildFlowNodeFromVueFlow(n: any): FlowNode {
  return {
    id: n.id,
    type: (n.type as any) || 'approver',
    label: getNodeLabel(n as Node),
    position: { x: n.position.x, y: n.position.y },
    data: {
      label: getNodeLabel(n as Node),
      approverType: (n.data?.approverType ?? undefined) as any,
      approverIds: n.data?.approverIds as string[] | undefined,
      gatewayType: n.data?.gatewayType as 'split' | 'converge' | undefined,
    },
  }
}

function convertNodesToFlowNodes(nodeList: any[]): FlowNode[] {
  return nodeList.map(n => buildFlowNodeFromVueFlow(n))
}

function convertEdgesToFlowEdges(edgeList: any[]): FlowEdge[] {
  return edgeList.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    conditionExpression: e.data?.conditionExpression as string | undefined,
    label: (typeof e.label === 'string' ? e.label : undefined) as string | undefined,
  }))
}

function syncToStore() {
  const flowNodes = convertNodesToFlowNodes(nodes.value)
  const flowEdges = convertEdgesToFlowEdges(edges.value)
  flowStore.updateFlowNodes(flowId.value, flowNodes)
  flowStore.updateFlowEdges(flowId.value, flowEdges)
  flowStore.updateFlowFormFields(flowId.value, formFields.value)
}

function handleSave() {
  syncToStore()
  message.success('保存成功')
}

function handleValidate() {
  const flowNodes = convertNodesToFlowNodes(nodes.value)
  const flowEdges = convertEdgesToFlowEdges(edges.value)
  const result = validate(flowNodes, flowEdges)
  if (result.valid) {
    message.success('校验通过')
  } else {
    result.errors.forEach(err => message.error(err))
  }
  return result
}

function handlePublish() {
  const flowNodes = convertNodesToFlowNodes(nodes.value)
  const flowEdges = convertEdgesToFlowEdges(edges.value)
  const result = validate(flowNodes, flowEdges)
  if (!result.valid) {
    result.errors.forEach(err => message.error(err))
    return
  }
  syncToStore()
  flowStore.publishFlow(flowId.value)
  message.success('发布成功')
  router.push('/flows')
}

function goBack() {
  syncToStore()
  router.push('/flows')
}

function openFieldModal(field?: FormField) {
  if (field) {
    editingField.value = field
    fieldFormKey.value = field.key
    fieldFormLabel.value = field.label
    fieldFormType.value = field.type
    fieldFormOptions.value = field.options?.join(', ') || ''
    fieldFormRequired.value = field.required || false
  } else {
    editingField.value = null
    fieldFormKey.value = ''
    fieldFormLabel.value = ''
    fieldFormType.value = 'string'
    fieldFormOptions.value = ''
    fieldFormRequired.value = false
  }
  formFieldVisible.value = true
}

function saveField() {
  if (!fieldFormKey.value.trim() || !fieldFormLabel.value.trim()) {
    message.warning('请填写字段标识和名称')
    return
  }
  const field: FormField = {
    key: fieldFormKey.value.trim(),
    label: fieldFormLabel.value.trim(),
    type: fieldFormType.value,
    required: fieldFormRequired.value,
  }
  if (fieldFormType.value === 'select' && fieldFormOptions.value.trim()) {
    field.options = fieldFormOptions.value.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (editingField.value) {
    const idx = formFields.value.findIndex(f => f.key === editingField.value!.key)
    if (idx !== -1) formFields.value[idx] = field
  } else {
    if (formFields.value.some(f => f.key === field.key)) {
      message.warning('字段标识已存在')
      return
    }
    formFields.value.push(field)
  }
  formFieldVisible.value = false
}

function deleteField(key: string) {
  formFields.value = formFields.value.filter(f => f.key !== key)
}
</script>

<template>
  <div class="designer-page" v-if="flow">
    <div class="designer-toolbar">
      <a-space>
        <a-button @click="goBack">
          <ArrowLeftOutlined />
          返回
        </a-button>
        <a-divider type="vertical" />
        <span class="flow-name">{{ flow.name }}</span>
        <a-tag :color="flow.status === 'published' ? 'green' : 'default'">
          {{ flow.status === 'published' ? '已发布' : '草稿' }}
        </a-tag>
      </a-space>
      <a-space>
        <a-button @click="formFieldVisible = true; editingField = null; fieldFormKey = ''; fieldFormLabel = ''; fieldFormType = 'string'; fieldFormOptions = ''; fieldFormRequired = false">
          <PlusOutlined />
          表单字段
        </a-button>
        <a-button @click="simulatorVisible = true">
          <EyeOutlined />
          模拟预览
        </a-button>
        <a-button @click="handleValidate">
          <CheckCircleOutlined />
          校验
        </a-button>
        <a-button type="primary" ghost @click="handleSave">
          <SaveOutlined />
          保存
        </a-button>
        <a-button type="primary" @click="handlePublish" :disabled="flow.status === 'published'">
          <SendOutlined />
          发布
        </a-button>
      </a-space>
    </div>
    <div class="designer-body">
      <NodePanel />
      <div
        class="designer-canvas"
        @dragover="onDragOver"
        @drop="onDrop"
      >
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :default-edge-options="{ type: 'smoothstep', animated: true }"
          :snap-to-grid="true"
          :snap-grid="[15, 15]"
          fit-view-on-init
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
        >
          <Background :gap="15" :size="1" />
          <Controls />
          <MiniMap />
        </VueFlow>
      </div>
      <PropertyPanel
        :node="selectedNode"
        :selected-edge="selectedEdge"
        :form-fields="formFields"
        @update="onPropertyUpdate"
        @update-edge="onEdgePropertyUpdate"
      />
    </div>

    <FlowSimulator
      v-model:visible="simulatorVisible"
      :nodes="convertNodesToFlowNodes(nodes)"
      :edges="convertEdgesToFlowEdges(edges)"
      :form-fields="formFields"
    />

    <a-modal
      v-model:open="formFieldVisible"
      title="表单字段配置"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveField"
      :width="520"
    >
      <div style="margin-bottom: 16px;">
        <div class="field-list-header">
          <span>已配置字段 ({{ formFields.length }})</span>
        </div>
        <div v-if="formFields.length > 0" class="field-list">
          <div v-for="field in formFields" :key="field.key" class="field-item">
            <div class="field-item-info">
              <span class="field-item-key">{{ field.key }}</span>
              <span class="field-item-label">{{ field.label }}</span>
              <a-tag size="small">{{ field.type }}</a-tag>
              <a-tag v-if="field.required" color="red" size="small">必填</a-tag>
            </div>
            <div class="field-item-actions">
              <a-button size="small" type="link" @click="openFieldModal(field)">编辑</a-button>
              <a-button size="small" type="link" danger @click="deleteField(field.key)">
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无字段，请添加" :image-style="{ height: '40px' }" />
      </div>
      <a-divider />
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="字段标识">
              <a-input v-model:value="fieldFormKey" placeholder="如 amount" :disabled="!!editingField" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="字段名称">
              <a-input v-model:value="fieldFormLabel" placeholder="如 金额" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="字段类型">
              <a-select v-model:value="fieldFormType" :options="[
                { value: 'number', label: '数值' },
                { value: 'string', label: '文本' },
                { value: 'boolean', label: '布尔' },
                { value: 'select', label: '选择' },
              ]" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="是否必填">
              <a-switch v-model:checked="fieldFormRequired" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="fieldFormType === 'select'" label="选项（逗号分隔）">
          <a-input v-model:value="fieldFormOptions" placeholder="选项1, 选项2, 选项3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
  <div v-else class="designer-empty">
    <a-empty description="流程不存在" />
    <a-button type="primary" @click="router.push('/flows')" style="margin-top: 16px">
      返回流程列表
    </a-button>
  </div>
</template>

<style scoped lang="less">
.designer-page {
  height: calc(100vh - 56px - 48px);
  display: flex;
  flex-direction: column;
  margin: -24px;
}

.designer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.flow-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.designer-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.designer-canvas {
  flex: 1;
  height: 100%;
}

.designer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.field-list-header {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.field-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.field-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-item-key {
  font-size: 12px;
  font-family: monospace;
  color: #1677ff;
  background: #e6f7ff;
  padding: 1px 6px;
  border-radius: 3px;
}

.field-item-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.field-item-actions {
  display: flex;
  gap: 4px;
}
</style>
