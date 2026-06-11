<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormField } from '@/types'

const props = defineProps<{
  modelValue: string
  formFields: FormField[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const tokens = ref<string[]>([])
const error = ref('')

const comparisonOps = ['>', '<', '>=', '<=', '==', '!=']
const logicalOps = ['&&', '||']
const allOperators = [...comparisonOps, ...logicalOps]

const fieldOptions = computed(() =>
  props.formFields.map(f => ({ value: f.key, label: `${f.label} (${f.key})` }))
)

const numberFields = computed(() =>
  props.formFields.filter(f => f.type === 'number' || f.type === 'boolean')
)

watch(() => props.modelValue, (val) => {
  if (!val) {
    tokens.value = []
    return
  }
  const parsed = parseExpression(val)
  if (parsed) {
    tokens.value = parsed
  }
}, { immediate: true })

function parseExpression(expr: string): string[] | null {
  try {
    const result: string[] = []
    let remaining = expr.trim()
    while (remaining.length > 0) {
      remaining = remaining.trimStart()
      if (!remaining) break

      const fieldMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/)
      if (fieldMatch && props.formFields.some(f => f.key === fieldMatch[1])) {
        result.push(fieldMatch[1])
        remaining = remaining.slice(fieldMatch[1].length)
        continue
      }

      const opMatch = remaining.match(/^(>=|<=|!=|==|&&|\|\||>|<)/)
      if (opMatch) {
        result.push(opMatch[1])
        remaining = remaining.slice(opMatch[1].length)
        continue
      }

      const parenMatch = remaining.match(/^([()])/)
      if (parenMatch) {
        result.push(parenMatch[1])
        remaining = remaining.slice(1)
        continue
      }

      const numMatch = remaining.match(/^(\d+\.?\d*)/)
      if (numMatch) {
        result.push(numMatch[1])
        remaining = remaining.slice(numMatch[1].length)
        continue
      }

      const strMatch = remaining.match(/^'([^']*)'/)
      if (strMatch) {
        result.push(`'${strMatch[1]}'`)
        remaining = remaining.slice(strMatch[0].length)
        continue
      }

      const boolMatch = remaining.match(/^(true|false)/)
      if (boolMatch) {
        result.push(boolMatch[1])
        remaining = remaining.slice(boolMatch[1].length)
        continue
      }

      break
    }
    return result
  } catch {
    return null
  }
}

function addToken(token: string) {
  tokens.value.push(token)
  emitExpression()
}

function addField(fieldKey: string) {
  tokens.value.push(fieldKey)
  emitExpression()
}

function removeToken(index: number) {
  tokens.value.splice(index, 1)
  emitExpression()
}

function emitExpression() {
  const expr = tokens.value.join(' ')
  error.value = ''
  emit('update:modelValue', expr)
}

function getTokenType(token: string): 'field' | 'operator' | 'value' | 'paren' {
  if (props.formFields.some(f => f.key === token)) return 'field'
  if (allOperators.includes(token)) return 'operator'
  if (token === '(' || token === ')') return 'paren'
  return 'value'
}

function getTokenColor(token: string): string {
  const type = getTokenType(token)
  switch (type) {
    case 'field': return '#1677ff'
    case 'operator': return '#722ed1'
    case 'paren': return '#8c8c8c'
    case 'value': return '#fa8c16'
  }
}

function clearAll() {
  tokens.value = []
  error.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="expression-editor">
    <div class="token-display">
      <template v-if="tokens.length > 0">
        <span
          v-for="(token, index) in tokens"
          :key="index"
          class="token-chip"
          :style="{ color: getTokenColor(token), borderColor: getTokenColor(token) + '40', background: getTokenColor(token) + '10' }"
          @click="removeToken(index)"
        >
          {{ token }}
          <span class="token-remove">×</span>
        </span>
      </template>
      <span v-else class="token-placeholder">点击下方按钮构建表达式</span>
    </div>

    <div class="editor-section">
      <div class="section-label">表单字段</div>
      <div class="btn-group">
        <a-button
          v-for="field in formFields"
          :key="field.key"
          size="small"
          type="link"
          @click="addField(field.key)"
        >
          {{ field.label }}
        </a-button>
        <span v-if="formFields.length === 0" class="empty-hint">请先在流程中配置表单字段</span>
      </div>
    </div>

    <div class="editor-section">
      <div class="section-label">比较运算符</div>
      <div class="btn-group">
        <a-button
          v-for="op in comparisonOps"
          :key="op"
          size="small"
          @click="addToken(op)"
        >
          {{ op }}
        </a-button>
      </div>
    </div>

    <div class="editor-section">
      <div class="section-label">逻辑运算符</div>
      <div class="btn-group">
        <a-button
          v-for="op in logicalOps"
          :key="op"
          size="small"
          @click="addToken(op)"
        >
          {{ op }}
        </a-button>
        <a-button size="small" @click="addToken('(')">(</a-button>
        <a-button size="small" @click="addToken(')')">)</a-button>
      </div>
    </div>

    <div class="editor-section">
      <div class="section-label">数值/布尔</div>
      <div class="btn-group">
        <a-button size="small" @click="addToken('0')">0</a-button>
        <a-button size="small" @click="addToken('true')">true</a-button>
        <a-button size="small" @click="addToken('false')">false</a-button>
      </div>
    </div>

    <div class="editor-actions">
      <a-button size="small" danger @click="clearAll">清空</a-button>
    </div>

    <div v-if="error" class="editor-error">{{ error }}</div>
  </div>
</template>

<style scoped lang="less">
.expression-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-display {
  min-height: 36px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  background: #fafafa;
}

.token-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s;

  &:hover {
    opacity: 0.7;
  }
}

.token-remove {
  font-size: 12px;
  margin-left: 2px;
  opacity: 0.5;
}

.token-placeholder {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-label {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 500;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-hint {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.25);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
}

.editor-error {
  font-size: 12px;
  color: #ff4d4f;
}
</style>
