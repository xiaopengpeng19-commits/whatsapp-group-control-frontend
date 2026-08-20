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

    <!-- 最近消息 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
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
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { DataLine, Warning, SwitchButton } from '@element-plus/icons-vue'
import api from '@/api'

const stats = ref([
  { title: '总账号', value: 0, icon: DataLine, color: '#409eff' },
  { title: '在线账号', value: 0, icon: DataLine, color: '#67c23a' },
  { title: '离线账号', value: 0, icon: SwitchButton, color: '#909399' },
  { title: '封禁账号', value: 0, icon: Warning, color: '#f56c6c' }
])

const recentMessages = ref([])
let intervalId = null

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
    // 1. 获取统计数据
    const statsRes = await api.get('/dashboard/stats')
    if (statsRes.code === 0) {
      stats.value[0].value = statsRes.data.total || 0
      stats.value[1].value = statsRes.data.online || 0
      stats.value[2].value = statsRes.data.offline || 0
      stats.value[3].value = statsRes.data.banned || 0
    }

    // 2. 获取最近消息
    const msgRes = await api.get('/whatsapp/messages/get', {
      params: { page: 1, page_size: 10 }
    })
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