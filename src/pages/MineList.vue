<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { FileSearchOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
import { useApplicationStore } from '@/stores/application'
import dayjs from 'dayjs'

const router = useRouter()
const applicationStore = useApplicationStore()

const mineList = computed(() => {
  return applicationStore.getMyInitiated().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

function goDetail(id: string) {
  router.push(`/application/${id}`)
}

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '审批中' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已驳回' },
  withdrawn: { color: 'default', text: '已撤回' },
}
</script>

<template>
  <div class="page-container">
    <h2 class="page-title">
      <FileSearchOutlined style="margin-right: 8px" />
      我发起的
    </h2>

    <a-list :data-source="mineList" :grid="{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-card hoverable class="mine-card" @click="goDetail(item.id)">
            <div class="mine-card-header">
              <a-tag :color="statusMap[item.status]?.color">
                {{ statusMap[item.status]?.text }}
              </a-tag>
              <span class="mine-card-time">
                <ClockCircleOutlined />
                {{ formatDate(item.createdAt) }}
              </span>
            </div>
            <h3 class="mine-card-title">{{ item.title }}</h3>
            <div class="mine-card-meta">
              <span>流程: {{ item.flowName }}</span>
            </div>
          </a-card>
        </a-list-item>
      </template>
    </a-list>

    <a-empty v-if="mineList.length === 0" description="暂无发起记录" style="margin-top: 80px" />
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
}

.mine-card {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.mine-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mine-card-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.mine-card-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgba(0, 0, 0, 0.88);
}

.mine-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
