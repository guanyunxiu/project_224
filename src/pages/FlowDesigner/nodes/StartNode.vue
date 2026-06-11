<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { PlayCircleOutlined } from '@ant-design/icons-vue'

defineProps<{
  data: { label: string }
  selected?: boolean
}>()
</script>

<template>
  <div class="start-node" :class="{ selected }">
    <Handle type="source" :position="Position.Bottom" />
    <div class="node-content">
      <PlayCircleOutlined class="node-icon" />
      <span class="node-label">{{ data.label }}</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.start-node {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border: 2px solid #91caff;
  border-radius: 20px;
  padding: 8px 20px;
  min-width: 120px;
  transition: all 0.2s;

  &.selected {
    border-color: #1677ff;
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.2);
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
  color: #1677ff;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  color: #0958d9;
  white-space: nowrap;
}
</style>
