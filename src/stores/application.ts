import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Application, ApprovalRecord } from '@/types'
import { useUserStore } from './user'
import { useFlowStore } from './flow'

function generateId(): string {
  return 'app-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

export const useApplicationStore = defineStore('application', () => {
  const applications = ref<Application[]>([])
  const records = ref<ApprovalRecord[]>([])

  function submitApplication(flowId: string, title: string, description: string): Application {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const flow = flowStore.getFlowById(flowId)
    if (!flow) throw new Error('流程不存在')

    const startNode = flow.nodes.find(n => n.type === 'start')
    const firstEdge = startNode ? flow.edges.find(e => e.source === startNode.id) : undefined
    const nextNodeId = firstEdge?.target ?? ''

    const app: Application = {
      id: generateId(),
      flowId,
      flowName: flow.name,
      title,
      description,
      applicantId: userStore.currentUserInfo.id,
      applicantName: userStore.currentUserInfo.name,
      status: 'pending',
      currentNodeId: nextNodeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    applications.value.push(app)
    return app
  }

  function getApplicationById(id: string): Application | undefined {
    return applications.value.find(a => a.id === id)
  }

  function getMyTodo(): Application[] {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    return applications.value.filter(app => {
      if (app.status !== 'pending') return false
      const flow = flowStore.getFlowById(app.flowId)
      if (!flow) return false
      const currentNode = flow.nodes.find(n => n.id === app.currentNodeId)
      if (!currentNode || currentNode.type !== 'approver') return false
      const data = currentNode.data
      if (data.approverType === 'user') {
        return data.approverIds?.includes(userStore.currentUserInfo.id)
      }
      if (data.approverType === 'role') {
        return data.approverIds?.includes(userStore.currentUserInfo.roleId)
      }
      if (data.approverType === 'manager') {
        const applicant = userStore.getUserById(app.applicantId)
        if (applicant) {
          const managerRole = 'role-3'
          return userStore.currentUserInfo.roleId === managerRole
        }
      }
      return false
    })
  }

  function getMyDone(): Application[] {
    const userStore = useUserStore()
    const myRecords = records.value.filter(r => r.approverId === userStore.currentUserInfo.id)
    const doneAppIds = new Set(myRecords.map(r => r.applicationId))
    return applications.value.filter(a => doneAppIds.has(a.id))
  }

  function getMyInitiated(): Application[] {
    const userStore = useUserStore()
    return applications.value.filter(a => a.applicantId === userStore.currentUserInfo.id)
  }

  function approveApplication(applicationId: string, comment: string) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return

    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return

    const currentNode = flow.nodes.find(n => n.id === app.currentNodeId)
    if (!currentNode) return

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: app.currentNodeId,
      nodeName: currentNode.label,
      approverId: userStore.currentUserInfo.id,
      approverName: userStore.currentUserInfo.name,
      action: 'approve',
      comment,
      createdAt: new Date().toISOString(),
    })

    const nextEdge = flow.edges.find(e => e.source === app.currentNodeId)
    if (nextEdge) {
      const nextNode = flow.nodes.find(n => n.id === nextEdge.target)
      if (nextNode && nextNode.type === 'end') {
        app.status = 'approved'
        app.currentNodeId = nextNode.id
      } else {
        app.currentNodeId = nextEdge.target
      }
    } else {
      app.status = 'approved'
    }
    app.updatedAt = new Date().toISOString()
  }

  function rejectApplication(applicationId: string, comment: string) {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const app = applications.value.find(a => a.id === applicationId)
    if (!app) return

    const currentNode = flowStore.getFlowById(app.flowId)?.nodes.find(n => n.id === app.currentNodeId)
    if (!currentNode) return

    records.value.push({
      id: generateId(),
      applicationId,
      nodeId: app.currentNodeId,
      nodeName: currentNode.label,
      approverId: userStore.currentUserInfo.id,
      approverName: userStore.currentUserInfo.name,
      action: 'reject',
      comment,
      createdAt: new Date().toISOString(),
    })

    app.status = 'rejected'
    app.updatedAt = new Date().toISOString()
  }

  function getRecordsByApplicationId(applicationId: string): ApprovalRecord[] {
    return records.value.filter(r => r.applicationId === applicationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  function isCurrentApprover(applicationId: string): boolean {
    const userStore = useUserStore()
    const flowStore = useFlowStore()
    const app = applications.value.find(a => a.id === applicationId)
    if (!app || app.status !== 'pending') return false
    const flow = flowStore.getFlowById(app.flowId)
    if (!flow) return false
    const currentNode = flow.nodes.find(n => n.id === app.currentNodeId)
    if (!currentNode || currentNode.type !== 'approver') return false
    const data = currentNode.data
    if (data.approverType === 'user') return data.approverIds?.includes(userStore.currentUserInfo.id) ?? false
    if (data.approverType === 'role') return data.approverIds?.includes(userStore.currentUserInfo.roleId) ?? false
    if (data.approverType === 'manager') {
      const applicant = userStore.getUserById(app.applicantId)
      return applicant ? userStore.currentUserInfo.roleId === 'role-3' : false
    }
    return false
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
    getRecordsByApplicationId,
    isCurrentApprover,
  }
}, {
  persist: true,
})
