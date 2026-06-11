<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ScheduleOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
import { useApplicationStore } from '@/stores/application'
import dayjs from 'dayjs'

const router = useRouter()
const applicationStore = useApplicationStore()

const doneList = computed(() => {
  return applicationStore.getMyDone().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

function goDetail(id: string) {
  router.push(`/application/${id}`)
}
</script>

<template>
  <div class="page-container">
    <h2 class="page-title">
      <ScheduleOutlined style="margin-right: 8px" />
      我的已办
    </h2>

    <a-list :data-source="doneList" :grid="{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-card hoverable class="done-card" @click="goDetail(item.id)">
            <div class="done-card-header">
              <a-tag :color="item.status === 'approved' ? 'green' : 'red'">
                {{ item.status === 'approved' ? '已通过' : '已驳回' }}
              </a-tag>
              <span class="done-card-time">
                <ClockCircleOutlined />
                {{ formatDate(item.updatedAt) }}
              </span>
            </div>
            <h3 class="done-card-title">{{ item.title }}</h3>
            <div class="done-card-meta">
              <span>流程: {{ item.flowName }}</span>
              <span>发起人: {{ item.applicantName }}</span>
            </div>
          </a-card>
        </a-list-item>
      </template>
    </a-list>

    <a-empty v-if="doneList.length === 0" description="暂无已办记录" style="margin-top: 80px" />
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

.done-card {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.done-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.done-card-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.done-card-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgba(0, 0, 0, 0.88);
}

.done-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
