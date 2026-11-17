<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <span>📱 群控系统</span>
      </div>
      <div class="menu-wrapper">
        <el-menu router :default-active="$route.path" class="menu" background-color="#1f2d3d" text-color="#bfcbd9"
          active-text-color="#409eff">

          <!-- ✅ 动态渲染菜单 -->
          <el-menu-item v-for="item in menuList" :key="item.path" :index="'/' + item.path">
            <el-icon v-if="item.meta.icon">
              <component :is="item.meta.icon" />
            </el-icon>
            <span>{{ item.meta.title }}</span>
          </el-menu-item>

        </el-menu>
      </div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h2>{{ currentTitle }}</h2>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" :icon="UserFilled" />
              <span class="username">{{ username }}</span>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon>
                    <User />
                  </el-icon> 个人信息
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon> 退出登录
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
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserFilled, ArrowDown, User, SwitchButton } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentTitle = computed(() => route.meta?.title || '管理后台')
const username = computed(() => authStore.userInfo?.username || 'Admin')

// ✅ 获取当前用户的角色 (默认给 3 操作员)
const userRole = computed(() => authStore.userInfo?.role || 3)

// ✅ 核心：动态过滤菜单
const menuList = computed(() => {
  // 1. 从路由配置里拿到 Layout 下的所有子路由
  const rootRoute = router.options.routes.find(r => r.path === '/')
  if (!rootRoute || !rootRoute.children) return []

  // 2. 过滤出当前角色有权访问的菜单
  return rootRoute.children.filter(child => {
    if (child.meta?.hidden) return false // 如果设置了隐藏
    if (!child.meta || !child.meta.roles) return true // 没设角色的默认显示
    return child.meta.roles.includes(userRole.value) // 校验角色
  })
})

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
/* 您的样式保持不变 */
.layout-container {
  height: 100vh;
}

.sidebar {
  background: #1f2d3d;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #2c3e50;
  flex-shrink: 0;
}

.menu-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.menu-wrapper::-webkit-scrollbar {
  width: 4px;
}

.menu-wrapper::-webkit-scrollbar-thumb {
  background: #4a5a6a;
  border-radius: 2px;
}

.menu-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.menu {
  border-right: none;
  min-height: 100%;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.header-left h2 {
  font-size: 18px;
  color: #333;
  margin: 0;
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
  padding: 4px 12px;
  border-radius: 20px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f7fa;
}

.username {
  color: #333;
  font-size: 14px;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
}
</style>