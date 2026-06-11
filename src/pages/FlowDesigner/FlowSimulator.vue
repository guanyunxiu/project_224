<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FlowNode, FlowEdge, FormField } from '@/types'
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons-vue'

const props = defineProps<{
  visible: boolean
  nodes: FlowNode[]
  edges: FlowEdge[]
  formFields: FormField[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const formData = ref<Record<string, any>>({})

watch(() => props.visible, (val) => {
  if (val) {
    const data: Record<string, any> = {}
    props.formFields.forEach(f => {
      data[f.key] = f.defaultValue ?? (f.type === 'number' ? 0 : f.type === 'boolean' ? false : '')
    })
    formData.value = data
  }
})

function evaluateExpression(expression: string, data: Record<string, any>): boolean {
  if (!expression || !expression.trim()) return true
  try {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const fn = new Function(...keys, `"use strict"; return (${expression})`)
    return !!fn(...values)
  } catch {
    return false
  }
}

interface SimNode {
  id: string
  label: string
  type: string
  status: 'active' | 'inactive' | 'waiting'
}

const simulatedPath = computed(() => {
  const startNode = props.nodes.find(n => n.type === 'start')
  if (!startNode) return { nodes: [] as SimNode[], edges: [] as string[] }

  const activeNodes = new Set<string>()
  const activeEdges = new Set<string>()
  const visited = new Set<string>()
  const queue: string[] = [startNode.id]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    activeNodes.add(currentId)

    const currentNode = props.nodes.find(n => n.id === currentId)
    if (!currentNode) continue

    if (currentNode.type === 'end') continue

    const outgoingEdges = props.edges.filter(e => e.source === currentId)

    if (currentNode.type === 'conditionGateway' && currentNode.data.gatewayType === 'split') {
      let taken = false
      for (const edge of outgoingEdges) {
        if (!taken && evaluateExpression(edge.conditionExpression || '', formData.value)) {
          activeEdges.add(edge.id)
          queue.push(edge.target)
          taken = true
        }
      }
      if (!taken && outgoingEdges.length > 0) {
        activeEdges.add(outgoingEdges[outgoingEdges.length - 1].id)
        queue.push(outgoingEdges[outgoingEdges.length - 1].target)
      }
    } else if (currentNode.type === 'parallelGateway' && currentNode.data.gatewayType === 'split') {
      for (const edge of outgoingEdges) {
        activeEdges.add(edge.id)
        queue.push(edge.target)
      }
    } else {
      for (const edge of outgoingEdges) {
        if (edge.conditionExpression) {
          if (evaluateExpression(edge.conditionExpression, formData.value)) {
            activeEdges.add(edge.id)
            queue.push(edge.target)
          }
        } else {
          activeEdges.add(edge.id)
          queue.push(edge.target)
        }
      }
    }
  }

  const simNodes: SimNode[] = props.nodes.map(n => ({
    id: n.id,
    label: n.label,
    type: n.type,
    status: activeNodes.has(n.id) ? 'active' : 'inactive',
  }))

  return { nodes: simNodes, edges: [...activeEdges] }
})

const activeNodeCount = computed(() => simulatedPath.value.nodes.filter(n => n.status === 'active').length)

function getNodeIcon(type: string) {
  switch (type) {
    case 'start': return CheckCircleOutlined
    case 'end': return CloseCircleOutlined
    case 'approver': return MinusCircleOutlined
    case 'parallelGateway': return MinusCircleOutlined
    case 'conditionGateway': return MinusCircleOutlined
    default: return MinusCircleOutlined
  }
}

const close = () => emit('update:visible', false)
</script>

<template>
  <a-modal
    :open="visible"
    title="流程模拟预览"
    :width="720"
    :footer="null"
    @cancel="close"
  >
    <div class="simulator">
      <div class="sim-form" v-if="formFields.length > 0">
        <div class="sim-section-title">输入表单数据</div>
        <a-form layout="vertical">
          <a-row :gutter="12">
            <a-col v-for="field in formFields" :key="field.key" :span="12">
              <a-form-item :label="field.label">
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
        </a-form>
      </div>

      <a-alert
        v-else
        message="该流程未配置表单字段，条件表达式将无法求值"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
      />

      <div class="sim-result">
        <div class="sim-section-title">
          <EyeOutlined style="margin-right: 6px" />
          模拟路径 ({{ activeNodeCount }} / {{ nodes.length }} 节点)
        </div>
        <div class="sim-path">
          <div
            v-for="node in simulatedPath.nodes"
            :key="node.id"
            class="sim-node"
            :class="[`sim-node-${node.status}`, `sim-node-type-${node.type}`]"
          >
            <div class="sim-node-icon">
              <component :is="getNodeIcon(node.type)" />
            </div>
            <div class="sim-node-label">{{ node.label }}</div>
            <div class="sim-node-type-tag">
              {{ node.type === 'start' ? '开始' : node.type === 'end' ? '结束' : node.type === 'approver' ? '审批' : node.type === 'parallelGateway' ? '并行' : '条件' }}
            </div>
          </div>
        </div>
      </div>

      <div class="sim-edges" v-if="simulatedPath.edges.length > 0">
        <div class="sim-section-title">激活的连线</div>
        <div class="sim-edge-list">
          <a-tag
            v-for="edgeId in simulatedPath.edges"
            :key="edgeId"
            color="blue"
          >
            {{ edgeId }}
          </a-tag>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.simulator {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sim-section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 12px;
}

.sim-form {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.sim-result {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.sim-path {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sim-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
  background: #fff;
  min-width: 80px;
  transition: all 0.2s;

  &.sim-node-active {
    border-color: #1677ff;
    background: #e6f7ff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.2);
  }

  &.sim-node-inactive {
    opacity: 0.4;
  }
}

.sim-node-icon {
  font-size: 18px;
  margin-bottom: 4px;

  .sim-node-active & {
    color: #1677ff;
  }
}

.sim-node-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  text-align: center;
}

.sim-node-type-tag {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.sim-edges {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.sim-edge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
