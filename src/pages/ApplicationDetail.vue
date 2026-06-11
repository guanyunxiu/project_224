<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons-vue'
import { useApplicationStore } from '@/stores/application'
import { useFlowStore } from '@/stores/flow'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const applicationStore = useApplicationStore()
const flowStore = useFlowStore()
const userStore = useUserStore()

const appId = computed(() => route.params.id as string)
const app = computed(() => applicationStore.getApplicationById(appId.value))
const canApprove = computed(() => applicationStore.isCurrentApprover(appId.value))

const records = computed(() => applicationStore.getRecordsByApplicationId(appId.value))

const flow = computed(() => {
  if (!app.value) return null
  return flowStore.getFlowById(app.value.flowId)
})

const flowNodes = computed(() => {
  if (!flow.value || !app.value) return []
  return flow.value.nodes.filter(n => n.type !== 'start' && n.type !== 'end')
})

const currentNodeLabel = computed(() => {
  if (!flow.value || !app.value) return ''
  const node = flow.value.nodes.find(n => n.id === app.value.currentNodeId)
  return node?.label ?? ''
})

const rejectVisible = ref(false)
const rejectComment = ref('')

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '审批中' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已驳回' },
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
}

function handleApprove() {
  applicationStore.approveApplication(appId.value, '同意')
  message.success('已同意')
}

function showRejectModal() {
  rejectComment.value = ''
  rejectVisible.value = true
}

function handleReject() {
  if (!rejectComment.value.trim()) {
    message.warning('请填写驳回意见')
    return
  }
  applicationStore.rejectApplication(appId.value, rejectComment.value)
  rejectVisible.value = false
  message.success('已驳回')
}

function getNodeApproverInfo(nodeId: string): string {
  if (!flow.value) return ''
  const node = flow.value.nodes.find(n => n.id === nodeId)
  if (!node || node.type !== 'approver') return ''
  const data = node.data
  if (data.approverType === 'user') {
    return (data.approverIds || []).map(id => userStore.getUserName(id)).join('、')
  }
  if (data.approverType === 'role') {
    return (data.approverIds || []).map(id => userStore.getRoleName(id)).join('、')
  }
  if (data.approverType === 'manager') {
    return '发起人主管'
  }
  return '未配置'
}

function getNodeRecord(nodeId: string) {
  return records.value.find(r => r.nodeId === nodeId)
}

function getNodeStatus(nodeId: string): 'done' | 'current' | 'waiting' {
  if (!app.value) return 'waiting'
  const record = getNodeRecord(nodeId)
  if (record) return 'done'
  if (app.value.currentNodeId === nodeId) return 'current'
  return 'waiting'
}
</script>

<template>
  <div class="page-container" v-if="app">
    <div class="detail-header">
      <a-button @click="router.back()">
        <ArrowLeftOutlined />
        返回
      </a-button>
    </div>

    <a-row :gutter="24">
      <a-col :xs="24" :lg="14">
        <a-card class="detail-card">
          <div class="detail-title-row">
            <h2 class="detail-title">{{ app.title }}</h2>
            <a-tag :color="statusMap[app.status]?.color" style="font-size: 13px; padding: 2px 10px">
              {{ statusMap[app.status]?.text }}
            </a-tag>
          </div>

          <a-descriptions :column="1" size="middle" bordered>
            <a-descriptions-item label="审批流程">{{ app.flowName }}</a-descriptions-item>
            <a-descriptions-item label="发起人">
              <UserOutlined style="margin-right: 4px" />
              {{ app.applicantName }}
            </a-descriptions-item>
            <a-descriptions-item label="发起时间">{{ formatDate(app.createdAt) }}</a-descriptions-item>
            <a-descriptions-item v-if="app.status === 'pending'" label="当前节点">
              <a-tag color="orange">{{ currentNodeLabel }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="申请说明">
              <span v-if="app.description">{{ app.description }}</span>
              <span v-else style="color: rgba(0,0,0,0.25)">无</span>
            </a-descriptions-item>
          </a-descriptions>

          <div v-if="canApprove" class="approve-actions">
            <a-button type="primary" size="large" @click="handleApprove">
              <CheckCircleOutlined />
              同意
            </a-button>
            <a-button danger size="large" @click="showRejectModal">
              <CloseCircleOutlined />
              驳回
            </a-button>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="10">
        <a-card class="timeline-card">
          <template #title>
            <HistoryOutlined style="margin-right: 6px" />
            审批进度
          </template>
          <a-timeline>
            <a-timeline-item
              v-for="node in flowNodes"
              :key="node.id"
              :color="getNodeStatus(node.id) === 'done' ? 'green' : getNodeStatus(node.id) === 'current' ? 'orange' : 'gray'"
            >
              <div class="timeline-node">
                <div class="timeline-node-header">
                  <span class="timeline-node-name">{{ node.label }}</span>
                  <a-tag
                    v-if="getNodeStatus(node.id) === 'done'"
                    :color="getNodeRecord(node.id)?.action === 'approve' ? 'green' : 'red'"
                    size="small"
                  >
                    {{ getNodeRecord(node.id)?.action === 'approve' ? '已同意' : '已驳回' }}
                  </a-tag>
                  <a-tag v-else-if="getNodeStatus(node.id) === 'current'" color="orange" size="small">
                    审批中
                  </a-tag>
                  <a-tag v-else size="small">待处理</a-tag>
                </div>
                <div class="timeline-node-info">
                  <span><UserOutlined /> 审批人: {{ getNodeApproverInfo(node.id) }}</span>
                </div>
                <div v-if="getNodeRecord(node.id)" class="timeline-node-record">
                  <div class="timeline-record-user">
                    {{ getNodeRecord(node.id)?.approverName }}
                    <span class="timeline-record-time">{{ formatDate(getNodeRecord(node.id)!.createdAt) }}</span>
                  </div>
                  <div v-if="getNodeRecord(node.id)?.comment" class="timeline-record-comment">
                    <FileTextOutlined /> {{ getNodeRecord(node.id)?.comment }}
                  </div>
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>

          <a-empty v-if="flowNodes.length === 0" description="暂无审批节点" />
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      v-model:open="rejectVisible"
      title="驳回申请"
      ok-text="确认驳回"
      cancel-text="取消"
      ok-type="danger"
      @ok="handleReject"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回意见" required>
          <a-textarea
            v-model:value="rejectComment"
            placeholder="请输入驳回意见"
            :rows="4"
            :maxlength="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>

  <div v-else class="page-container">
    <a-empty description="申请不存在">
      <a-button type="primary" @click="router.push('/todo')">返回待办</a-button>
    </a-empty>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 0;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-card {
  border-radius: 8px;
  margin-bottom: 24px;
}

.detail-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.approve-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.timeline-card {
  border-radius: 8px;
}

.timeline-node {
  padding-bottom: 4px;
}

.timeline-node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.timeline-node-name {
  font-weight: 500;
  font-size: 14px;
}

.timeline-node-info {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

.timeline-node-record {
  background: #fafafa;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 6px;
}

.timeline-record-user {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}

.timeline-record-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 8px;
}

.timeline-record-comment {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-top: 4px;
}
</style>
