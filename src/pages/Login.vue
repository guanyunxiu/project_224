<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { ApartmentOutlined, UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value.trim()) {
    message.warning('请输入用户名')
    return
  }
  if (!password.value) {
    message.warning('请输入密码')
    return
  }

  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    const success = userStore.login(username.value.trim(), password.value)
    if (success) {
      message.success(`欢迎，${userStore.currentUser.name}！`)
      const redirect = (route.query.redirect as string) || '/flows'
      router.push(redirect)
    } else {
      message.error('用户名或密码错误')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="login-logo">
          <ApartmentOutlined style="font-size: 40px; color: #1677FF" />
        </div>
        <h1 class="login-title">线性审批流系统</h1>
        <p class="login-subtitle">请登录以继续访问</p>
      </div>

      <a-form class="login-form" layout="vertical">
        <a-form-item label="用户名">
          <a-input
            v-model:value="username"
            size="large"
            placeholder="请输入用户名"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <UserOutlined style="color: rgba(0,0,0,0.25)" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="密码">
          <a-input-password
            v-model:value="password"
            size="large"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <LockOutlined style="color: rgba(0,0,0,0.25)" />
            </template>
          </a-input-password>
        </a-form-item>

        <a-button
          type="primary"
          size="large"
          block
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </a-button>
      </a-form>

      <div class="login-tips">
        <p>测试账号：赵六 / 123456（员工）</p>
        <p>其他用户：张三(CEO)、李四(经理)、王五(主管)、孙七(财务)</p>
        <p>所有用户密码均为：123456</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.login-tips {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.8;

  p {
    margin: 0;
  }
}
</style>
