<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { CheckCircleOutlined } from '@ant-design/icons-vue'

defineProps<{
  data: { label: string }
  selected?: boolean
}>()
</script>

<template>
  <div class="end-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-content">
      <CheckCircleOutlined class="node-icon" />
      <span class="node-label">{{ data.label }}</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.end-node {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 2px solid #b7eb8f;
  border-radius: 20px;
  padding: 8px 20px;
  min-width: 120px;
  transition: all 0.2s;

  &.selected {
    border-color: #52c41a;
    box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.2);
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
  color: #52c41a;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  color: #389e0d;
  white-space: nowrap;
}
</style>
