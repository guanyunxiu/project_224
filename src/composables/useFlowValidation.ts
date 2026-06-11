import type { FlowNode, FlowEdge } from '@/types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function useFlowValidation() {
  function validate(nodes: FlowNode[], edges: FlowEdge[]): ValidationResult {
    const errors: string[] = []

    const startNodes = nodes.filter(n => n.type === 'start')
    if (startNodes.length === 0) {
      errors.push('必须有一个开始节点')
    } else if (startNodes.length > 1) {
      errors.push('只能有一个开始节点')
    }

    const endNodes = nodes.filter(n => n.type === 'end')
    if (endNodes.length === 0) {
      errors.push('必须有一个结束节点')
    } else if (endNodes.length > 1) {
      errors.push('只能有一个结束节点')
    }

    if (startNodes.length !== 1 || endNodes.length !== 1) {
      return { valid: false, errors }
    }

    if (nodes.length < 2) {
      errors.push('流程至少需要2个节点')
      return { valid: false, errors }
    }

    const adjacency = new Map<string, string[]>()
    nodes.forEach(n => adjacency.set(n.id, []))
    edges.forEach(e => {
      const list = adjacency.get(e.source)
      if (list) list.push(e.target)
    })

    const startId = startNodes[0].id
    const endId = endNodes[0].id
    const visited = new Set<string>()
    const path = new Set<string>()
    let hasCycle = false

    function dfs(nodeId: string): boolean {
      visited.add(nodeId)
      path.add(nodeId)
      const neighbors = adjacency.get(nodeId) ?? []
      for (const neighbor of neighbors) {
        if (path.has(neighbor)) {
          hasCycle = true
          return true
        }
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true
        }
      }
      path.delete(nodeId)
      return false
    }

    dfs(startId)

    if (hasCycle) {
      errors.push('流程不允许有环路')
    }

    if (!visited.has(endId)) {
      errors.push('开始节点无法到达结束节点')
    }

    const orphanNodes = nodes.filter(n => !visited.has(n.id))
    if (orphanNodes.length > 0) {
      errors.push(`存在孤立节点: ${orphanNodes.map(n => n.label).join('、')}`)
    }

    const approverNodes = nodes.filter(n => n.type === 'approver')
    for (const node of approverNodes) {
      if (!node.data.approverType) {
        errors.push(`审批节点"${node.label}"未配置审批人类型`)
      } else if (node.data.approverType !== 'manager' && (!node.data.approverIds || node.data.approverIds.length === 0)) {
        errors.push(`审批节点"${node.label}"未配置审批人`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  return { validate }
}
