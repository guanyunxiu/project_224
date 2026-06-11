import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Role } from '@/types'
import { users, roles } from '@/mock/users'

export const useUserStore = defineStore('user', () => {
  const userList = ref<User[]>([...users])
  const roleList = ref<Role[]>([...roles])
  const currentUserInfo = ref<User | null>(null)
  const isLoggedIn = computed(() => currentUserInfo.value !== null)

  const currentUser = computed<User>(() => {
    if (!currentUserInfo.value) {
      return { id: '', name: '', roleId: '', password: '' }
    }
    return currentUserInfo.value
  })

  function login(username: string, password: string): boolean {
    const user = userList.value.find(u => u.name === username && u.password === password)
    if (user) {
      currentUserInfo.value = { ...user }
      return true
    }
    return false
  }

  function logout() {
    currentUserInfo.value = null
  }

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
    currentUser,
    isLoggedIn,
    login,
    logout,
    getUserById,
    getRoleById,
    getUsersByRole,
    getUserName,
    getRoleName,
  }
}, {
  persist: {
    paths: ['currentUserInfo'],
  },
})
