import type { User, Role } from '@/types'

export const roles: Role[] = [
  { id: 'role-1', name: 'CEO' },
  { id: 'role-2', name: '部门经理' },
  { id: 'role-3', name: '主管' },
  { id: 'role-4', name: '员工' },
  { id: 'role-5', name: '财务' },
]

export const users: User[] = [
  { id: 'user-1', name: '张三', roleId: 'role-1', password: '123456' },
  { id: 'user-2', name: '李四', roleId: 'role-2', password: '123456' },
  { id: 'user-3', name: '王五', roleId: 'role-3', password: '123456' },
  { id: 'user-4', name: '赵六', roleId: 'role-4', password: '123456' },
  { id: 'user-5', name: '孙七', roleId: 'role-5', password: '123456' },
]

export const currentUser: User = users[3]

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function getRoleById(id: string): Role | undefined {
  return roles.find(r => r.id === id)
}

export function getUsersByRole(roleId: string): User[] {
  return users.filter(u => u.roleId === roleId)
}
