import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FlowDefinition, FlowNode, FlowEdge, FormField } from '@/types'

function generateId(): string {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

export const useFlowStore = defineStore('flow', () => {
  const flows = ref<FlowDefinition[]>([])

  function initDefaultFlows() {
    if (flows.value.length > 0) {
      flows.value.forEach(f => {
        if (!f.formFields) f.formFields = []
        f.edges.forEach(e => {
          if (e.conditionExpression === undefined) e.conditionExpression = undefined
          if (e.label === undefined) e.label = undefined
        })
      })
      return
    }
    const defaultFlow: FlowDefinition = {
      id: generateId(),
      name: '请假审批流程',
      status: 'published',
      nodes: [
        { id: 'node-start', type: 'start', label: '开始', position: { x: 250, y: 50 }, data: { label: '开始' } },
        { id: 'node-approver-1', type: 'approver', label: '主管审批', position: { x: 250, y: 180 }, data: { label: '主管审批', approverType: 'manager' } },
        { id: 'node-approver-2', type: 'approver', label: '经理审批', position: { x: 250, y: 310 }, data: { label: '经理审批', approverType: 'role', approverIds: ['role-2'] } },
        { id: 'node-end', type: 'end', label: '结束', position: { x: 250, y: 440 }, data: { label: '结束' } },
      ],
      edges: [
        { id: 'e-start-a1', source: 'node-start', target: 'node-approver-1' },
        { id: 'e-a1-a2', source: 'node-approver-1', target: 'node-approver-2' },
        { id: 'e-a2-end', source: 'node-approver-2', target: 'node-end' },
      ],
      formFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    flows.value.push(defaultFlow)
  }

  function createFlow(name: string): FlowDefinition {
    const flow: FlowDefinition = {
      id: generateId(),
      name,
      status: 'draft',
      nodes: [],
      edges: [],
      formFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    flows.value.push(flow)
    return flow
  }

  function getFlowById(id: string): FlowDefinition | undefined {
    return flows.value.find(f => f.id === id)
  }

  function updateFlow(id: string, updates: Partial<FlowDefinition>) {
    const index = flows.value.findIndex(f => f.id === id)
    if (index !== -1) {
      flows.value[index] = { ...flows.value[index], ...updates, updatedAt: new Date().toISOString() }
    }
  }

  function updateFlowNodes(id: string, nodes: FlowNode[]) {
    const index = flows.value.findIndex(f => f.id === id)
    if (index !== -1) {
      flows.value[index].nodes = nodes
      flows.value[index].updatedAt = new Date().toISOString()
    }
  }

  function updateFlowEdges(id: string, edges: FlowEdge[]) {
    const index = flows.value.findIndex(f => f.id === id)
    if (index !== -1) {
      flows.value[index].edges = edges
      flows.value[index].updatedAt = new Date().toISOString()
    }
  }

  function updateFlowFormFields(id: string, formFields: FormField[]) {
    const index = flows.value.findIndex(f => f.id === id)
    if (index !== -1) {
      flows.value[index].formFields = formFields
      flows.value[index].updatedAt = new Date().toISOString()
    }
  }

  function deleteFlow(id: string) {
    flows.value = flows.value.filter(f => f.id !== id)
  }

  function publishFlow(id: string) {
    const index = flows.value.findIndex(f => f.id === id)
    if (index !== -1) {
      flows.value[index].status = 'published'
      flows.value[index].updatedAt = new Date().toISOString()
    }
  }

  function getPublishedFlows(): FlowDefinition[] {
    return flows.value.filter(f => f.status === 'published')
  }

  return {
    flows,
    initDefaultFlows,
    createFlow,
    getFlowById,
    updateFlow,
    updateFlowNodes,
    updateFlowEdges,
    updateFlowFormFields,
    deleteFlow,
    publishFlow,
    getPublishedFlows,
  }
}, {
  persist: true,
})
