<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  SearchOutlined,
  ApartmentOutlined,
} from '@ant-design/icons-vue'
import { useFlowStore } from '@/stores/flow'
import dayjs from 'dayjs'

const router = useRouter()
const flowStore = useFlowStore()
const searchText = ref('')

onMounted(() => {
  flowStore.initDefaultFlows()
})

const filteredFlows = computed(() => {
  let list = flowStore.flows
  if (searchText.value) {
    const text = searchText.value.toLowerCase()
    list = list.filter(f => f.name.toLowerCase().includes(text))
  }
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

function createFlow() {
  const flow = flowStore.createFlow('新建流程')
  router.push(`/flows/designer/${flow.id}`)
}

function editFlow(id: string) {
  router.push(`/flows/designer/${id}`)
}

function deleteFlow(id: string) {
  Modal.confirm({
    title: '确认删除',
    content: '删除后无法恢复，确认要删除此流程吗？',
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk() {
      flowStore.deleteFlow(id)
      message.success('删除成功')
    },
  })
}

function publishFlow(id: string) {
  flowStore.publishFlow(id)
  message.success('发布成功')
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">流程管理</h2>
      <a-space>
        <a-input
          v-model:value="searchText"
          placeholder="搜索流程名称"
          style="width: 220px"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        <a-button type="primary" @click="createFlow">
          <PlusOutlined />
          新建流程
        </a-button>
      </a-space>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col v-for="flow in filteredFlows" :key="flow.id" :xs="24" :sm="12" :md="8" :lg="6">
        <a-card hoverable class="flow-card">
          <div class="flow-card-header">
            <ApartmentOutlined class="flow-card-icon" />
            <a-tag :color="flow.status === 'published' ? 'green' : 'default'" size="small">
              {{ flow.status === 'published' ? '已发布' : '草稿' }}
            </a-tag>
          </div>
          <h3 class="flow-card-name">{{ flow.name }}</h3>
          <div class="flow-card-info">
            <span>{{ flow.nodes.length }} 个节点</span>
            <span>{{ formatDate(flow.updatedAt) }}</span>
          </div>
          <div class="flow-card-actions">
            <a-button size="small" @click="editFlow(flow.id)">
              <EditOutlined />
              编辑
            </a-button>
            <a-button
              v-if="flow.status === 'draft'"
              size="small"
              type="primary"
              ghost
              @click="publishFlow(flow.id)"
            >
              <SendOutlined />
              发布
            </a-button>
            <a-button size="small" danger @click="deleteFlow(flow.id)">
              <DeleteOutlined />
            </a-button>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-empty v-if="filteredFlows.length === 0" description="暂无流程，点击新建流程开始" style="margin-top: 80px" />
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.flow-card {
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.flow-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.flow-card-icon {
  font-size: 28px;
  color: #1677ff;
}

.flow-card-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-card-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 12px;
}

.flow-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
