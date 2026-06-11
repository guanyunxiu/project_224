import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, Role } from '@/types'
import { users, roles, currentUser } from '@/mock/users'

export const useUserStore = defineStore('user', () => {
  const userList = ref<User[]>([...users])
  const roleList = ref<Role[]>([...roles])
  const currentUserInfo = ref<User>({ ...currentUser })

  function getUserById(id: string): User | undefined {
    return userList.value.find(u => u.id === id)
  }

  function getRoleById(id: string): Role | undefined {
    return roleList.value.find(r => r.id === id)
  }

  function getUsersByRole(roleId: string): User[] {
    return userList.value.filter(u => u.roleId === roleId)
  }

  function getUserName(id: string): string {
    return getUserById(id)?.name ?? '未知'
  }

  function getRoleName(id: string): string {
    return getRoleById(id)?.name ?? '未知'
  }

  return {
    userList,
    roleList,
    currentUserInfo,
    getUserById,
    getRoleById,
    getUsersByRole,
    getUserName,
    getRoleName,
  }
})
