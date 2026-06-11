<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { ForkOutlined, MergeCellsOutlined, BranchesOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

const props = defineProps<{
  data: { label: string; gatewayType?: 'split' | 'converge' }
  selected?: boolean
}>()

const isParallel = computed(() => !props.data.label?.includes('条件'))
const gatewayType = computed(() => props.data.gatewayType || 'split')
const icon = computed(() => {
  if (isParallel.value) {
    return gatewayType.value === 'split' ? ForkOutlined : MergeCellsOutlined
  }
  return BranchesOutlined
})
const typeLabel = computed(() => {
  if (isParallel.value) {
    return gatewayType.value === 'split' ? '并行分裂' : '并行汇聚'
  }
  return '条件分支'
})
</script>

<template>
  <div class="gateway-node" :class="[`gateway-${gatewayType}`, { selected }]">
    <Handle type="target" :position="Position.Top" />
    <div class="gateway-diamond">
      <div class="gateway-inner">
        <component :is="icon" class="gateway-icon" />
      </div>
    </div>
    <div class="gateway-label">{{ data.label }}</div>
    <div class="gateway-badge">{{ typeLabel }}</div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped lang="less">
.gateway-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;

  &.selected .gateway-diamond {
    box-shadow: 0 0 0 3px rgba(114, 46, 209, 0.3);
  }
}

.gateway-diamond {
  width: 50px;
  height: 50px;
  transform: rotate(45deg);
  border: 2px solid #b37feb;
  background: linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.gateway-inner {
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gateway-icon {
  font-size: 18px;
  color: #722ed1;
}

.gateway-label {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #531dab;
  white-space: nowrap;
  text-align: center;
}

.gateway-badge {
  font-size: 10px;
  color: #9254de;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  border-radius: 4px;
  padding: 1px 6px;
  margin-top: 2px;
  white-space: nowrap;
}
</style>
