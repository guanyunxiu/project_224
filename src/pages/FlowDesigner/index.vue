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
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons-vue'
import type { FlowNode, FlowEdge } from '@/types'
import type { Node, Edge } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { useFlowValidation } from '@/composables/useFlowValidation'
import StartNode from './nodes/StartNode.vue'
import ApproverNode from './nodes/ApproverNode.vue'
import EndNode from './nodes/EndNode.vue'
import NodePanel from './NodePanel.vue'
import PropertyPanel from './PropertyPanel.vue'

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
}

const { onConnect, addEdges, project, vueFlowRef, addNodes, updateNodeData, onNodesChange, onEdgesChange, applyNodeChanges, applyEdgeChanges } = useVueFlow({
  id: flowId.value,
})

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const selectedNode = ref<FlowNode | null>(null)

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
    }))
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
  }

  const newNode: Node = {
    id: `node-${Date.now()}`,
    type,
    position,
    data: { label: labelMap[type] || type },
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
  const flowNode: FlowNode = {
    id: node.id,
    type: (node.type as 'start' | 'approver' | 'end') || 'approver',
    label: node.data?.label || node.label || '',
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data?.label || node.label || '',
      approverType: (node.data?.approverType ?? undefined) as 'user' | 'role' | 'manager' | undefined,
      approverIds: node.data?.approverIds as string[] | undefined,
    },
  }
  selectedNode.value = flowNode
}

function onPaneClick() {
  selectedNode.value = null
}

function onPropertyUpdate(updatedNode: FlowNode) {
  selectedNode.value = updatedNode
  updateNodeData(updatedNode.id, {
    label: updatedNode.data.label,
    approverType: updatedNode.data.approverType,
    approverIds: updatedNode.data.approverIds,
  })
}

function buildFlowNodeFromVueFlow(n: any): FlowNode {
  return {
    id: n.id,
    type: (n.type as 'start' | 'approver' | 'end') || 'approver',
    label: getNodeLabel(n as Node),
    position: { x: n.position.x, y: n.position.y },
    data: {
      label: getNodeLabel(n as Node),
      approverType: (n.data?.approverType ?? undefined) as 'user' | 'role' | 'manager' | undefined,
      approverIds: n.data?.approverIds as string[] | undefined,
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
  }))
}

function syncToStore() {
  const flowNodes = convertNodesToFlowNodes(nodes.value)
  const flowEdges = convertEdgesToFlowEdges(edges.value)
  flowStore.updateFlowNodes(flowId.value, flowNodes)
  flowStore.updateFlowEdges(flowId.value, flowEdges)
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
          @pane-click="onPaneClick"
        >
          <Background :gap="15" :size="1" />
          <Controls />
          <MiniMap />
        </VueFlow>
      </div>
      <PropertyPanel :node="selectedNode" @update="onPropertyUpdate" />
    </div>
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
</style>
