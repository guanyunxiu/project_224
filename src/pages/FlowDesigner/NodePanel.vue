<script setup lang="ts">
import { PlayCircleOutlined, UserSwitchOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'

const nodeTypes = [
  { type: 'start', label: '开始节点', icon: PlayCircleOutlined, color: '#1677ff', desc: '流程起点' },
  { type: 'approver', label: '审批人节点', icon: UserSwitchOutlined, color: '#fa8c16', desc: '审批处理' },
  { type: 'end', label: '结束节点', icon: CheckCircleOutlined, color: '#52c41a', desc: '流程终点' },
]

function onDragStart(event: DragEvent, nodeType: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }
}
</script>

<template>
  <div class="node-panel">
    <div class="panel-title">节点面板</div>
    <div class="node-list">
      <div
        v-for="item in nodeTypes"
        :key="item.type"
        class="node-item"
        :draggable="true"
        @dragstart="onDragStart($event, item.type)"
      >
        <div class="node-item-icon" :style="{ background: item.color + '15', color: item.color }">
          <component :is="item.icon" style="font-size: 20px" />
        </div>
        <div class="node-item-info">
          <div class="node-item-label">{{ item.label }}</div>
          <div class="node-item-desc">{{ item.desc }}</div>
        </div>
      </div>
    </div>
    <div class="panel-tip">
      拖拽节点到画布中添加
    </div>
  </div>
</template>

<style scoped lang="less">
.node-panel {
  width: 200px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
}

.panel-title {
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  border-bottom: 1px solid #f0f0f0;
}

.node-list {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    border-color: #1677ff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
  }

  &:active {
    cursor: grabbing;
  }
}

.node-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-item-info {
  flex: 1;
  min-width: 0;
}

.node-item-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.node-item-desc {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.panel-tip {
  padding: 12px 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  border-top: 1px solid #f0f0f0;
  text-align: center;
}
</style>
