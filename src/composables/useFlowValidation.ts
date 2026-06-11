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
    }

    if (startNodes.length !== 1) {
      return { valid: false, errors }
    }

    if (nodes.length < 2) {
      errors.push('流程至少需要2个节点')
      return { valid: false, errors }
    }

    const adjacency = new Map<string, string[]>()
    const reverseAdj = new Map<string, string[]>()
    nodes.forEach(n => {
      adjacency.set(n.id, [])
      reverseAdj.set(n.id, [])
    })
    edges.forEach(e => {
      const list = adjacency.get(e.source)
      if (list) list.push(e.target)
      const rlist = reverseAdj.get(e.target)
      if (rlist) rlist.push(e.source)
    })

    const startId = startNodes[0].id
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

    for (const endNode of endNodes) {
      if (!visited.has(endNode.id)) {
        errors.push('开始节点无法到达结束节点')
      }
    }

    const orphanNodes = nodes.filter(n => !visited.has(n.id) && n.type !== 'start')
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

    const gatewayNodes = nodes.filter(n => n.type === 'parallelGateway' || n.type === 'conditionGateway')
    for (const node of gatewayNodes) {
      if (!node.data.gatewayType) {
        errors.push(`网关节点"${node.label}"未配置网关类型（分裂/汇聚）`)
        continue
      }

      const outgoing = edges.filter(e => e.source === node.id)
      const incoming = edges.filter(e => e.target === node.id)

      if (node.data.gatewayType === 'split') {
        if (outgoing.length < 2) {
          errors.push(`分裂网关"${node.label}"至少需要2条出边（当前${outgoing.length}条）`)
        }
        if (node.type === 'conditionGateway') {
          for (const edge of outgoing) {
            if (!edge.conditionExpression) {
              const targetNode = nodes.find(n => n.id === edge.target)
              errors.push(`条件网关"${node.label}"的出边（指向"${targetNode?.label || edge.target}"）未配置条件表达式`)
            }
          }
        }
      }

      if (node.data.gatewayType === 'converge') {
        if (incoming.length < 2) {
          errors.push(`汇聚网关"${node.label}"至少需要2条入边（当前${incoming.length}条）`)
        }
      }
    }

    const parallelSplitNodes = nodes.filter(n => n.type === 'parallelGateway' && n.data.gatewayType === 'split')
    const parallelConvergeNodes = nodes.filter(n => n.type === 'parallelGateway' && n.data.gatewayType === 'converge')
    if (parallelSplitNodes.length !== parallelConvergeNodes.length) {
      errors.push(`并行分裂网关(${parallelSplitNodes.length}个)与汇聚网关(${parallelConvergeNodes.length}个)数量不匹配`)
    }

    return { valid: errors.length === 0, errors }
  }

  return { validate }
}
