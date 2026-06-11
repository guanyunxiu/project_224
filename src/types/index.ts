export type NodeType = 'start' | 'approver' | 'end'
export type ApproverType = 'user' | 'role' | 'manager'
export type FlowStatus = 'draft' | 'published'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalAction = 'approve' | 'reject'

export interface FlowNodeData {
  label: string
  approverType?: ApproverType
  approverIds?: string[]
}

export interface FlowNode {
  id: string
  type: NodeType
  label: string
  position: { x: number; y: number }
  data: FlowNodeData
}

export interface FlowEdge {
  id: string
  source: string
  target: string
}

export interface FlowDefinition {
  id: string
  name: string
  status: FlowStatus
  nodes: FlowNode[]
  edges: FlowEdge[]
  createdAt: string
  updatedAt: string
}

export interface Application {
  id: string
  flowId: string
  flowName: string
  title: string
  description: string
  applicantId: string
  applicantName: string
  status: ApplicationStatus
  currentNodeId: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalRecord {
  id: string
  applicationId: string
  nodeId: string
  nodeName: string
  approverId: string
  approverName: string
  action: ApprovalAction
  comment: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  roleId: string
  password: string
}

export interface Role {
  id: string
  name: string
}
