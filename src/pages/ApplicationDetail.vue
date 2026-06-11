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
  UserAddOutlined,
  SwapOutlined,
  RollbackOutlined,
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
const canWithdrawApp = computed(() => applicationStore.canWithdraw(appId.value))

const records = computed(() => applicationStore.getRecordsByApplicationId(appId.value))

const flow = computed(() => {
  if (!app.value) return null
  return flowStore.getFlowById(app.value.flowId)
})

const flowNodes = computed(() => {
  if (!flow.value || !app.value) return []
  return flow.value.nodes.filter(n => n.type !== 'start' && n.type !== 'end')
})

const currentNodesLabel = computed(() => {
  if (!flow.value || !app.value) return ''
  return app.value.currentNodeIds
    .map(id => flow.value!.nodes.find(n => n.id === id)?.label || '')
    .filter(Boolean)
    .join('、')
})

const rejectVisible = ref(false)
const rejectComment = ref('')

const preCountersignVisible = ref(false)
const preCountersignType = ref<'user' | 'role' | 'manager'>('user')
const preCountersignIds = ref<string[]>([])

const postCountersignVisible = ref(false)
const postCountersignType = ref<'user' | 'role' | 'manager'>('user')
const postCountersignIds = ref<string[]>([])

const transferVisible = ref(false)
const transferToId = ref<string>('')
const transferComment = ref('')

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '审批中' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已驳回' },
  withdrawn: { color: 'default', text: '已撤回' },
}

const approverTypeOptions = [
  { value: 'user', label: '指定用户' },
  { value: 'role', label: '指定角色' },
  { value: 'manager', label: '发起人主管' },
]

const userOptions = userStore.userList.map(u => ({
  value: u.id,
  label: `${u.name} (${userStore.getRoleName(u.roleId)})`,
}))

const roleOptions = userStore.roleList.map(r => ({
  value: r.id,
  label: r.name,
}))

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

function handlePreCountersign() {
  preCountersignType.value = 'user'
  preCountersignIds.value = []
  preCountersignVisible.value = true
}

function submitPreCountersign() {
  if (preCountersignType.value !== 'manager' && preCountersignIds.value.length === 0) {
    message.warning('请选择加签人')
    return
  }
  applicationStore.preCountersign(appId.value, preCountersignType.value, preCountersignIds.value)
  preCountersignVisible.value = false
  message.success('前加签成功')
}

function handlePostCountersign() {
  postCountersignType.value = 'user'
  postCountersignIds.value = []
  postCountersignVisible.value = true
}

function submitPostCountersign() {
  if (postCountersignType.value !== 'manager' && postCountersignIds.value.length === 0) {
    message.warning('请选择加签人')
    return
  }
  applicationStore.postCountersign(appId.value, postCountersignType.value, postCountersignIds.value)
  postCountersignVisible.value = false
  message.success('后加签成功')
}

function handleTransfer() {
  transferToId.value = ''
  transferComment.value = ''
  transferVisible.value = true
}

function submitTransfer() {
  if (!transferToId.value) {
    message.warning('请选择转办人')
    return
  }
  applicationStore.transferApplication(appId.value, transferToId.value, transferComment.value)
  transferVisible.value = false
  message.success('转办成功')
}

function handleWithdraw() {
  const result = applicationStore.withdrawApplication(appId.value)
  if (result.success) {
    message.success(result.message)
  } else {
    message.error(result.message)
  }
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
  if (app.value.currentNodeIds.includes(nodeId)) return 'current'
  return 'waiting'
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    approve: '已同意',
    reject: '已驳回',
    preCountersign: '前加签',
    postCountersign: '后加签',
    transfer: '转办',
    withdraw: '撤回',
  }
  return map[action] || action
}

function getActionColor(action: string): string {
  const map: Record<string, string> = {
    approve: 'green',
    reject: 'red',
    preCountersign: 'purple',
    postCountersign: 'purple',
    transfer: 'blue',
    withdraw: 'default',
  }
  return map[action] || 'default'
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
              <a-tag color="orange">{{ currentNodesLabel || '无' }}</a-tag>
              <span v-if="app.pendingCountersigns.length > 0" class="countersign-hint">
                (含{{ app.pendingCountersigns.length }}个加签待审)
              </span>
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
            <a-dropdown>
              <a-button size="large">
                <UserAddOutlined />
                加签
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="handlePreCountersign">
                    <UserAddOutlined /> 前加签（加签人先审）
                  </a-menu-item>
                  <a-menu-item @click="handlePostCountersign">
                    <UserAddOutlined /> 后加签（当前人先审）
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
            <a-button size="large" @click="handleTransfer">
              <SwapOutlined />
              转办
            </a-button>
          </div>

          <div v-if="canWithdrawApp" class="withdraw-actions">
            <a-button @click="handleWithdraw">
              <RollbackOutlined />
              撤回申请
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
                    {{ getActionLabel(getNodeRecord(node.id)?.action || '') }}
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
                    <span v-if="getNodeRecord(node.id)?.transferToName" class="transfer-info">
                      → {{ getNodeRecord(node.id)?.transferToName }}
                    </span>
                    <span class="timeline-record-time">{{ formatDate(getNodeRecord(node.id)!.createdAt) }}</span>
                  </div>
                  <div v-if="getNodeRecord(node.id)?.comment" class="timeline-record-comment">
                    <FileTextOutlined /> {{ getNodeRecord(node.id)?.comment }}
                  </div>
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>

          <div v-if="records.filter(r => r.action === 'withdraw').length > 0" class="withdraw-record">
            <a-tag color="default">撤回记录</a-tag>
            <div v-for="r in records.filter(r => r.action === 'withdraw')" :key="r.id" class="withdraw-item">
              {{ r.approverName }} 于 {{ formatDate(r.createdAt) }} 撤回了申请
            </div>
          </div>

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

    <a-modal
      v-model:open="preCountersignVisible"
      title="前加签"
      ok-text="确认加签"
      cancel-text="取消"
      @ok="submitPreCountersign"
    >
      <a-alert message="前加签：插入的审批人先于当前人审批" type="info" show-icon style="margin-bottom: 16px" />
      <a-form layout="vertical">
        <a-form-item label="加签人类型">
          <a-select v-model:value="preCountersignType" :options="approverTypeOptions" />
        </a-form-item>
        <a-form-item v-if="preCountersignType === 'user'" label="选择加签用户">
          <a-select v-model:value="preCountersignIds" :options="userOptions" mode="multiple" placeholder="请选择用户" />
        </a-form-item>
        <a-form-item v-if="preCountersignType === 'role'" label="选择加签角色">
          <a-select v-model:value="preCountersignIds" :options="roleOptions" mode="multiple" placeholder="请选择角色" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="postCountersignVisible"
      title="后加签"
      ok-text="确认加签"
      cancel-text="取消"
      @ok="submitPostCountersign"
    >
      <a-alert message="后加签：当前人审批后，加签人再审批" type="info" show-icon style="margin-bottom: 16px" />
      <a-form layout="vertical">
        <a-form-item label="加签人类型">
          <a-select v-model:value="postCountersignType" :options="approverTypeOptions" />
        </a-form-item>
        <a-form-item v-if="postCountersignType === 'user'" label="选择加签用户">
          <a-select v-model:value="postCountersignIds" :options="userOptions" mode="multiple" placeholder="请选择用户" />
        </a-form-item>
        <a-form-item v-if="postCountersignType === 'role'" label="选择加签角色">
          <a-select v-model:value="postCountersignIds" :options="roleOptions" mode="multiple" placeholder="请选择角色" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="transferVisible"
      title="转办"
      ok-text="确认转办"
      cancel-text="取消"
      @ok="submitTransfer"
    >
      <a-alert message="转办后原待办将消失，转给他人处理" type="info" show-icon style="margin-bottom: 16px" />
      <a-form layout="vertical">
        <a-form-item label="转办给" required>
          <a-select v-model:value="transferToId" :options="userOptions" placeholder="请选择转办人" show-search :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())" />
        </a-form-item>
        <a-form-item label="转办说明">
          <a-textarea v-model:value="transferComment" placeholder="请输入转办说明" :rows="3" />
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
  flex-wrap: wrap;
}

.withdraw-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.countersign-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 8px;
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

.transfer-info {
  color: #1677ff;
  margin: 0 4px;
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

.withdraw-record {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.withdraw-item {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-top: 4px;
}
</style>
