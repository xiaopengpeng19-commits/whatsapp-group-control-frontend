<template>
  <div class="chat">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 创建互聊任务
      </el-button>
      <el-button @click="fetchTasks">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
      <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchTasks" style="width:130px;margin-left:10px">
        <el-option label="全部" value="" />
        <el-option label="待执行" value="pending" />
        <el-option label="执行中" value="running" />
        <el-option label="已暂停" value="paused" />
        <el-option label="已完成" value="completed" />
        <el-option label="已停止" value="stopped" />
      </el-select>
    </div>

    <!-- 任务列表 -->
    <el-table :data="tasks" v-loading="loading" border>
      <el-table-column prop="name" label="任务名称" width="140" />
      <el-table-column label="参与账号" min-width="200">
        <template #default="{ row }">
          <el-tag v-for="acc in row.accounts" :key="acc" size="small" style="margin:2px">
            {{ acc }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="language" label="语言" width="70">
        <template #default="{ row }">
          {{ getLanguageLabel(row.language) }}
        </template>
      </el-table-column>
      <el-table-column label="配对间隔" width="110">
        <template #default="{ row }">
          <span style="font-size:13px;">
            {{ row.pairIntervalMin || 5 }}~{{ row.pairIntervalMax || 15 }}分钟
          </span>
        </template>
      </el-table-column>
      <el-table-column label="进度" width="130">
        <template #default="{ row }">
          <el-progress 
            :percentage="getProgress(row)" 
            :color="getProgressColor(row)"
            :stroke-width="6"
            style="width:100px"
          />
        </template>
      </el-table-column>
      <el-table-column prop="activeSessions" label="会话数" width="70" align="center" />
      <el-table-column prop="totalMessages" label="消息数" width="70" align="center" />
      <el-table-column prop="totalPairs" label="配对数" width="70" align="center" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="150">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="showTaskDetail(row)">
            详情
          </el-button>
          <el-button 
            v-if="row.status === 'pending' || row.status === 'paused'"
            size="small" 
            type="success" 
            @click="handleStart(row)"
          >
            启动
          </el-button>
          <el-button 
            v-if="row.status === 'running'"
            size="small" 
            type="warning" 
            @click="handlePause(row)"
          >
            暂停
          </el-button>
          <el-button 
            v-if="row.status === 'paused'"
            size="small" 
            type="success" 
            @click="handleResume(row)"
          >
            恢复
          </el-button>
          <el-button 
            v-if="row.status === 'running' || row.status === 'paused'"
            size="small" 
            type="danger" 
            @click="handleStop(row)"
          >
            停止
          </el-button>
          <el-button size="small" type="danger" plain @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchTasks"
        @current-change="fetchTasks"
      />
    </div>

    <!-- 创建任务对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建互聊任务" width="700px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="任务名称" required>
          <el-input v-model="createForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="参与账号" required>
          <el-select v-model="createForm.accounts" multiple placeholder="选择参与账号" style="width:100%">
            <el-option
              v-for="item in allAccounts"
              :key="item.account"
              :label="item.account"
              :value="item.account"
            />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px;">至少选择2个账号</div>
        </el-form-item>
        <el-form-item label="消息语言">
          <el-select v-model="createForm.language" style="width:100%">
            <el-option label="中文" value="zh" />
            <el-option label="English" value="en" />
            <el-option label="Português" value="pt" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">对话参数</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发起概率">
              <el-slider v-model="createForm.initiateRate" :min="10" :max="100" :step="5" show-stops />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回复概率">
              <el-slider v-model="createForm.replyRate" :min="10" :max="100" :step="5" show-stops />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="消息间隔">
              <el-input-number v-model="createForm.minDelay" :min="1" :max="30" style="width:100%" />
              <span style="font-size:12px;color:#999;">~</span>
              <el-input-number v-model="createForm.maxDelay" :min="2" :max="60" style="width:100px" />
              <span style="font-size:12px;color:#999;">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="对话轮数">
              <el-input-number v-model="createForm.minRounds" :min="1" :max="20" style="width:100%" />
              <span style="font-size:12px;color:#999;">~</span>
              <el-input-number v-model="createForm.maxRounds" :min="2" :max="50" style="width:100px" />
              <span style="font-size:12px;color:#999;">轮</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="最大并发">
          <el-input-number v-model="createForm.maxConcurrent" :min="1" :max="10" style="width:100%" />
          <span style="font-size:12px;color:#999;margin-left:8px;">同时进行的对话数</span>
        </el-form-item>

        <el-divider content-position="left">配对间隔</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最小间隔">
              <el-input-number 
                v-model="createForm.pairIntervalMin" 
                :min="1" 
                :max="60" 
                style="width:100%"
              />
              <span style="font-size:12px;color:#999;">分钟</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大间隔">
              <el-input-number 
                v-model="createForm.pairIntervalMax" 
                :min="2" 
                :max="120" 
                style="width:100%"
              />
              <span style="font-size:12px;color:#999;">分钟</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="联系人模式">
          <el-radio-group v-model="createForm.contactMode">
            <el-radio-button value="full">全连接</el-radio-button>
            <el-radio-button value="ondemand">按需添加</el-radio-button>
          </el-radio-group>
          <div style="font-size:12px;color:#999;margin-top:4px;">
            全连接：所有账号互加联系人；按需添加：只添加配对账号
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      title="任务详情" 
      width="1000px"
      :close-on-click-modal="false"
      @close="closeDetail"
    >
      <div v-if="detailTask" v-loading="detailLoading">
        <!-- 任务信息 -->
        <el-descriptions :column="4" border>
          <el-descriptions-item label="任务名称">{{ detailTask.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailTask.status)" size="small">
              {{ getStatusLabel(detailTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="语言">{{ getLanguageLabel(detailTask.language) }}</el-descriptions-item>
          <el-descriptions-item label="模式">{{ detailTask.contactMode === 'full' ? '全连接' : '按需添加' }}</el-descriptions-item>
          <el-descriptions-item label="参与账号" :span="4">
            <el-tag v-for="acc in detailTask.accounts" :key="acc" size="small" style="margin:2px">
              {{ acc }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起概率">{{ detailTask.initiateRate }}%</el-descriptions-item>
          <el-descriptions-item label="回复概率">{{ detailTask.replyRate }}%</el-descriptions-item>
          <el-descriptions-item label="消息间隔">{{ detailTask.minDelay }}~{{ detailTask.maxDelay }}s</el-descriptions-item>
          <el-descriptions-item label="轮数">{{ detailTask.minRounds }}~{{ detailTask.maxRounds }}</el-descriptions-item>
          <el-descriptions-item label="配对间隔">{{ detailTask.pairIntervalMin || 5 }}~{{ detailTask.pairIntervalMax || 15 }}分钟</el-descriptions-item>
          <el-descriptions-item label="总配对数">{{ detailTask.totalPairs || 0 }}</el-descriptions-item>
          <el-descriptions-item label="总消息">{{ detailTask.totalMessages || 0 }}</el-descriptions-item>
          <el-descriptions-item label="活跃会话">{{ detailTask.activeSessions || 0 }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(detailTask.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailTask.startedAt" label="启动时间">{{ formatTime(detailTask.startedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailTask.completedAt" label="完成时间">{{ formatTime(detailTask.completedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailTask.stopReason" label="停止原因" :span="4">
            <span style="color:#f56c6c;">{{ detailTask.stopReason }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailTask.lastError" label="错误信息" :span="4">
            <span style="color:#f56c6c;">{{ detailTask.lastError }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 会话列表 -->
        <div style="margin-top:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:bold;">活跃会话</span>
            <span style="color:#999;font-size:13px;">共 {{ sessions.length }} 个会话</span>
          </div>
          <div v-if="sessions.length > 0" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px;">
            <el-tag 
              v-for="session in sessions" 
              :key="session.id"
              :type="session.status === 'active' ? 'success' : 'info'"
              size="large"
            >
              {{ session.accountA }} ↔ {{ session.accountB }}
              <span style="margin-left:8px;font-size:12px;color:#999;">
                {{ session.rounds }}/{{ session.maxRounds }}轮
                {{ session.status === 'active' ? '🟢' : '🔴' }}
              </span>
            </el-tag>
          </div>
          <div v-else style="color:#999;text-align:center;padding:10px;background:#f5f7fa;border-radius:4px;">
            暂无活跃会话
          </div>
        </div>

        <!-- 对话消息 -->
        <div style="margin-top:15px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:bold;">对话记录</span>
            <span style="color:#999;font-size:13px;">共 {{ detailMessages.length }} 条消息</span>
          </div>
          <div class="message-list" ref="messageListRef">
            <div v-if="detailMessages.length === 0" style="text-align:center;color:#999;padding:40px;">
              暂无消息
            </div>
            <div v-for="msg in detailMessages" :key="msg.id" class="message-item">
              <div class="message-bubble" :class="msg.direction === 'send' ? 'message-send' : 'message-receive'">
                <div class="message-header">
                  <span class="message-from">{{ msg.fromAccount }}</span>
                  <span class="message-arrow">→</span>
                  <span class="message-to">{{ msg.toAccount }}</span>
                  <span class="message-round" :style="{ 
                    background: msg.round % 2 === 0 ? '#ecf5ff' : '#f0f9eb',
                    color: msg.round % 2 === 0 ? '#409eff' : '#67c23a'
                  }">
                    第{{ msg.round }}轮 第{{ msg.roundIndex }}句
                  </span>
                  <span class="message-time">{{ formatTime(msg.sentAt) }}</span>
                </div>
                <div class="message-content">{{ msg.content }}</div>
                <div class="message-footer">
                  <el-tag :type="getMessageStatusType(msg.status)" size="small">
                    {{ getMessageStatusLabel(msg.status) }}
                  </el-tag>
                  <span v-if="msg.messageId" style="font-size:11px;color:#999;margin-left:10px;">
                    ID: {{ msg.messageId }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const tasks = ref([])
const allAccounts = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const creating = ref(false)

const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const detailLoading = ref(false)
const detailTask = ref(null)
const sessions = ref([])
const detailMessages = ref([])
const messageListRef = ref(null)
const detailTimer = ref(null)

// ============ 创建表单 ============
const createForm = reactive({
  name: '',
  accounts: [],
  language: 'zh',
  initiateRate: 60,
  minDelay: 3,
  maxDelay: 15,
  minRounds: 2,
  maxRounds: 6,
  replyRate: 80,
  maxConcurrent: 2,
  contactMode: 'full',
  pairIntervalMin: 5,
  pairIntervalMax: 15
})

// ============ 工具函数 ============
const getLanguageLabel = (lang) => {
  const map = { zh: '中文', en: 'English', pt: 'Português' }
  return map[lang] || lang
}

const getStatusType = (status) => {
  const map = {
    pending: 'info',
    running: 'warning',
    paused: 'warning',
    completed: 'success',
    stopped: 'danger'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status) => {
  const map = {
    pending: '待执行',
    running: '执行中',
    paused: '已暂停',
    completed: '已完成',
    stopped: '已停止'
  }
  return map[status] || status
}

const getProgress = (row) => {
  if (!row.totalRounds || row.totalRounds === 0) return 0
  return Math.round(((row.currentRound || 0) / row.totalRounds) * 100)
}

const getProgressColor = (row) => {
  const p = getProgress(row)
  if (p === 100) return '#67c23a'
  if (p > 50) return '#409eff'
  return '#e6a23c'
}

const getMessageStatusType = (status) => {
  const map = { sent: 'info', delivered: 'success', read: 'success', failed: 'danger', received: 'info' }
  return map[status] || 'info'
}

const getMessageStatusLabel = (status) => {
  const map = { sent: '已发送', delivered: '已送达', read: '已读', failed: '失败', received: '已接收' }
  return map[status] || status
}

const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// ============ 数据获取 ============
const fetchAccounts = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/list')
    if (res.code === 0) {
      allAccounts.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/chat/tasks', { params })
    if (res.code === 0) {
      tasks.value = res.data.data || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 创建任务 ============
const handleCreate = async () => {
  if (!createForm.name) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (createForm.accounts.length < 2) {
    ElMessage.warning('请至少选择2个账号')
    return
  }
  if (createForm.minDelay > createForm.maxDelay) {
    ElMessage.warning('最小消息间隔不能大于最大间隔')
    return
  }
  if (createForm.minRounds > createForm.maxRounds) {
    ElMessage.warning('最少轮数不能大于最多轮数')
    return
  }
  if (createForm.pairIntervalMin > createForm.pairIntervalMax) {
    ElMessage.warning('最小配对间隔不能大于最大间隔')
    return
  }

  creating.value = true
  try {
    const res = await api.post('/chat/tasks', createForm)
    if (res.code === 0) {
      ElMessage.success('任务创建成功')
      showCreateDialog.value = false
      createForm.name = ''
      createForm.accounts = []
      fetchTasks()
    }
  } catch (error) {
    ElMessage.error('创建失败: ' + (error.message || ''))
  } finally {
    creating.value = false
  }
}

// ============ 任务操作 ============
const handleStart = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要启动任务 "${row.name}" 吗？`, '提示', { type: 'info' })
    const res = await api.post(`/chat/tasks/${row.id}/start`)
    if (res.code === 0) {
      ElMessage.success('任务已启动')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('启动失败')
    }
  }
}

const handlePause = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要暂停任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.post(`/chat/tasks/${row.id}/pause`)
    if (res.code === 0) {
      ElMessage.success('任务已暂停')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('暂停失败')
    }
  }
}

const handleResume = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要恢复任务 "${row.name}" 吗？`, '提示', { type: 'info' })
    const res = await api.post(`/chat/tasks/${row.id}/resume`)
    if (res.code === 0) {
      ElMessage.success('任务已恢复')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复失败')
    }
  }
}

const handleStop = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要停止任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.post(`/chat/tasks/${row.id}/stop`)
    if (res.code === 0) {
      ElMessage.success('任务已停止')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('停止失败')
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.delete(`/chat/tasks/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ============ 任务详情 ============
const showTaskDetail = async (row) => {
  showDetailDialog.value = true
  detailLoading.value = true
  detailTask.value = row
  sessions.value = []
  detailMessages.value = []
  
  try {
    const res = await api.get(`/chat/tasks/${row.id}`)
    if (res.code === 0) {
      detailTask.value = res.data.task
      sessions.value = res.data.sessions || []
      detailMessages.value = res.data.messages || []
      
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    ElMessage.error('获取任务详情失败')
  } finally {
    detailLoading.value = false
  }
  
  // 每5秒自动刷新消息
  if (detailTimer.value) {
    clearInterval(detailTimer.value)
  }
  detailTimer.value = setInterval(async () => {
    if (!showDetailDialog.value || !detailTask.value) return
    try {
      const res = await api.get(`/chat/tasks/${detailTask.value.id}`)
      if (res.code === 0) {
        const newMessages = res.data.messages || []
        if (newMessages.length !== detailMessages.value.length) {
          detailMessages.value = newMessages
          sessions.value = res.data.sessions || []
          detailTask.value = res.data.task
          await nextTick()
          scrollToBottom()
        }
      }
    } catch (error) {
      // ignore
    }
  }, 5000)
}

const closeDetail = () => {
  if (detailTimer.value) {
    clearInterval(detailTimer.value)
    detailTimer.value = null
  }
}

const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccounts()
  fetchTasks()
})

onBeforeUnmount(() => {
  if (detailTimer.value) {
    clearInterval(detailTimer.value)
    detailTimer.value = null
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}

.message-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.message-item {
  margin-bottom: 12px;
}

.message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.message-bubble:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.message-send {
  margin-right: auto;
  border-left: 4px solid #409eff;
}

.message-receive {
  margin-left: auto;
  border-right: 4px solid #67c23a;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.message-from {
  font-weight: 600;
  color: #333;
}

.message-arrow {
  color: #ccc;
}

.message-to {
  color: #666;
}

.message-round {
  font-size: 12px;
  padding: 0 10px;
  border-radius: 12px;
  font-weight: 500;
  background: #ecf5ff;
  color: #409eff;
}

.message-time {
  font-size: 12px;
  color: #bbb;
  margin-left: auto;
}

.message-content {
  font-size: 14px;
  color: #333;
  word-wrap: break-word;
  line-height: 1.6;
  padding: 4px 0;
}

.message-footer {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 会话标签样式 */
.el-tag--large {
  padding: 8px 14px;
  font-size: 14px;
}

/* 滚动条美化 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: #e4e7ed;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a0a4ac;
}

/* 响应式 */
@media (max-width: 768px) {
  .message-bubble {
    max-width: 95%;
  }
  
  .message-header {
    font-size: 12px;
  }
  
  .message-round {
    font-size: 11px;
    padding: 0 6px;
  }
}
</style>