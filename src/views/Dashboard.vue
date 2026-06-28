<!-- frontend/src/views/Dashboard.vue -->
<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6" v-for="stat in stats" :key="stat.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: stat.color }">
              <el-icon :size="28"><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-title">{{ stat.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近消息</span>
          </template>
          <el-table :data="recentMessages" style="width: 100%">
            <el-table-column prop="content" label="内容" min-width="150" />
            <el-table-column prop="account" label="账号" width="120" />
            <el-table-column prop="to" label="对方" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sentAt" label="时间" width="160">
              <template #default="{ row }">
                {{ dayjs(row.sentAt).format('YYYY-MM-DD HH:mm') }}
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
                <el-tag :type="row.status === 'online' ? 'success' : 'info'">
                  {{ row.status === 'online' ? '在线' : '离线' }}
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
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { DataLine, ChatDotRound, User, Iphone } from '@element-plus/icons-vue'
import { useAccountStore } from '@/stores/account'

const accountStore = useAccountStore()

const stats = ref([
  { title: '总账号', value: 0, icon: Iphone, color: '#409eff' },
  { title: '在线账号', value: 0, icon: DataLine, color: '#67c23a' },
  { title: '今日消息', value: 0, icon: ChatDotRound, color: '#e6a23c' },
  { title: '总用户', value: 0, icon: User, color: '#909399' }
])

const recentMessages = ref([])
const accountStatus = ref([])

const getStatusType = (status) => {
  const map = { sent: '', delivered: 'success', read: 'success', failed: 'danger' }
  return map[status] || ''
}

const getStatusLabel = (status) => {
  const map = { sent: '已发送', delivered: '已送达', read: '已读', failed: '失败' }
  return map[status] || status
}

onMounted(async () => {
  await accountStore.fetchAccounts()
  accountStatus.value = accountStore.accounts.map(a => ({
    account: a.account,
    nickname: a.nickname || a.account,
    status: a.status || 'offline'
  }))
  stats.value[0].value = accountStore.accounts.length
  stats.value[1].value = accountStore.accounts.filter(a => a.status === 'online').length
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