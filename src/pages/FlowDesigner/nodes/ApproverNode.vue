<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { UserSwitchOutlined } from '@ant-design/icons-vue'

defineProps<{
  data: { label: string; approverType?: string; approverIds?: string[] }
  selected?: boolean
}>()
</script>

<template>
  <div class="approver-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-content">
      <UserSwitchOutlined class="node-icon" />
      <span class="node-label">{{ data.label }}</span>
    </div>
    <div v-if="data.approverType" class="node-badge">
      {{ data.approverType === 'user' ? '指定用户' : data.approverType === 'role' ? '指定角色' : '发起人主管' }}
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped lang="less">
.approver-node {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border: 2px solid #ffd591;
  border-radius: 8px;
  padding: 10px 20px;
  min-width: 140px;
  transition: all 0.2s;

  &.selected {
    border-color: #fa8c16;
    box-shadow: 0 0 0 3px rgba(250, 140, 22, 0.2);
  }
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.node-icon {
  font-size: 16px;
  color: #fa8c16;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  color: #d46b08;
  white-space: nowrap;
}

.node-badge {
  font-size: 11px;
  color: #ad6800;
  text-align: center;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #ffd591;
}
</style>
