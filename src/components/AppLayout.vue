<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ApartmentOutlined,
  FormOutlined,
  CheckSquareOutlined,
  ScheduleOutlined,
  FileSearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const collapsed = ref(false)

const menuItems = [
  { key: '/flows', icon: ApartmentOutlined, label: '流程管理' },
  { key: '/apply', icon: FormOutlined, label: '发起申请' },
  { key: '/todo', icon: CheckSquareOutlined, label: '我的待办' },
  { key: '/done', icon: ScheduleOutlined, label: '我的已办' },
  { key: '/mine', icon: FileSearchOutlined, label: '我发起的' },
]

const selectedKeys = computed(() => {
  const path = route.path
  if (path.startsWith('/flows')) return ['/flows']
  if (path.startsWith('/apply')) return ['/apply']
  if (path.startsWith('/todo')) return ['/todo']
  if (path.startsWith('/done')) return ['/done']
  if (path.startsWith('/mine')) return ['/mine']
  if (path.startsWith('/application')) return ['/todo']
  return ['/flows']
})

function onMenuClick({ key }: { key: string }) {
  router.push(key)
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider
      v-model:collapsed="collapsed"
      :width="220"
      :collapsed-width="64"
      theme="light"
      :style="{ borderRight: '1px solid #f0f0f0' }"
    >
      <div class="logo">
        <ApartmentOutlined style="font-size: 24px; color: #1677FF" />
        <span v-if="!collapsed" class="logo-text">审批流系统</span>
      </div>
      <a-menu
        mode="inline"
        :selected-keys="selectedKeys"
        @click="onMenuClick"
        style="border-right: none"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="app-header">
        <div class="header-left">
          <component
            :is="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
            class="trigger"
            @click="collapsed = !collapsed"
          />
        </div>
        <div class="header-right">
          <a-space>
            <UserOutlined />
            <span>{{ userStore.currentUserInfo.name }}</span>
          </a-space>
        </div>
      </a-layout-header>
      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped lang="less">
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 16px;
  overflow: hidden;
  white-space: nowrap;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.app-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  height: 56px;
  line-height: 56px;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
  &:hover {
    color: #1677FF;
  }
}

.header-right {
  display: flex;
  align-items: center;
}

.app-content {
  margin: 24px;
  min-height: calc(100vh - 56px - 48px);
}
</style>
