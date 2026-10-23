<template>
  <div class="dashboard">
    <!-- 工具栏 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <span style="font-size:16px;font-weight:600;">总览</span>
      <el-button type="primary" plain :loading="exporting" @click="handleExportAccounts">
        <el-icon>
          <Download />
        </el-icon> 导出所有账号
      </el-button>
    </div>

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
        <el-card style="margin-bottom:20px">
          <!-- 协议服状态 -->
          <div style="display:flex;align-items:center;gap:10px;"
            v-if="protocolStatus && protocolStatus.last_heartbeat && protocolStatus.last_heartbeat !== '0001-01-01T00:00:00Z'">
            <span>协议服状态：</span>
            <el-tag :type="protocolStatus.is_alive ? 'success' : 'danger'" size="large" effect="dark">
              {{ protocolStatus.is_alive ? '🟢 正常运行' : '🔴 异常/失联' }}
            </el-tag>
            <span v-if="protocolStatus.is_alive" style="color:#999;font-size:13px;">
              内存占用: {{ protocolStatus.memory_rss_mb?.toFixed(1) || 0 }} MB
            </span>
            <span v-else style="color:#f56c6c;font-size:13px;">
              {{ protocolStatus.elapsed_seconds > 0 ? `已失联 ${Math.floor(protocolStatus.elapsed_seconds)} 秒` : '' }}
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, DataLine, Warning, SwitchButton } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import api from '@/api'


const protocolStatus = ref({ is_alive: false })

const fetchProtocolStatus = async () => {
  try {
    const res = await api.get('/system/protocol-status')
    if (res.code === 0) {
      protocolStatus.value = res.data
    }
  } catch (e) { }
}

onMounted(() => {
  fetchProtocolStatus()
  intervalProtocol = setInterval(fetchProtocolStatus, 10000)
})

// ============ 统计卡片 ============
const stats = ref([
  { title: '总账号', value: 0, icon: DataLine, color: '#409eff' },
  { title: '在线账号', value: 0, icon: DataLine, color: '#67c23a' },
  { title: '离线账号', value: 0, icon: SwitchButton, color: '#909399' },
  { title: '封禁账号', value: 0, icon: Warning, color: '#f56c6c' }
])

const recentMessages = ref([])
let intervalId = null
let intervalProtocol = null

// ============ 导出 ============
const exporting = ref(false)

const handleExportAccounts = async () => {
  exporting.value = true
  try {
    const res = await api.post('/whatsapp/accounts/export')
    if (res.code === 0) {
      const { content, filename, count } = res.data

      // Blob 下载（同源虚拟文件，download 属性必生效）
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'accounts.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      ElMessage.success(`已导出 ${count} 个账号`)
    } else {
      ElMessage.error(res.message || '导出失败')
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + (error.message || ''))
  } finally {
    exporting.value = false
  }
}

// ============ 状态映射 ============
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

// ============ 数据获取 ============
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

// ============ 生命周期 ============
onMounted(() => {
  fetchData()
  intervalId = setInterval(fetchData, 30000)
})

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (intervalProtocol) {
    clearInterval(intervalProtocol)
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