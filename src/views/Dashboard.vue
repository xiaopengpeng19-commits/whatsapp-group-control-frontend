<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6" v-for="stat in stats" :key="stat.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: stat.color }">
              <el-icon :size="28">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-title">{{ stat.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近消息</span>
          </template>
          <el-table :data="recentMessages" style="width: 100%" max-height="400">
            <el-table-column prop="content" label="内容" min-width="150" show-overflow-tooltip />
            <el-table-column prop="account" label="账号" width="120" />
            <el-table-column prop="to" label="对方" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sentAt" label="时间" width="160">
              <template #default="{ row }">
                {{ dayjs(row.sentAt).format('MM-DD HH:mm') }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <span>账号状态</span>
          </template>
          <el-table :data="accountStatus" style="width: 100%">
            <el-table-column prop="account" label="账号" />
            <el-table-column prop="nickname" label="昵称" />
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="isLogin" label="登录" width="100">
              <template #default="{ row }">
                <el-tag :type="row.isLogin ? 'success' : 'danger'" size="small">
                  {{ row.isLogin ? '已登录' : '未登录' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { DataLine, User, Iphone, Warning, SwitchButton } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'

const stats = ref([
  { title: '总账号', value: 0, icon: Iphone, color: '#409eff' },
  { title: '在线账号', value: 0, icon: DataLine, color: '#67c23a' },
  { title: '离线账号', value: 0, icon: SwitchButton, color: '#909399' },
  { title: '封禁账号', value: 0, icon: Warning, color: '#f56c6c' }
])

const recentMessages = ref([])
const accountStatus = ref([])
let intervalId = null

const statusMap = {
  'online': '在线',
  'normal': '在线',
  'logging': '登录中',
  'offline': '离线',
  'banned': '封禁',
  'expired': '过期'
}

const statusTagTypeMap = {
  'online': 'success',
  'normal': 'success',
  'logging': 'warning',
  'offline': 'info',
  'banned': 'danger',
  'expired': 'danger'
}

const getStatusText = (status) => {
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  return statusTagTypeMap[status] || 'info'
}

const getStatusType = (status) => {
  const map = {
    sent: '',
    delivered: 'success',
    read: 'success',
    failed: 'danger',
    received: 'info'
  }
  return map[status] || ''
}

const getStatusLabel = (status) => {
  const map = {
    sent: '已发送',
    delivered: '已送达',
    read: '已读',
    failed: '失败',
    received: '已接收'
  }
  return map[status] || status
}

const fetchData = async () => {
  try {
    // 获取账号列表
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      let data = res.data
      if (data && data.data && Array.isArray(data.data)) {
        data = data.data
      }
      const accounts = data || []
      accountStatus.value = accounts.map(a => ({
        account: a.account,
        nickname: a.nickname || a.account,
        status: a.status || 'offline',
        isLogin: a.isLogin || false
      }))

      stats.value[0].value = accounts.length
      // 在线：is_login == true
      stats.value[1].value = accounts.filter(a => a.isLogin === true).length
      // 离线：is_login == false（排除封禁）
      stats.value[2].value = accounts.filter(a => a.isLogin === false && a.status !== 'banned').length
      // 封禁：status == banned
      stats.value[3].value = accounts.filter(a => a.status === 'banned').length
    }

    // 获取消息列表
    const msgRes = await whatsapp.getMessages({ page: 1, page_size: 10 })
    if (msgRes.code === 0) {
      let msgs = msgRes.data
      if (msgs && msgs.data && Array.isArray(msgs.data)) {
        msgs = msgs.data
      }
      recentMessages.value = msgs || []
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  }
}

onMounted(() => {
  fetchData()
  // 每30秒刷新一次
  intervalId = setInterval(fetchData, 30000)
})

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<style scoped>
.stat-card {
  border-radius: 12px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.stat-title {
  color: #999;
  font-size: 14px;
  margin-top: 4px;
}
</style>