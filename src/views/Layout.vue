<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">{{ APP_ICON }}</span>
          <span class="logo-text">{{ APP_NAME }}</span>
        </div>
        <div class="page-title">{{ currentTitle }}</div>
        <el-menu
          router
          :default-active="route.path"
          mode="horizontal"
          class="top-menu"
          background-color="transparent"
          text-color="var(--text-muted)"
          active-text-color="var(--text)"
          :ellipsis="false"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataLine /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/accounts">
            <el-icon><Iphone /></el-icon>
            <span>账号管理</span>
          </el-menu-item>
          <el-menu-item index="/messages">
            <el-icon><ChatDotRound /></el-icon>
            <span>消息管理</span>
          </el-menu-item>
          <el-menu-item index="/message-history">
            <el-icon><Document /></el-icon>
            <span>消息记录</span>
          </el-menu-item>
          <el-menu-item index="/proxies">
            <el-icon><Connection /></el-icon>
            <span>代理管理</span>
          </el-menu-item>
          <el-menu-item index="/targets">
            <el-icon><UserFilled /></el-icon>
            <span>目标账号</span>
          </el-menu-item>
          <el-menu-item index="/broadcast">
            <el-icon><Promotion /></el-icon>
            <span>群发任务</span>
          </el-menu-item>
          <el-menu-item index="/check-whatsapp">
            <el-icon><Search /></el-icon>
            <span>检查注册</span>
          </el-menu-item>
          <el-menu-item index="/contacts">
            <el-icon><User /></el-icon>
            <span>联系人</span>
          </el-menu-item>
          <el-menu-item index="/users">
            <el-icon><Setting /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
        </el-menu>
      </div>

      <div class="header-right">
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-avatar :size="32" :icon="UserFilled" />
            <span class="username">{{ username }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon> 个人信息
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  UserFilled,
  ArrowDown,
  DataLine,
  Iphone,
  ChatDotRound,
  Document,
  Connection,
  Promotion,
  Search,
  Setting,
  User,
  SwitchButton
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { APP_ICON, APP_NAME } from '@/config/app'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentTitle = computed(() => route.meta?.title || '管理后台')
const appName = APP_NAME
const username = computed(() => authStore.userInfo?.username || 'Admin')

const handleCommand = async (command) => {
  if (command === 'logout') {
    authStore.logout()
    ElMessage.success('已退出')
    router.push('/login')
  } else if (command === 'profile') {
    ElMessage.info('个人信息功能开发中')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: var(--bg);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 76px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(2, 8, 23, 0.35);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-dark);
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}
.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24);
}
.page-title {
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.top-menu {
  flex: 1;
  border-bottom: none;
  background: transparent;
  justify-content: flex-start;
  margin-left: 8px;
}
.top-menu :deep(.el-menu-item),
.top-menu :deep(.el-submenu__title) {
  height: 74px;
  line-height: 74px;
  border-bottom: 2px solid transparent;
  padding: 0 16px;
}
.top-menu :deep(.el-menu-item.is-active) {
  background: rgba(96, 165, 250, 0.16) !important;
  color: var(--text) !important;
  border-bottom-color: var(--primary) !important;
}
.top-menu :deep(.el-menu-item:hover),
.top-menu :deep(.el-submenu__title:hover) {
  background: rgba(96, 165, 250, 0.12) !important;
  color: var(--text) !important;
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 999px;
  transition: background 0.2s ease;
}
.user-info:hover {
  background: rgba(96, 165, 250, 0.12);
}
.username {
  color: var(--text-dark);
  font-size: 14px;
}
.main-content {
  background: var(--bg);
  padding: 20px;
}
</style>
