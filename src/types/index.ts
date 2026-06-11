export type NodeType = 'start' | 'approver' | 'end' | 'parallelGateway' | 'conditionGateway'
export type GatewayType = 'split' | 'converge'
export type ApproverType = 'user' | 'role' | 'manager'
export type FlowStatus = 'draft' | 'published'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'
export type ApprovalAction = 'approve' | 'reject' | 'preCountersign' | 'postCountersign' | 'transfer' | 'withdraw'

export type FormFieldType = 'number' | 'string' | 'boolean' | 'select'

export interface FormField {
  key: string
  label: string
  type: FormFieldType
  options?: string[]
  required?: boolean
  defaultValue?: string | number | boolean
}

export interface ExpressionToken {
  type: 'field' | 'operator' | 'value' | 'paren'
  value: string
}

export interface FlowNodeData {
  label: string
  approverType?: ApproverType
  approverIds?: string[]
  gatewayType?: GatewayType
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
  conditionExpression?: string
  label?: string
}

export interface FlowDefinition {
  id: string
  name: string
  status: FlowStatus
  nodes: FlowNode[]
  edges: FlowEdge[]
  formFields: FormField[]
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
  currentNodeIds: string[]
  formData: Record<string, any>
  parallelBranchStatus: Record<string, 'pending' | 'completed'>
  pendingCountersigns: PendingCountersign[]
  withdrawnAt?: string
  createdAt: string
  updatedAt: string
}

export interface PendingCountersign {
  id: string
  type: 'pre' | 'post'
  targetNodeId: string
  approverType: ApproverType
  approverIds: string[]
  insertedAt: string
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
  transferToId?: string
  transferToName?: string
  countersignType?: 'pre' | 'post'
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
