import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Application, ApprovalRecord, PendingCountersign, FlowNode, FlowEdge } from '@/types'
import { useUserStore } from './user'
import { useFlowStore } from './flow'

function generateId(): string {
  return 'app-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

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

function isApproverMatch(
  node: FlowNode,
  userId: string,
  userRoleId: string,
  applicantId: string,
  userStore: any
): boolean {
  if (node.type !== 'approver') return false
  const data = node.data
  if (data.approverType === 'user') {
    return data.approverIds?.includes(userId) ?? false
  }
  if (data.approverType === 'role') {
    return data.approverIds?.includes(userRoleId) ?? false
  }
  if (data.approverType === 'manager') {
    const applicant = userStore.getUserById(applicantId)
    if (applicant) {
      return userRoleId === 'role-3'
    }
  }
  return false
}

export const useApplicationStore = defineStore('application', () => {
  const applications = ref<Application[]>([])
  const records = ref<ApprovalRecord[]>([])

  function migrateApplication(app: any): Application {
    if (app.currentNodeIds === undefined) {
      app.currentNodeIds = app.currentNodeId ? [app.currentNodeId] : []
      delete app.currentNodeId
    }
    if (app.formData === undefined) app.formData = {}
    if (app.parallelBranchStatus === undefined) app.parallelBranchStatus = {}
    if (app.pendingCountersigns === undefined) app.pendingCountersigns = []
    if (app.status === undefined) app.status = 'pending'
    return app as Application
  }

  function getAllApplications(): Application[] {
    return applications.value.map(migrateApplication)
  }

  function submitApplication(flowId: string, title: string, description: string, formData?: Record<string, any>): Application {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const flow = flowStore.getFlowById(flowId)
    if (!flow) throw new Error('流程不存在')

    const startNode = flow.nodes.find(n => n.type === 'start')
    if (!startNode) throw new Error('流程缺少开始节点')

    const nextNodeIds = getNextActiveNodes(flow, startNode.id, formData || {})

    const app: Application = {
      id: generateId(),
      flowId,
      flowName: flow.name,
      title,
      description,
      applicantId: userStore.currentUser.id,
      applicantName: userStore.currentUser.name,
      status: 'pending',
      currentNodeIds: nextNodeIds,
      formData: formData || {},
      parallelBranchStatus: {},
      pendingCountersigns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    for (const nodeId of nextNodeIds) {
      const node = flow.nodes.find(n => n.id === nodeId)
      if (node) {
        if (node.type === 'end') {
          app.status = 'approved'
        }
      }
    }

    applications.value.push(app)
    return app
  }

  function getNextActiveNodes(flow: any, fromNodeId: string, formData: Record<string, any>): string[] {
    const outgoingEdges = flow.edges.filter((e: FlowEdge) => e.source === fromNodeId)
    if (outgoingEdges.length === 0) return []

    const currentNode = flow.nodes.find((n: FlowNode) => n.id === fromNodeId)
    if (!currentNode) return []

    if (currentNode.type === 'conditionGateway' && currentNode.data.gatewayType === 'split') {
      for (const edge of outgoingEdges) {
        if (evaluateExpression(edge.conditionExpression || '', formData)) {
          return [edge.target]
        }
      }
      if (outgoingEdges.length > 0) {
        return [outgoingEdges[outgoingEdges.length - 1].target]
      }
      return []
    }

    if (currentNode.type === 'parallelGateway' && currentNode.data.gatewayType === 'split') {
      return outgoingEdges.map((e: FlowEdge) => e.target)
    }

    if (outgoingEdges.length === 1) {
      const edge = outgoingEdges[0]
      if (edge.conditionExpression) {
        if (evaluateExpression(edge.conditionExpression, formData)) {
          return [edge.target]
        }
        return []
      }
      return [edge.target]
    }

    for (const edge of outgoingEdges) {
      if (edge.conditionExpression && evaluateExpression(edge.conditionExpression, formData)) {
        return [edge.target]
      }
    }
    if (outgoingEdges.length > 0) {
      return [outgoingEdges[0].target]
    }
    return []
  }

  function getApplicationById(id: string): Application | undefined {
    const app = applications.value.find(a => a.id === id)
    if (!app) return undefined
    return migrateApplication(app)
  }

  function getMyTodo(): Application[] {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    return getAllApplications().filter(app => {
      if (app.status !== 'pending') return false
      const flow = flowStore.getFlowById(app.flowId)
      if (!flow) return false

      for (const counter of app.pendingCountersigns) {
        const counterNode = flow.nodes.find(n => n.id === counter.targetNodeId)
        if (counterNode) {
          if (isApproverMatch(
            { ...counterNode, data: { label: counterNode.label, approverType: counter.approverType, approverIds: counter.approverIds } },
            user.id, user.roleId, app.applicantId, userStore
          )) {
            return true
          }
        }
      }

      for (const nodeId of app.currentNodeIds) {
        const currentNode = flow.nodes.find(n => n.id === nodeId)
        if (!currentNode || currentNode.type !== 'approver') continue
        if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
          return true
        }
      }
      return false
    })
  }

  function getMyDone(): Application[] {
    const userStore = useUserStore()
    const user = userStore.currentUser
    const myRecords = records.value.filter(r => r.approverId === user.id)
    const doneAppIds = new Set(myRecords.map(r => r.applicationId))
    return getAllApplications().filter(a => doneAppIds.has(a.id))
  }

  function getMyInitiated(): Application[] {
    const userStore = useUserStore()
    const user = userStore.currentUser
    return getAllApplications().filter(a => a.applicantId === user.id)
  }

  function approveApplication(applicationId: string, comment: string) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return
    migrateApplication(app)

    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return

    const preCountersigns = app.pendingCountersigns.filter(c => c.type === 'pre')
    for (const counter of preCountersigns) {
      if (isApproverMatch(
        { id: counter.targetNodeId, type: 'approver', label: '', position: { x: 0, y: 0 }, data: { label: '', approverType: counter.approverType, approverIds: counter.approverIds } },
        user.id, user.roleId, app.applicantId, userStore
      )) {
        records.value.push({
          id: generateId(),
          applicationId,
          nodeId: counter.targetNodeId,
          nodeName: '前加签审批',
          approverId: user.id,
          approverName: user.name,
          action: 'preCountersign',
          comment,
          countersignType: 'pre',
          createdAt: new Date().toISOString(),
        })
        app.pendingCountersigns = app.pendingCountersigns.filter(c => c.id !== counter.id)
        if (app.pendingCountersigns.filter(c => c.type === 'pre' && c.targetNodeId === counter.targetNodeId).length === 0) {
          // continue to next
        }
        app.updatedAt = new Date().toISOString()
        return
      }
    }

    let approvedNodeId: string | null = null
    for (const nodeId of app.currentNodeIds) {
      const currentNode = flow.nodes.find(n => n.id === nodeId)
      if (!currentNode || currentNode.type !== 'approver') continue
      if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
        approvedNodeId = nodeId
        break
      }
    }

    if (!approvedNodeId) return

    const postCountersigns = app.pendingCountersigns.filter(c => c.type === 'post' && c.targetNodeId === approvedNodeId)
    if (postCountersigns.length > 0) {
      for (const counter of postCountersigns) {
        if (isApproverMatch(
          { id: counter.targetNodeId, type: 'approver', label: '', position: { x: 0, y: 0 }, data: { label: '', approverType: counter.approverType, approverIds: counter.approverIds } },
          user.id, user.roleId, app.applicantId, userStore
        )) {
          records.value.push({
            id: generateId(),
            applicationId,
            nodeId: counter.targetNodeId,
            nodeName: '后加签审批',
            approverId: user.id,
            approverName: user.name,
            action: 'postCountersign',
            comment,
            countersignType: 'post',
            createdAt: new Date().toISOString(),
          })
          app.pendingCountersigns = app.pendingCountersigns.filter(c => c.id !== counter.id)
          if (app.pendingCountersigns.filter(c => c.type === 'post' && c.targetNodeId === approvedNodeId).length === 0) {
            advanceNode(app, flow, approvedNodeId)
          }
          app.updatedAt = new Date().toISOString()
          return
        }
      }
    }

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: approvedNodeId,
      nodeName: flow.nodes.find(n => n.id === approvedNodeId)?.label || '',
      approverId: user.id,
      approverName: user.name,
      action: 'approve',
      comment,
      createdAt: new Date().toISOString(),
    })

    advanceNode(app, flow, approvedNodeId)
    app.updatedAt = new Date().toISOString()
  }

  function advanceNode(app: Application, flow: any, completedNodeId: string) {
    const completedNode = flow.nodes.find((n: FlowNode) => n.id === completedNodeId)
    if (!completedNode) return

    const nextNodeIds = getNextActiveNodes(flow, completedNodeId, app.formData)

    const sourceEdges = flow.edges.filter((e: FlowEdge) => e.source === completedNodeId)
    const isParallelSplit = sourceEdges.length > 1 &&
      completedNode.type === 'parallelGateway' &&
      completedNode.data.gatewayType === 'split'

    if (isParallelSplit) {
      app.currentNodeIds = app.currentNodeIds.filter((id: string) => id !== completedNodeId)
      for (const nid of nextNodeIds) {
        if (!app.currentNodeIds.includes(nid)) {
          app.currentNodeIds.push(nid)
        }
      }
      for (const nid of nextNodeIds) {
        app.parallelBranchStatus[nid] = 'pending'
      }
      return
    }

    const targetEdges = flow.edges.filter((e: FlowEdge) => e.target === completedNodeId)
    const isParallelConverge = targetEdges.length > 1 &&
      completedNode.type === 'parallelGateway' &&
      completedNode.data.gatewayType === 'converge'

    if (isParallelConverge) {
      const incomingNodeIds = targetEdges.map((e: FlowEdge) => e.source)
      let allComplete = true
      for (const srcId of incomingNodeIds) {
        const hasRecord = records.value.some(r => r.applicationId === app.id && r.nodeId === srcId && r.action === 'approve')
        if (!hasRecord) {
          allComplete = false
          break
        }
      }

      if (!allComplete) {
        app.currentNodeIds = app.currentNodeIds.filter((id: string) => id !== completedNodeId)
        return
      }
    }

    app.currentNodeIds = app.currentNodeIds.filter((id: string) => id !== completedNodeId)

    for (const nid of nextNodeIds) {
      if (!app.currentNodeIds.includes(nid)) {
        app.currentNodeIds.push(nid)
      }
      const nextNode = flow.nodes.find((n: FlowNode) => n.id === nid)
      if (nextNode?.type === 'end') {
        app.status = 'approved'
        app.currentNodeIds = [nid]
        return
      }
    }

    for (const nid of nextNodeIds) {
      const nextNode = flow.nodes.find((n: FlowNode) => n.id === nid)
      if (nextNode?.type === 'parallelGateway' && nextNode.data.gatewayType === 'converge') {
        const targetEdges2 = flow.edges.filter((e: FlowEdge) => e.target === nid)
        const incomingNodeIds2 = targetEdges2.map((e: FlowEdge) => e.source)
        let allComplete2 = true
        for (const srcId of incomingNodeIds2) {
          const hasRecord = records.value.some(r => r.applicationId === app.id && r.nodeId === srcId && r.action === 'approve')
          if (!hasRecord) {
            allComplete2 = false
            break
          }
        }
        if (allComplete2) {
          advanceNode(app, flow, nid)
        }
      }
    }

    if (app.currentNodeIds.length === 0 && app.status !== 'approved') {
      app.status = 'approved'
    }
  }

  function rejectApplication(applicationId: string, comment: string) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return
    migrateApplication(app)

    let rejectedNodeId: string | null = null
    const flow = flowStore.getFlowById(app.flowId)
    for (const nodeId of app.currentNodeIds) {
      const currentNode = flow?.nodes.find(n => n.id === nodeId)
      if (!currentNode || currentNode.type !== 'approver') continue
      if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
        rejectedNodeId = nodeId
        break
      }
    }

    if (!rejectedNodeId) return

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: rejectedNodeId,
      nodeName: flow?.nodes.find(n => n.id === rejectedNodeId)?.label || '',
      approverId: user.id,
      approverName: user.name,
      action: 'reject',
      comment,
      createdAt: new Date().toISOString(),
    })

    app.status = 'rejected'
    app.currentNodeIds = []
    app.updatedAt = new Date().toISOString()
  }

  function preCountersign(applicationId: string, approverType: 'user' | 'role' | 'manager', approverIds: string[]) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return
    migrateApplication(app)

    let targetNodeId: string | null = null
    const flow = flowStore.getFlowById(app.flowId)
    for (const nodeId of app.currentNodeIds) {
      const currentNode = flow?.nodes.find(n => n.id === nodeId)
      if (!currentNode || currentNode.type !== 'approver') continue
      if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
        targetNodeId = nodeId
        break
      }
    }

    if (!targetNodeId) return

    const counter: PendingCountersign = {
      id: generateId(),
      type: 'pre',
      targetNodeId,
      approverType,
      approverIds,
      insertedAt: new Date().toISOString(),
    }
    app.pendingCountersigns.push(counter)

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: targetNodeId,
      nodeName: flow?.nodes.find(n => n.id === targetNodeId)?.label || '',
      approverId: user.id,
      approverName: user.name,
      action: 'preCountersign',
      comment: `前加签：添加${approverType === 'user' ? '指定用户' : approverType === 'role' ? '指定角色' : '主管'}审批`,
      countersignType: 'pre',
      createdAt: new Date().toISOString(),
    })

    app.updatedAt = new Date().toISOString()
  }

  function postCountersign(applicationId: string, approverType: 'user' | 'role' | 'manager', approverIds: string[]) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return
    migrateApplication(app)

    let targetNodeId: string | null = null
    const flow = flowStore.getFlowById(app.flowId)
    for (const nodeId of app.currentNodeIds) {
      const currentNode = flow?.nodes.find(n => n.id === nodeId)
      if (!currentNode || currentNode.type !== 'approver') continue
      if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
        targetNodeId = nodeId
        break
      }
    }

    if (!targetNodeId) return

    const counter: PendingCountersign = {
      id: generateId(),
      type: 'post',
      targetNodeId,
      approverType,
      approverIds,
      insertedAt: new Date().toISOString(),
    }
    app.pendingCountersigns.push(counter)

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: targetNodeId,
      nodeName: flow?.nodes.find(n => n.id === targetNodeId)?.label || '',
      approverId: user.id,
      approverName: user.name,
      action: 'postCountersign',
      comment: `后加签：当前人审完再加签人审`,
      countersignType: 'post',
      createdAt: new Date().toISOString(),
    })

    app.updatedAt = new Date().toISOString()
  }

  function transferApplication(applicationId: string, transferToId: string, comment: string) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return
    migrateApplication(app)

    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return

    const transferToUser = userStore.getUserById(transferToId)
    if (!transferToUser) return

    let targetNodeId: string | null = null
    for (const nodeId of app.currentNodeIds) {
      const currentNode = flow.nodes.find(n => n.id === nodeId)
      if (!currentNode || currentNode.type !== 'approver') continue
      if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
        targetNodeId = nodeId
        break
      }
    }

    if (!targetNodeId) return

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: targetNodeId,
      nodeName: flow.nodes.find(n => n.id === targetNodeId)?.label || '',
      approverId: user.id,
      approverName: user.name,
      action: 'transfer',
      comment: comment || '转办',
      transferToId,
      transferToName: transferToUser.name,
      createdAt: new Date().toISOString(),
    })

    const node = flow.nodes.find(n => n.id === targetNodeId)
    if (node) {
      node.data.approverType = 'user'
      node.data.approverIds = [transferToId]
      flowStore.updateFlowNodes(app.flowId, flow.nodes)
    }

    app.updatedAt = new Date().toISOString()
  }

  function withdrawApplication(applicationId: string): { success: boolean; message: string } {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return { success: false, message: '申请不存在' }
    migrateApplication(app)

    if (app.applicantId !== user.id) {
      return { success: false, message: '只有申请人可以撤回' }
    }

    if (app.status !== 'pending') {
      return { success: false, message: '只有审批中的申请可以撤回' }
    }

    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return { success: false, message: '流程不存在' }

    for (const nodeId of app.currentNodeIds) {
      const hasRecord = records.value.some(r =>
        r.applicationId === applicationId &&
        r.nodeId === nodeId &&
        r.action === 'approve'
      )
      if (hasRecord) {
        return { success: false, message: '并行分支已有审批操作，无法撤回' }
      }
    }

    const currentRecords = records.value.filter(r =>
      r.applicationId === applicationId &&
      app.currentNodeIds.includes(r.nodeId) &&
      r.action !== 'preCountersign' && r.action !== 'postCountersign'
    )
    if (currentRecords.length > 0) {
      return { success: false, message: '下一节点已有人操作，无法撤回' }
    }

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: '',
      nodeName: '撤回',
      approverId: user.id,
      approverName: user.name,
      action: 'withdraw',
      comment: '申请人撤回',
      createdAt: new Date().toISOString(),
    })

    app.status = 'withdrawn'
    app.currentNodeIds = []
    app.withdrawnAt = new Date().toISOString()
    app.updatedAt = new Date().toISOString()

    return { success: true, message: '撤回成功' }
  }

  function getRecordsByApplicationId(applicationId: string): ApprovalRecord[] {
    return records.value.filter(r => r.applicationId === applicationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  function isCurrentApprover(applicationId: string): boolean {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const user = userStore.currentUser
    const app = getApplicationById(applicationId)
    if (!app || app.status !== 'pending') return false
    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return false

    for (const counter of app.pendingCountersigns) {
      if (isApproverMatch(
        { id: counter.targetNodeId, type: 'approver', label: '', position: { x: 0, y: 0 }, data: { label: '', approverType: counter.approverType, approverIds: counter.approverIds } },
        user.id, user.roleId, app.applicantId, userStore
      )) {
        return true
      }
    }

    for (const nodeId of app.currentNodeIds) {
      const currentNode = flow.nodes.find(n => n.id === nodeId)
      if (!currentNode || currentNode.type !== 'approver') continue
      if (isApproverMatch(currentNode, user.id, user.roleId, app.applicantId, userStore)) {
        return true
      }
    }
    return false
  }

  function canWithdraw(applicationId: string): boolean {
    const userStore = useUserStore()
    const user = userStore.currentUser
    const app = getApplicationById(applicationId)
    if (!app || app.status !== 'pending') return false
    if (app.applicantId !== user.id) return false

    const flowStore = useFlowStore()
    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return false

    for (const nodeId of app.currentNodeIds) {
      const hasRecord = records.value.some(r =>
        r.applicationId === applicationId &&
        r.nodeId === nodeId &&
        r.action === 'approve'
      )
      if (hasRecord) return false
    }

    return true
  }

  return {
    applications,
    records,
    submitApplication,
    getApplicationById,
    getMyTodo,
    getMyDone,
    getMyInitiated,
    approveApplication,
    rejectApplication,
    preCountersign,
    postCountersign,
    transferApplication,
    withdrawApplication,
    getRecordsByApplicationId,
    isCurrentApprover,
    canWithdraw,
  }
}, {
  persist: true,
})
